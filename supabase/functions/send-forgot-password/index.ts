import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  const { email, resetLink } = await req.json();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "BrainBlitz <onboarding@resend.dev>",
      to: [email],
      subject: "🔐 Reset Your BrainBlitz Password",
      html: `
        <div style="background:#000;color:#fff;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;border-radius:16px;border:1px solid rgba(255,255,255,0.1)">
          <h1 style="color:#8b5cf6;font-size:2rem;margin-bottom:8px">⚡ BrainBlitz</h1>
          <h2 style="color:#fff;font-size:1.5rem">Reset Your Password 🔐</h2>
          <p style="color:rgba(255,255,255,0.6);font-size:1rem;line-height:1.6">
            We received a request to reset your password. 
            Click the button below to create a new password.
            This link expires in <strong style="color:#f43f5e">1 hour</strong>.
          </p>
          <a href="${resetLink}"
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;margin:24px 0">
            Reset Password →
          </a>
          <div style="background:rgba(244,63,94,0.06);border:1px solid rgba(244,63,94,0.15);border-radius:12px;padding:16px;margin-top:16px">
            <p style="color:rgba(255,255,255,0.4);font-size:0.85rem;margin:0">
              🔒 If you didn't request this, ignore this email. 
              Your password won't change.
            </p>
          </div>
          <p style="color:rgba(255,255,255,0.2);font-size:0.75rem;margin-top:32px">
            BrainBlitz — Train your brain, level up your mind.
          </p>
        </div>
      `,
    }),
  });

  const data = await res.json();
  return new Response(JSON.stringify(data), {
    headers: { "Content-Type": "application/json" },
  });
});