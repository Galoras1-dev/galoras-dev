import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const GALORAS_PILLARS = [
  "Leadership", "Career", "Performance", "Mindset", "Communication",
  "Transitions", "Executive Presence", "Team Management",
  "Work-Life Balance", "Confidence", "Strategy", "Entrepreneurship",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { applicationId } = await req.json();
    if (!applicationId) {
      return new Response(JSON.stringify({ error: "Missing applicationId" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Fetch application
    const { data: app, error: appError } = await supabase
      .from("coach_applications")
      .select("*")
      .eq("id", applicationId)
      .single();

    if (appError || !app) {
      return new Response(JSON.stringify({ error: "Application not found" }), {
        status: 404, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    // Mark as under AI review
    await supabase
      .from("coach_applications")
      .update({ review_status: "under_review" })
      .eq("id", applicationId);

    const prompt = `You are the AI coach evaluator for Galoras, a high-performance coaching marketplace built on the "Sport of Business" philosophy — the belief that business performance requires the same disciplined, expert coaching as elite sport.

Evaluate this coach applicant and return a JSON object only. No markdown, no preamble — raw JSON only.

## Applicant Profile
- Name: ${app.full_name || "Not provided"}
- Current Role: ${app.current_role || "Not provided"}
- Background: ${app.coach_background || "Not provided"}
- Background Detail: ${app.coach_background_detail || "N/A"}
- Years Coaching: ${app.coaching_experience_years || "Not provided"}
- Years Leadership: ${app.leadership_experience_years || "Not provided"}
- Coaching Level: ${app.coaching_experience_level || "Not provided"}
- Certification Interest: ${app.certification_interest || "N/A"}
- Bio: ${app.bio || "Not provided"}
- Coaching Philosophy: ${app.coaching_philosophy || "Not provided"}
- LinkedIn: ${app.linkedin_url ? "Provided" : "Not provided"}
- Website: ${app.website_url ? "Provided" : "Not provided"}
- Booking Link: ${app.booking_url ? "Provided" : "Not provided"}

## Galoras Coaching Pillars
${GALORAS_PILLARS.join(", ")}

## Scoring Dimensions (0–100 each)
1. pillar_alignment — How well does their expertise map to Galoras coaching pillars?
2. professional_credibility — Depth of experience, credentials, seniority, proven track record
3. sport_of_business_fit — Do they embody the high-performance, competitive-excellence mindset?
4. communication_quality — Clarity and strength of bio, philosophy, articulation of unique value
5. market_positioning — Clear target audience, defined niche, differentiation from generic coaching
6. growth_potential — Platform scalability, digital readiness, long-term Galoras ecosystem fit

Weight the overall_score: pillar_alignment 25%, sport_of_business_fit 25%, professional_credibility 20%, communication_quality 10%, market_positioning 10%, growth_potential 10%.

## Required JSON Output
{
  "overall_score": <integer 0-100>,
  "dimensions": {
    "pillar_alignment": { "score": <integer 0-100>, "note": "<1-2 sentence explanation>" },
    "professional_credibility": { "score": <integer 0-100>, "note": "<1-2 sentence explanation>" },
    "sport_of_business_fit": { "score": <integer 0-100>, "note": "<1-2 sentence explanation>" },
    "communication_quality": { "score": <integer 0-100>, "note": "<1-2 sentence explanation>" },
    "market_positioning": { "score": <integer 0-100>, "note": "<1-2 sentence explanation>" },
    "growth_potential": { "score": <integer 0-100>, "note": "<1-2 sentence explanation>" }
  },
  "summary": "<3-4 sentence overall assessment for Galoras admin review>",
  "recommendation": "approve" | "review" | "reject"
}`;

    const ANTHROPIC_API_KEY = Deno.env.get("ANTHROPIC_API_KEY")!;
    const aiResponse = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "x-api-key": ANTHROPIC_API_KEY,
        "anthropic-version": "2023-06-01",
        "content-type": "application/json",
      },
      body: JSON.stringify({
        model: "claude-sonnet-4-6",
        max_tokens: 1024,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if (!aiResponse.ok) {
      throw new Error(`Claude API error: ${aiResponse.status} ${await aiResponse.text()}`);
    }

    const aiData = await aiResponse.json();
    const rawText: string = aiData.content?.[0]?.text ?? "{}";

    let result: any;
    try {
      result = JSON.parse(rawText);
    } catch {
      const match = rawText.match(/\{[\s\S]*\}/);
      result = match ? JSON.parse(match[0]) : null;
    }

    if (!result) throw new Error("Failed to parse AI response");

    const overallScore = Math.min(100, Math.max(0, Math.round(result.overall_score ?? 0)));

    // ── The admission decision, and ONLY the admission decision ───────────────
    //
    // Three separate decisions exist in this system and they must not be
    // collapsed into one:
    //
    //   1. ADMISSION      - is this person allowed to build a Galoras profile?
    //                       That is what this function decides, from the score.
    //   2. COACH SIGN-OFF - has the coach read the profile we generated for them
    //                       and confirmed it is true and theirs?
    //   3. PUBLICATION    - does the page go live on galoras.com? An admin's
    //                       call, and never this function's.
    //
    // Scoring measures fit as a coach. It says nothing about whether the copy we
    // generated about them is good enough to publish. A strong coach with a thin
    // CV can score 85 and still get a weak page. So a high score admits them and
    // nothing more: it never publishes, never creates a coaches row, and never
    // charges a card.

    const ACCEPT_AT = Number(Deno.env.get("AUTO_ACCEPT_SCORE") ?? "70");

    // Automatic rejection is OFF by default and must be switched on deliberately.
    //
    // It used to fire at any score below 40 and email the applicant a refusal.
    // At this stage of the business that is all downside: the threshold was never
    // examined against real data, and losing a good coach to a guessed number
    // costs far more than reading a few applications by hand. Everything below
    // the accept line now waits in the admin queue instead.
    const AUTO_REJECT_ON = Deno.env.get("AUTO_REJECT_ENABLED") === "true";
    const REJECT_BELOW = Number(Deno.env.get("AUTO_REJECT_SCORE") ?? "40");

    const autoReject = AUTO_REJECT_ON && overallScore < REJECT_BELOW;
    const autoAccept = !autoReject && overallScore >= ACCEPT_AT;

    // "accepted" = admitted, may onboard, nothing published.
    // "pending"  = a human decides.
    const newStatus = autoReject ? "auto_rejected" : autoAccept ? "accepted" : "pending";

    const reason = autoReject
      ? `Auto-rejected by AI scoring (${overallScore}/100). ${result.summary ?? ""}`
      : autoAccept
        ? `Auto-accepted by AI scoring (${overallScore}/100, accept line ${ACCEPT_AT}). Profile still requires review before publication.`
        : null;

    // Checked, not fired and forgotten. An unchecked write is how the fit score
    // silently went missing for months on end.
    const { error: scoreWriteError } = await supabase
      .from("coach_applications")
      .update({
        fit_score: overallScore,
        fit_score_dimensions: result,
        review_status: newStatus,
        status: newStatus,
        decision_reason: reason,
      })
      .eq("id", applicationId)
      .select("id")
      .single();

    if (scoreWriteError) {
      console.error("analyze-coach-application: score write FAILED", scoreWriteError);
      return new Response(
        JSON.stringify({ error: `Scored ${overallScore} but could not save it: ${scoreWriteError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // Send rejection email if auto-rejected
    if (autoReject) {
      const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
      if (RESEND_API_KEY && app.email) {
        await fetch("https://api.resend.com/emails", {
          method: "POST",
          headers: {
            Authorization: `Bearer ${RESEND_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            // onboarding@resend.dev is Resend's shared sandbox sender. Mail from
            // it is not from galoras.com and lands in spam often enough to be
            // useless. EMAIL_FROM is set in Supabase secrets; the fallback is a
            // real Galoras address rather than the sandbox.
            from: Deno.env.get("EMAIL_FROM") ?? "Galoras <noreply@galoras.com>",
            to: [app.email],
            subject: "Thank you for applying to Galoras",
            html: `
              <div style="font-family:sans-serif;max-width:560px;margin:0 auto;color:#111">
                <h2>Thank you, ${app.full_name ?? "Coach"}.</h2>
                <p>We truly appreciate your interest in joining the Galoras coaching network and the time you invested in your application.</p>
                <p>After a careful review of your profile, we've determined that your background isn't the right fit for our current roster at this time.</p>
                <p>Galoras is built on the <strong>Sport of Business</strong> philosophy — we curate coaches who bring an elite, high-performance mindset to every client engagement. We receive many strong applications and can only move forward with those who align most closely with our coaching pillars and quality standards.</p>
                <p>We encourage you to continue developing your practice. You are welcome to reapply in six months, and we'd love to see your progress.</p>
                <p>Thank you again, and we wish you every success in your coaching journey.</p>
                <p style="margin-top:24px">Warmly,<br/><strong>The Galoras Team</strong></p>
                <hr style="border:none;border-top:1px solid #eee;margin:24px 0"/>
                <p style="color:#999;font-size:12px">© Galoras · galoras.com</p>
              </div>
            `,
          }),
        });
      }
    }

    return new Response(
      JSON.stringify({ success: true, overallScore, status: newStatus, autoAccept, autoReject }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("analyze-coach-application error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
