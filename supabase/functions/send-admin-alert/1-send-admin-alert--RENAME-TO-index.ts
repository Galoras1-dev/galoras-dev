import { Resend } from "https://esm.sh/resend@2.0.0";

const resend = new Resend(Deno.env.get("RESEND_API_KEY"));

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

// Admin recipients — Barnes + Conor
const ADMIN_EMAILS = ["conor@galoras.com"];
const EMAIL_FROM = Deno.env.get("EMAIL_FROM") ?? "Galoras <noreply@galoras.com>";
const PLATFORM_URL = Deno.env.get("PLATFORM_URL") ?? "https://galoras.com";

const escapeHtml = (str: string): string =>
  str.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");

// ── Email Templates ──────────────────────────────────────────────────────────

function coachApplicationEmail(data: any): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,sans-serif;margin:0;padding:0;background:#f5f5f5}
.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)}
.header{background:linear-gradient(135deg,#1a1a2e,#16213e);color:white;padding:24px 32px}
.header h1{margin:0;font-size:20px}
.content{padding:24px 32px}
.card{background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #f97316}
.row{margin:6px 0;font-size:14px}
.label{color:#666;display:inline-block;width:110px}
.value{color:#1a1a2e;font-weight:500}
.cta{display:inline-block;background:#f97316;color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;margin-top:16px}
.footer{background:#f8f9fa;padding:16px 32px;text-align:center;color:#999;font-size:12px}
.urgent{color:#dc2626;font-weight:bold}
</style></head><body><div class="container">
<div class="header"><h1>🆕 New Coach Application</h1></div>
<div class="content">
<p>A new coach has applied to the Galoras Coaching Exchange.</p>
<div class="card">
<div class="row"><span class="label">Name:</span><span class="value">${escapeHtml(data.name || "")}</span></div>
<div class="row"><span class="label">Email:</span><span class="value">${escapeHtml(data.email || "")}</span></div>
${data.linkedin ? `<div class="row"><span class="label">LinkedIn:</span><span class="value">${escapeHtml(data.linkedin)}</span></div>` : ""}
${data.specialties ? `<div class="row"><span class="label">Specialties:</span><span class="value">${escapeHtml(data.specialties)}</span></div>` : ""}
${data.headline ? `<div class="row"><span class="label">Headline:</span><span class="value">${escapeHtml(data.headline)}</span></div>` : ""}
</div>
<p style="font-size:14px;color:#666">Review this application in Claude Code:</p>
<code style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:13px;display:block;margin:8px 0">/coach-pipeline review ${escapeHtml(data.name || "")}</code>
<a href="${PLATFORM_URL}/admin/coaches" class="cta">View in Admin →</a>
</div>
<div class="footer">Galoras Coaching Exchange</div>
</div></body></html>`;
}

function customerRequestEmail(data: any): string {
  const isEnterprise = data.requestType === "enterprise";
  const headerColor = isEnterprise ? "#c2410c" : "#0369a1";
  const headerText = isEnterprise ? "🏢 Enterprise Proposal" : "📩 New Coaching Request";

  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,sans-serif;margin:0;padding:0;background:#f5f5f5}
.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)}
.header{background:linear-gradient(135deg,${headerColor},#1a1a2e);color:white;padding:24px 32px}
.header h1{margin:0;font-size:20px}
.content{padding:24px 32px}
.card{background:#f8f9fa;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid ${headerColor}}
.row{margin:6px 0;font-size:14px}
.label{color:#666;display:inline-block;width:110px}
.value{color:#1a1a2e;font-weight:500}
.cta{display:inline-block;background:${headerColor};color:white;padding:12px 24px;text-decoration:none;border-radius:8px;font-weight:600;margin-top:16px}
.footer{background:#f8f9fa;padding:16px 32px;text-align:center;color:#999;font-size:12px}
.urgent{color:#dc2626;font-weight:bold}
</style></head><body><div class="container">
<div class="header"><h1>${headerText}</h1></div>
<div class="content">
<p>A ${isEnterprise ? "company" : "client"} has submitted a ${isEnterprise ? "proposal request" : "coaching request"} on Galoras.</p>
<div class="card">
<div class="row"><span class="label">Name:</span><span class="value">${escapeHtml(data.name || "")}</span></div>
<div class="row"><span class="label">Email:</span><span class="value">${escapeHtml(data.email || "")}</span></div>
${data.company ? `<div class="row"><span class="label">Company:</span><span class="value">${escapeHtml(data.company)}</span></div>` : ""}
${data.teamSize ? `<div class="row"><span class="label">Team Size:</span><span class="value">${escapeHtml(data.teamSize)}</span></div>` : ""}
<div class="row"><span class="label">Coach:</span><span class="value">${escapeHtml(data.coachName || "")}</span></div>
${data.product ? `<div class="row"><span class="label">Product:</span><span class="value">${escapeHtml(data.product)}</span></div>` : ""}
${data.urgency ? `<div class="row"><span class="label">Urgency:</span><span class="value ${data.urgency === "urgent" || data.urgency === "high" ? "urgent" : ""}">${escapeHtml(data.urgency.toUpperCase())}</span></div>` : ""}
</div>
${data.goal ? `<p style="font-size:14px"><strong>Goal:</strong> ${escapeHtml(data.goal)}</p>` : ""}
${data.problem ? `<p style="font-size:14px"><strong>Problem:</strong> ${escapeHtml(data.problem)}</p>` : ""}
${data.context ? `<p style="font-size:14px;color:#666"><strong>Context:</strong> ${escapeHtml(data.context)}</p>` : ""}
<p style="font-size:14px;color:#666">Check in Claude Code:</p>
<code style="background:#f1f5f9;padding:8px 12px;border-radius:6px;font-size:13px;display:block;margin:8px 0">/customer-flow requests</code>
<a href="${PLATFORM_URL}/admin" class="cta">View in Admin →</a>
</div>
<div class="footer">Galoras Coaching Exchange</div>
</div></body></html>`;
}

function stripePaymentEmail(data: any): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"><style>
body{font-family:-apple-system,sans-serif;margin:0;padding:0;background:#f5f5f5}
.container{max-width:600px;margin:0 auto;background:white;border-radius:12px;overflow:hidden;box-shadow:0 4px 6px rgba(0,0,0,.1)}
.header{background:linear-gradient(135deg,#059669,#047857);color:white;padding:24px 32px}
.header h1{margin:0;font-size:20px}
.content{padding:24px 32px}
.card{background:#f0fdf4;border-radius:8px;padding:16px;margin:16px 0;border-left:4px solid #059669}
.row{margin:6px 0;font-size:14px}
.label{color:#666;display:inline-block;width:110px}
.value{color:#1a1a2e;font-weight:500}
.amount{font-size:28px;font-weight:bold;color:#059669;margin:16px 0}
.footer{background:#f8f9fa;padding:16px 32px;text-align:center;color:#999;font-size:12px}
</style></head><body><div class="container">
<div class="header"><h1>💰 Payment Received</h1></div>
<div class="content">
<div class="amount">$${((data.amount || 0) / 100).toFixed(2)} ${(data.currency || "CAD").toUpperCase()}</div>
<div class="card">
<div class="row"><span class="label">Client:</span><span class="value">${escapeHtml(data.clientName || "")}</span></div>
<div class="row"><span class="label">Email:</span><span class="value">${escapeHtml(data.clientEmail || "")}</span></div>
<div class="row"><span class="label">Product:</span><span class="value">${escapeHtml(data.product || "")}</span></div>
<div class="row"><span class="label">Coach:</span><span class="value">${escapeHtml(data.coachName || "")}</span></div>
</div>
<p style="font-size:14px;color:#666">A session link needs to be sent to the client.</p>
</div>
<div class="footer">Galoras Coaching Exchange</div>
</div></body></html>`;
}

// ── Handler ──────────────────────────────────────────────────────────────────

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response(null, { headers: corsHeaders });

  try {
    const data = await req.json();
    const alertType = data.alertType as string;

    if (!alertType) {
      return new Response(JSON.stringify({ error: "alertType required" }), {
        status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
      });
    }

    let subject: string;
    let html: string;

    switch (alertType) {
      case "coach_application":
        subject = `🆕 New Coach Application: ${data.name || "Unknown"}`;
        html = coachApplicationEmail(data);
        break;
      case "customer_request":
        subject = `📩 Coaching Request: ${data.name || "Unknown"} → ${data.coachName || ""}`;
        html = customerRequestEmail(data);
        break;
      case "enterprise_request":
        subject = `🏢 Enterprise Proposal: ${data.company || data.name || "Unknown"} → ${data.coachName || ""}`;
        html = customerRequestEmail({ ...data, requestType: "enterprise" });
        break;
      case "payment_received":
        subject = `💰 Payment: $${((data.amount || 0) / 100).toFixed(2)} from ${data.clientName || "Unknown"}`;
        html = stripePaymentEmail(data);
        break;
      default:
        return new Response(JSON.stringify({ error: `Unknown alertType: ${alertType}` }), {
          status: 400, headers: { "Content-Type": "application/json", ...corsHeaders },
        });
    }

    const result = await resend.emails.send({
      from: Deno.env.get("EMAIL_FROM") ?? EMAIL_FROM,
      to: ADMIN_EMAILS,
      subject,
      html,
    });

    console.log(`Admin alert sent: ${alertType}`, result);

    return new Response(JSON.stringify({ success: true, result }), {
      status: 200, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  } catch (err: any) {
    console.error("send-admin-alert error:", err);
    return new Response(JSON.stringify({ error: err.message }), {
      status: 500, headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});
