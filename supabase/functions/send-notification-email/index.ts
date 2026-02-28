import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
  if (!RESEND_API_KEY) {
    console.error("RESEND_API_KEY is not configured");
    return new Response(
      JSON.stringify({ error: "RESEND_API_KEY not configured" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }

  try {
    const payload = await req.json();
    const { user_email, title, message, type } = payload;

    if (!user_email || !title || !message) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: user_email, title, message" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const emailHtml = `
      <!DOCTYPE html>
      <html>
        <head>
          <meta charset="utf-8" />
          <meta name="viewport" content="width=device-width, initial-scale=1.0" />
        </head>
        <body style="margin:0;padding:0;background-color:#ffffff;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" style="background-color:#ffffff;">
            <tr>
              <td align="center" style="padding:40px 20px;">
                <table width="100%" style="max-width:520px;">
                  <tr>
                    <td style="background-color:#10b981;border-radius:12px 12px 0 0;padding:24px 32px;">
                      <h1 style="margin:0;color:#ffffff;font-size:18px;font-weight:600;">
                        📚 AdaptLearn
                      </h1>
                    </td>
                  </tr>
                  <tr>
                    <td style="background-color:#f9fafb;border:1px solid #e5e7eb;border-top:none;border-radius:0 0 12px 12px;padding:32px;">
                      <h2 style="margin:0 0 12px;color:#111827;font-size:20px;font-weight:600;">
                        ${title}
                      </h2>
                      <p style="margin:0 0 24px;color:#4b5563;font-size:15px;line-height:1.6;">
                        ${message}
                      </p>
                      <a href="https://kfueitlms.lovable.app" style="display:inline-block;background-color:#10b981;color:#ffffff;text-decoration:none;padding:12px 24px;border-radius:8px;font-size:14px;font-weight:500;">
                        Open AdaptLearn →
                      </a>
                    </td>
                  </tr>
                  <tr>
                    <td style="padding:20px 32px 0;text-align:center;">
                      <p style="margin:0;color:#9ca3af;font-size:12px;">
                        You're receiving this because you have an account on AdaptLearn.
                      </p>
                    </td>
                  </tr>
                </table>
              </td>
            </tr>
          </table>
        </body>
      </html>
    `;

    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${RESEND_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "AdaptLearn <onboarding@resend.dev>",
        to: [user_email],
        subject: `AdaptLearn: ${title}`,
        html: emailHtml,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      console.error("Resend API error:", JSON.stringify(data));
      return new Response(
        JSON.stringify({ error: "Failed to send email", details: data }),
        { status: res.status, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log("Email sent successfully:", data.id);
    return new Response(
      JSON.stringify({ success: true, email_id: data.id }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error sending notification email:", error);
    const errorMessage = error instanceof Error ? error.message : "Unknown error";
    return new Response(
      JSON.stringify({ error: errorMessage }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
