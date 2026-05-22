import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  const { email, username, achievement, score, game } = await req.json();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "BrainBlitz <onboarding@resend.dev>",
      to: [email],
      subject: `🏆 New Achievement Unlocked — ${achievement}`,
      html: `
        <div style="background:#000;color:#fff;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;border-radius:16px;border:1px solid rgba(255,255,255,0.1)">
          <h1 style="color:#8b5cf6;font-size:2rem;margin-bottom:8px">⚡ BrainBlitz</h1>
          <h2 style="color:#fff;font-size:1.5rem">Achievement Unlocked! 🏆</h2>
          
          <div style="background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.1));border:1px solid rgba(139,92,246,0.3);border-radius:16px;padding:28px;margin:24px 0;text-align:center">
            <p style="font-size:3rem;margin:0 0 8px">🏆</p>
            <p style="color:#a78bfa;font-size:1.4rem;font-weight:800;margin:0 0 4px">${achievement}</p>
            <p style="color:rgba(255,255,255,0.4);font-size:0.85rem;margin:0">
              Earned in ${game}
            </p>
          </div>

          <div style="display:flex;gap:12px;margin:20px 0">
            <div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center">
              <p style="color:#f59e0b;font-size:1.5rem;font-weight:800;margin:0">${score}</p>
              <p style="color:rgba(255,255,255,0.3);font-size:0.75rem;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Score</p>
            </div>
            <div style="flex:1;background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center">
              <p style="color:#10b981;font-size:1.5rem;font-weight:800;margin:0">${game}</p>
              <p style="color:rgba(255,255,255,0.3);font-size:0.75rem;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Game</p>
            </div>
          </div>

          <p style="color:rgba(255,255,255,0.6);font-size:1rem;line-height:1.6">
            Amazing work, <strong style="color:#fff">${username}</strong>! 
            Keep training to unlock more achievements and improve your brain age.
          </p>

          <a href="https://brainblitz.vercel.app" 
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:16px">
            Keep Training →
          </a>
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