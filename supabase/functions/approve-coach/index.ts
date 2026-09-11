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
    if (!applicationId || !coachUserId) {
      return new Response(JSON.stringify({ error: "Missing applicationId or coachUserId" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Get coach registration (payment info)
    const { data: reg, error: regError } = await supabase
      .from("coach_registrations")
      .select("*")
      .eq("user_id", coachUserId)
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (regError || !reg) {
      return new Response(JSON.stringify({ error: "No registration found for this coach" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    const tier = reg.selected_tier ?? "pro";
    const amountCents = TIER_PRICES[tier] ?? 4900;

    let chargeResult: Record<string, unknown> | null = null;

    // ── Billing ───────────────────────────────────────────────────────────────
    // Approval NEVER fails because of billing. During the founding period no
    // subscription is created at all. When BILL_ON_APPROVAL is switched on, a
    // Price is created first and referenced by id — subscriptions.create does
    // not accept product_data inline, which is what used to throw:
    //   "Received unknown parameter: items[0][price_data][product_data]"
    if (BILL_ON_APPROVAL && reg.stripe_customer_id && reg.stripe_payment_method_id) {
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
          metadata: { userId: coachUserId, tier, applicationId },
        });

        chargeResult = { subscriptionId: subscription.id, status: subscription.status };
      } catch (billingErr: any) {
        console.error("approve-coach: billing failed (approval continues)", billingErr?.message);
        chargeResult = { error: billingErr?.message ?? "billing failed" };
      }
    } else {
      chargeResult = { billed: false, reason: BILL_ON_APPROVAL ? "no card on file" : "founding period — billing disabled" };
    }

    // Mark the registration approved regardless of billing outcome
    const { error: regUpdateError } = await supabase
      .from("coach_registrations")
      .update({ status: "approved", updated_at: new Date().toISOString() })
      .eq("user_id", coachUserId);
    if (regUpdateError) {
      console.error("approve-coach: coach_registrations update failed", regUpdateError);
    }

    // ── Create or publish the coach record ────────────────────────────────────
    const { data: existingCoach } = await supabase
      .from("coaches")
      .select("id")
      .eq("user_id", coachUserId)
      .maybeSingle();

    if (existingCoach) {
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
      const { error: coachInsertError } = await supabase.from("coaches").insert({
        user_id: coachUserId,
        display_name: reg.full_name,
        email: reg.email,
        bio: reg.bio,
        linkedin_url: reg.linkedin_url,
        tier,
        status: "approved",
        lifecycle_status: "published",
      });
      if (coachInsertError) {
        console.error("approve-coach: coaches insert FAILED", coachInsertError);
        return new Response(
          JSON.stringify({ error: `Could not create coach: ${coachInsertError.message}` }),
          { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    }

    // Write tag mappings and create pending product from application data
    try {
      const { data: appData } = await supabase
        .from("coach_applications")
        .select("specialty_tags, audience_tags, style_tags, industry_tags, availability_tag, enterprise_tags, credential_tags, outcome_tags, format_tags, pending_product")
        .eq("user_id", coachUserId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      const { data: coachRow } = await supabase
        .from("coaches")
        .select("id")
        .eq("user_id", coachUserId)
        .single();
      const coachId = coachRow?.id;

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

        // If there's a pending product, create it
        if (appData.pending_product && (appData.pending_product as any).title) {
          const pp = appData.pending_product as any;
          const { data: productRow } = await supabase
            .from("coach_products")
            .insert({
              coach_id: coachId,
              product_type: pp.product_type || "single_session",
              title: pp.title,
              outcome_statement: pp.outcome_statement || null,
              price_type: pp.price_type || "enquiry",
              price_cents: pp.price_cents || null,
              price_display: pp.price_display || null,
              cta_label: "Book Now",
              is_active: true,
              sort_order: 0,
            })
            .select("id")
            .single();

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
                await supabase
                  .from("product_tag_map")
                  .insert(productTagRows.map((t: any) => ({ product_id: productRow.id, tag_id: t.id })));
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
    if (RESEND_API_KEY && reg.email) {
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
          to: [reg.email],
          subject: "You're in — welcome to Galoras",
          html: `
            <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
              <h2 style="margin-bottom:4px">Congratulations, ${reg.full_name ?? "Coach"}. You're in.</h2>
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
