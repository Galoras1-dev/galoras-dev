import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));
const SENDER_EMAIL = Deno.env.get("EMAIL_FROM") ?? "Galoras <noreply@galoras.com>";
const ADMIN_EMAIL = "conor@galoras.com";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

const escapeHtml = (str: string): string =>
  str
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");

interface LeadRequest {
  client_name: string;
  client_email: string;
  message: string;
  coach_name?: string;
}

function buildLeadHtml(data: LeadRequest): string {
  const safeName = escapeHtml(data.client_name);
  const safeEmail = escapeHtml(data.client_email);
  const safeMessage = escapeHtml(data.message);
  const safeCoach = data.coach_name ? escapeHtml(data.coach_name) : null;

  const coachLine = safeCoach
    ? `<div style="margin: 8px 0; font-size: 14px;"><strong>Requested Coach:</strong> ${safeCoach}</div>`
    : "";

  return `<div style="font-family: sans-serif; max-width: 500px; margin: 0 auto; padding: 20px;">
  <h2 style="color: #1a1a1a;">New Coaching Inquiry</h2>
  <div style="background: #f4f4f5; border-radius: 8px; padding: 16px; margin: 16px 0;">
    <div style="margin: 8px 0; font-size: 14px;"><strong>Name:</strong> ${safeName}</div>
    <div style="margin: 8px 0; font-size: 14px;"><strong>Email:</strong> <a href="mailto:${safeEmail}">${safeEmail}</a></div>
    ${coachLine}
  </div>
  <div style="background: #f8f9fa; border-radius: 8px; padding: 16px; margin: 16px 0; border-left: 4px solid #f97316;">
    <strong>Message:</strong><br/>
    <p style="color: #444; white-space: pre-wrap;">${safeMessage}</p>
  </div>
  <p style="color: #888; font-size: 12px;">Reply directly to <a href="mailto:${safeEmail}">${safeEmail}</a> to follow up.</p>
</div>`;
}

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const data: LeadRequest = await req.json();

    // Validate required fields
    if (!data.client_name || !data.client_email || !data.message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: client_name, client_email, message" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const html = buildLeadHtml(data);

    const subjectCoach = data.coach_name ? ` (re: ${data.coach_name})` : "";

    const result = await resend.emails.send({
      from: `Galoras <${SENDER_EMAIL}>`,
      to: [ADMIN_EMAIL],
      replyTo: data.client_email,
      subject: `New Lead: ${data.client_name}${subjectCoach}`,
      html,
    });

    console.log(`Lead notification sent for ${data.client_name} to ${ADMIN_EMAIL}`, result);

    return new Response(
      JSON.stringify({ success: true, result }),
      { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  } catch (err: any) {
    console.error("send-lead-notification error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }
});
