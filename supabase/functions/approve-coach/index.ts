import Stripe from "https://esm.sh/stripe@14";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const TIER_PRICES: Record<string, number> = {
  pro:    4900,   // $49.00
  elite:  9900,   // $99.00
  master: 19700,  // $197.00
};

const TIER_LABELS: Record<string, string> = {
  pro:    "Pro",
  elite:  "Elite",
  master: "Master",
};

// Founding period: coaches are free until January. Billing on approval stays OFF
// until this is explicitly set to "true" in Supabase → Edge Functions → Secrets.
const BILL_ON_APPROVAL = Deno.env.get("BILL_ON_APPROVAL") === "true";

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!);
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }
    const { data: { user: admin }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !admin) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Verify admin role
    const { data: roleRow } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", admin.id)
      .eq("role", "admin")
      .maybeSingle();

    if (!roleRow) {
      return new Response(JSON.stringify({ error: "Forbidden" }), {
        status: 403, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const { applicationId, coachUserId, decisionReason } = await req.json();
    if (!applicationId) {
      return new Response(JSON.stringify({ error: "Missing applicationId" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // ── The application is the source of truth ────────────────────────────────
    //
    // An INVITED coach has no account and no registration: they arrive through
    // an onboarding link, complete five steps, and never see tier selection or
    // a card. Everything we know about them is on the application row.
    //
    // A SELF-SIGNUP coach additionally has a coach_registrations row carrying
    // their chosen tier and Stripe details. That row is now optional, and its
    // values override the application's where present.
    const { data: app, error: appError } = await supabase
      .from("coach_applications")
      .select("*")
      .eq("id", applicationId)
      .maybeSingle();

    if (appError || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // May be null for an invited coach. Null is a valid value on coaches.user_id.
    const effectiveUserId: string | null = coachUserId ?? app.user_id ?? null;

    // Registration is OPTIONAL. Look it up by user id, then by email, then give
    // up without failing. Never query .eq("user_id", null) — PostgREST renders
    // that as user_id=eq.null, which matches nothing and is not IS NULL.
    let reg: any = null;
    if (effectiveUserId) {
      const { data } = await supabase
        .from("coach_registrations").select("*")
        .eq("user_id", effectiveUserId)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      reg = data ?? null;
    }
    if (!reg && app.email) {
      const { data } = await supabase
        .from("coach_registrations").select("*")
        .eq("email", app.email)
        .order("created_at", { ascending: false }).limit(1).maybeSingle();
      reg = data ?? null;
    }

    const tier = reg?.selected_tier ?? "pro";
    const amountCents = TIER_PRICES[tier] ?? 4900;

    let chargeResult: Record<string, unknown> | null = null;

    // ── Billing ───────────────────────────────────────────────────────────────
    // Approval NEVER fails because of billing. During the founding period no
    // subscription is created at all. When BILL_ON_APPROVAL is switched on, a
    // Price is created first and referenced by id — subscriptions.create does
    // not accept product_data inline, which is what used to throw:
    //   "Received unknown parameter: items[0][price_data][product_data]"
    if (BILL_ON_APPROVAL && reg?.stripe_customer_id && reg?.stripe_payment_method_id) {
      try {
        try {
          await stripe.paymentMethods.attach(reg.stripe_payment_method_id, {
            customer: reg.stripe_customer_id,
          });
        } catch (_) { /* already attached */ }

        await stripe.customers.update(reg.stripe_customer_id, {
          invoice_settings: { default_payment_method: reg.stripe_payment_method_id },
        });

        const price = await stripe.prices.create({
          currency: "usd",
          unit_amount: amountCents,
          recurring: { interval: "month" },
          product_data: { name: `Galoras ${TIER_LABELS[tier]} Coach Subscription` },
        });

        const subscription = await stripe.subscriptions.create({
          customer: reg.stripe_customer_id,
          default_payment_method: reg.stripe_payment_method_id,
          items: [{ price: price.id }],
          metadata: { userId: effectiveUserId ?? "", tier, applicationId },
        });

        chargeResult = { subscriptionId: subscription.id, status: subscription.status };
      } catch (billingErr: any) {
        console.error("approve-coach: billing failed (approval continues)", billingErr?.message);
        chargeResult = { error: billingErr?.message ?? "billing failed" };
      }
    } else {
      chargeResult = {
        billed: false,
        reason: !reg
          ? "invited coach - no registration, nothing to bill"
          : BILL_ON_APPROVAL ? "no card on file" : "founding period - billing disabled",
      };
    }

    // Mark the registration approved, if there is one
    if (reg?.id) {
      const { error: regUpdateError } = await supabase
        .from("coach_registrations")
        .update({ status: "approved", updated_at: new Date().toISOString() })
        .eq("id", reg.id);
      if (regUpdateError) {
        console.error("approve-coach: coach_registrations update failed", regUpdateError);
      }
    }

    // ── Create or publish the coach record ────────────────────────────────────
    //
    // Match an existing coach by user id where we have one, otherwise by email.
    // coaches.user_id lost its UNIQUE constraint at some point, so .maybeSingle()
    // would throw on duplicates: order and limit(1) instead.
    let existingCoach: { id: string } | null = null;
    if (effectiveUserId) {
      const { data } = await supabase
        .from("coaches").select("id")
        .eq("user_id", effectiveUserId).limit(1).maybeSingle();
      existingCoach = data ?? null;
    }
    if (!existingCoach && app.email) {
      const { data } = await supabase
        .from("coaches").select("id")
        .eq("email", app.email).limit(1).maybeSingle();
      existingCoach = data ?? null;
    }

    // Held in a variable rather than re-fetched. The old code looked the coach
    // up again by user_id straight after inserting it, which finds nothing when
    // user_id is null - and the tag write that depended on it failed silently
    // inside a try/catch.
    let coachId: string | null = null;

    if (existingCoach) {
      coachId = existingCoach.id;
      const { error: coachUpdateError } = await supabase
        .from("coaches")
        .update({ lifecycle_status: "published", tier, status: "approved" })
        .eq("id", existingCoach.id);
      if (coachUpdateError) {
        console.error("approve-coach: coaches update FAILED", coachUpdateError);
        return new Response(
          JSON.stringify({ error: `Could not publish coach: ${coachUpdateError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } else {
      const { data: inserted, error: coachInsertError } = await supabase
        .from("coaches")
        .insert({
          user_id: effectiveUserId,
          display_name: reg?.full_name ?? app.full_name,
          email: reg?.email ?? app.email,
          bio: reg?.bio ?? app.bio,
          linkedin_url: reg?.linkedin_url ?? app.linkedin_url,
          tier,
          status: "approved",
          lifecycle_status: "published",
        })
        .select("id")
        .single();

      if (coachInsertError || !inserted) {
        console.error("approve-coach: coaches insert FAILED", coachInsertError);
        return new Response(
          JSON.stringify({ error: `Could not create coach: ${coachInsertError?.message ?? "no row returned"}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
      coachId = inserted.id;

      // Give the new coach a URL slug.
      //
      // Without one the directory card falls back to /coaching/<uuid>, a route
      // that does not exist, so the coach is listed and every link to them is a
      // 404. Invited coaches never got a slug from anywhere, which is why the
      // coach published on 11 September has none.
      //
      // Deliberately a SEPARATE update after the insert, not a column on it: a
      // slug collision or a missing column must never cost us the coach record.
      // Same lesson as the product insert below.
      const baseSlug = String(reg?.full_name ?? app.full_name ?? "")
        .normalize("NFKD")
        .replace(/[\u0300-\u036f]/g, "")   // strip accents
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 60);

      if (!baseSlug) {
        console.warn("approve-coach: no usable name for a slug; coach will have no public URL", { coachId });
      } else {
        // Find a free slug. Two coaches can share a name, and a duplicate slug
        // makes the profile lookup ambiguous, so claim the first unused one.
        let slug = baseSlug;
        for (let n = 2; n <= 50; n++) {
          const { data: clash, error: clashError } = await supabase
            .from("coaches")
            .select("id")
            .eq("slug", slug)
            .limit(1)
            .maybeSingle();

          if (clashError) {
            console.error("approve-coach: slug lookup FAILED, writing base slug unchecked", clashError);
            break;
          }
          if (!clash || clash.id === coachId) break;
          slug = `${baseSlug}-${n}`;
        }

        const { error: slugError } = await supabase
          .from("coaches")
          .update({ slug })
          .eq("id", coachId);

        if (slugError) {
          console.error("approve-coach: slug write FAILED — coach profile link will 404", slugError);
        } else {
          console.log("approve-coach: slug assigned", { coachId, slug });
        }
      }
    }

    // Write tag mappings and create pending product from application data.
    //
    // Both lookups that used to sit here are gone. They keyed off
    // .eq("user_id", coachUserId), which matches nothing for an invited coach
    // whose application has no user_id - so the tags a coach spent five steps
    // choosing were silently discarded inside this try/catch, and the coach
    // published invisible to every filter. We already hold both values.
    try {
      const appData = app;

      if (coachId && appData) {
        // Collect all tag keys across all families
        const allTagKeys: string[] = [
          ...(appData.specialty_tags || []),
          ...(appData.audience_tags || []),
          ...(appData.style_tags || []),
          ...(appData.industry_tags || []),
          ...(appData.availability_tag ? [appData.availability_tag] : []),
          ...(appData.enterprise_tags || []),
          ...(appData.credential_tags || []),
          ...(appData.outcome_tags || []),
          ...(appData.format_tags || []),
        ];

        if (allTagKeys.length > 0) {
          // Look up tag IDs
          const { data: tagRows } = await supabase
            .from("tags")
            .select("id, tag_key")
            .in("tag_key", allTagKeys);

          if (tagRows && tagRows.length > 0) {
            const tagMapRows = tagRows.map((t: any) => ({ coach_id: coachId, tag_id: t.id }));
            const { error: tagMapError } = await supabase
              .from("coach_tag_map")
              .upsert(tagMapRows, { onConflict: "coach_id,tag_id", ignoreDuplicates: true });
            if (tagMapError) {
              console.error("approve-coach: coach_tag_map write FAILED — coach will be unfilterable", tagMapError);
            }
          }
        }

        // If there's a pending product, create it.
        //
        // Every column written below is verified to exist on public.coach_products.
        // Previous versions wrote price_cents, price_display and cta_label, none
        // of which are columns on this table. PostgREST rejected the insert, the
        // error was discarded by destructuring only `data`, and approval reported
        // success while the coach ended up with tags and no products. Never write
        // a column here without checking information_schema first, and never drop
        // the error off an insert.
        if (appData.pending_product && (appData.pending_product as any).title) {
          const pp = appData.pending_product as any;

          // price_type is CHECK-constrained to fixed | range | enquiry.
          // Anything unexpected would abort the insert, so coerce.
          const rawPriceType = String(pp.price_type || "enquiry");
          const priceType = ["fixed", "range", "enquiry"].includes(rawPriceType)
            ? rawPriceType
            : "enquiry";
          if (priceType !== rawPriceType) {
            console.warn("approve-coach: unexpected price_type coerced to enquiry:", rawPriceType);
          }

          // Everything the wizard collects is already in cents (it multiplies by
          // 100 on input), which is the unit coach_products uses throughout.
          const priceAmount =
            priceType === "fixed" && typeof pp.price_cents === "number" ? pp.price_cents : null;
          const rangeMin =
            priceType === "range" && typeof pp.price_range_min === "number" ? pp.price_range_min : null;
          const rangeMax =
            priceType === "range" && typeof pp.price_range_max === "number" ? pp.price_range_max : null;

          // ProductCard renders a range only when BOTH ends are present, so a
          // half-filled range shows no price at all. The wizard validates this,
          // but an application created any other way might not have.
          if (priceType === "range" && !(rangeMin && rangeMax)) {
            console.warn("approve-coach: price_type=range with an incomplete range; product will show no price", {
              price_range_min: rangeMin, price_range_max: rangeMax,
            });
          }

          // booking_mode stays at 'enquiry' at creation. Stripe is in TEST mode
          // and coaches are told they are free until January, so no product
          // should present a live checkout button on approval. A coach turns
          // this on themselves from their product manager when we go live.
          const { data: productRow, error: productError } = await supabase
            .from("coach_products")
            .insert({
              coach_id: coachId,
              product_type: pp.product_type || "single_session",
              title: pp.title,
              outcome_statement: pp.outcome_statement || null,
              price_type: priceType,
              price_amount: priceAmount,
              price_range_min: rangeMin,
              price_range_max: rangeMax,
              booking_mode: "enquiry",
              is_active: true,
              sort_order: 0,
            })
            .select("id")
            .single();

          if (productError) {
            console.error("approve-coach: coach_products insert FAILED — coach will have no bookable offer", productError);
          }

          if (productRow?.id) {
            // Build product tag keys
            const productTagKeys: string[] = [
              ...(pp.outcome_tags || []),
              ...(pp.audience_tags || []),
              ...(pp.format_tags || []),
              ...(pp.product_type ? [pp.product_type] : []),
            ];

            if (productTagKeys.length > 0) {
              const { data: productTagRows } = await supabase
                .from("tags")
                .select("id, tag_key")
                .in("tag_key", productTagKeys);

              if (productTagRows && productTagRows.length > 0) {
                const { error: productTagError } = await supabase
                  .from("product_tag_map")
                  .insert(productTagRows.map((t: any) => ({ product_id: productRow.id, tag_id: t.id })));
                if (productTagError) {
                  console.error("approve-coach: product_tag_map write FAILED — product will be unfilterable", productTagError);
                }
              }
            }
          }
        }
      }
    } catch (tagErr: any) {
      console.error("approve-coach tag/product sync error (non-blocking):", tagErr);
    }

    // Update application
    await supabase
      .from("coach_applications")
      .update({
        review_status: "approved",
        status: "approved",
        decision_reason: decisionReason ?? null,
        decided_by: admin.id,
        decided_at: new Date().toISOString(),
      })
      .eq("id", applicationId);

    // Send approval email
    const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

    // An invited coach has no registration, so the recipient and the name come
    // from the application. Reading reg.* unguarded here threw for every
    // invited coach and the outer catch turned it into a bare 500.
    const recipientEmail = reg?.email ?? app.email;
    const recipientName  = reg?.full_name ?? app.full_name ?? "Coach";

    if (RESEND_API_KEY && recipientEmail) {
      const billedLine = chargeResult && (chargeResult as any).subscriptionId
        ? `<tr>
             <td style="padding:6px 0">Galoras ${TIER_LABELS[tier]} Coach Membership</td>
             <td style="text-align:right;font-weight:600">$${(amountCents / 100).toFixed(2)} USD/month</td>
           </tr>
           <tr>
             <td style="padding:6px 0;color:#6b7280">Billing</td>
             <td style="text-align:right;color:#6b7280">Monthly, starting today</td>
           </tr>`
        : `<tr>
             <td style="padding:6px 0">Galoras ${TIER_LABELS[tier]} Coach Membership</td>
             <td style="text-align:right;font-weight:600">Founding member — no charge</td>
           </tr>
           <tr>
             <td style="padding:6px 0;color:#6b7280">Billing</td>
             <td style="text-align:right;color:#6b7280">Free until January. We'll tell you before anything changes.</td>
           </tr>`;

      await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${RESEND_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: Deno.env.get("EMAIL_FROM") ?? "Galoras <noreply@galoras.com>",
          to: [recipientEmail],
          subject: "You're in — welcome to Galoras",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
              <h2 style="margin-bottom:4px">Congratulations, ${recipientName}. You're in.</h2>
              <p style="color:#6b7280;margin-top:0">Your Galoras coach application has been approved.</p>

              <!-- Membership -->
              <div style="background:#f9fafb;border:1px solid #e5e7eb;border-radius:12px;padding:20px;margin:24px 0">
                <p style="margin:0 0 12px;font-weight:700;font-size:15px;color:#111">Your membership</p>
                <table style="width:100%;font-size:14px;color:#374151;border-collapse:collapse">
                  ${billedLine}
                </table>
              </div>

              <!-- Profile CTA -->
              <div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px;margin:24px 0">
                <p style="margin:0 0 8px;font-weight:600;color:#166534">Next — complete your profile</p>
                <p style="margin:0 0 16px;font-size:14px;color:#374151">
                  Review your profile, update your bio, add your products, and make any changes before your listing goes public.
                </p>
                <a href="https://galoras.com/coach-dashboard/edit"
                   style="background:#16a34a;color:#fff;padding:12px 24px;border-radius:8px;text-decoration:none;font-weight:600;display:inline-block">
                  Complete My Profile →
                </a>
              </div>

              <p style="font-size:14px;color:#6b7280">
                Any questions, just reply to this email — it comes straight to us.
              </p>
              <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
              <p style="color:#999;font-size:12px">© Galoras · galoras.com</p>
            </div>
          `,
        }),
      });
    }

    // NOTE: the auto-tag-coach call that used to sit here has been removed.
    //
    // That function runs `DELETE FROM coach_tag_map WHERE coach_id = ...` and
    // then re-inserts whatever its keyword rules match. Its rule set is built
    // against an older tag vocabulary: of its 44 rules, 38 reference tag_keys
    // that do not exist in the `tags` table. Only c_suite, senior_leaders,
    // leadership_development, technology, professional_services and healthcare
    // can ever match.
    //
    // So approving a coach would wipe their curated tags and replace them with
    // at most six. It was harmless while coach_tag_map did not exist; now that
    // the table is live it is destructive. Re-enable only after the rules are
    // rebuilt against the current 60-tag vocabulary AND the delete is made
    // additive rather than a wipe.

    return new Response(
      JSON.stringify({ success: true, chargeResult }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("approve-coach error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
