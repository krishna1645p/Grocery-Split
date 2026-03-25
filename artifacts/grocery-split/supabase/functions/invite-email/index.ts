import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

serve(async (req) => {
  try {
    const { memberEmail, memberName, groupName, addedByName } = await req.json();

    if (!memberEmail) {
      return new Response(JSON.stringify({ error: "No email provided" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }

    const appUrl = "https://shared-order-tracker--kp161145.replit.app";
    const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>You've been added to a group</title></head><body style="margin:0;padding:0;background:#f4f4f5;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',sans-serif;"><table width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:40px 16px;"><tr><td align="center"><table width="100%" cellpadding="0" cellspacing="0" style="max-width:520px;background:#ffffff;border-radius:16px;overflow:hidden;box-shadow:0 1px 4px rgba(0,0,0,0.08);"><tr><td style="background:#16a34a;padding:32px;text-align:center;"><span style="color:#ffffff;font-size:22px;font-weight:700;">🥬 GrocerySplit</span></td></tr><tr><td style="padding:36px 32px 24px;"><h1 style="margin:0 0 8px;font-size:22px;font-weight:700;color:#111827;">You've been added to a group</h1><p style="margin:0 0 24px;font-size:15px;color:#6b7280;line-height:1.6;"><strong style="color:#111827;">${addedByName || "Someone"}</strong> added you to <strong style="color:#111827;">${groupName}</strong> on GrocerySplit.</p><div style="background:#f0fdf4;border:1px solid #bbf7d0;border-radius:12px;padding:20px 24px;margin-bottom:28px;"><p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#16a34a;text-transform:uppercase;">Group</p><p style="margin:0;font-size:20px;font-weight:700;color:#111827;">${groupName}</p>${addedByName ? `<p style="margin:6px 0 0;font-size:13px;color:#6b7280;">Added by ${addedByName}</p>` : ""}</div><table width="100%" cellpadding="0" cellspacing="0"><tr><td align="center"><a href="${appUrl}" style="display:inline-block;background:#16a34a;color:#ffffff;font-size:15px;font-weight:600;text-decoration:none;padding:14px 36px;border-radius:10px;">Open GrocerySplit →</a></td></tr></table></td></tr><tr><td style="padding:20px 32px 32px;border-top:1px solid #f3f4f6;"><p style="margin:0;font-size:12px;color:#9ca3af;text-align:center;">You received this because your email was added to a GrocerySplit group.</p></td></tr></table></td></tr></table></body></html>`;

    const resendRes = await fetch("https://api.resend.com/emails", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${Deno.env.get("RESEND_API_KEY")}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        from: "GrocerySplit <onboarding@resend.dev>",
        to: [memberEmail],
        subject: `${addedByName || "Someone"} added you to ${groupName} on GrocerySplit`,
        html,
      }),
    });

    const resendData = await resendRes.json();
    if (!resendRes.ok) {
      return new Response(JSON.stringify({ error: resendData }), { status: 500, headers: { "Content-Type": "application/json" } });
    }
    return new Response(JSON.stringify({ success: true, id: resendData.id }), { status: 200, headers: { "Content-Type": "application/json" } });
  } catch (err) {
    return new Response(JSON.stringify({ error: String(err) }), { status: 500, headers: { "Content-Type": "application/json" } });
  }
});
