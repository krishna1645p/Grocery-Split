import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: corsHeaders });
  try {
    const { memberEmail, memberName, groupName, invitedByName } = await req.json();
    if (!memberEmail) return new Response(JSON.stringify({ skipped: "no email" }), { headers: corsHeaders });
    const res = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: { Authorization: `Bearer ${Deno.env.get("RESEND_API_KEY")}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: "GrocerySplit <noreply@grocerysplit.com>",
        to: memberEmail,
        subject: `${invitedByName} added you to "${groupName}" on GrocerySplit`,
        html: `<div style="font-family:sans-serif;max-width:480px;margin:0 auto;padding:24px;"><h2>Hi ${memberName}!</h2><p><strong>${invitedByName}</strong> added you to <strong>"${groupName}"</strong> on GrocerySplit.</p><a href="https://grocerysplit.com" style="display:inline-block;background:#16a34a;color:white;padding:12px 28px;border-radius:8px;text-decoration:none;font-weight:600;">Open GrocerySplit →</a><p style="color:#999;font-size:12px;margin-top:24px;">You received this because your email was added to a GrocerySplit group.</p></div>`,
      }),
    });
    const data = await res.json();
    return new Response(JSON.stringify(data), { headers: { ...corsHeaders, "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: corsHeaders });
  }
});
