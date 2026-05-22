import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  const { 
    email, 
    username, 
    brainAge, 
    level,
    streak,
    totalSessions,
    bestGame,
    weeklyScore,
    improvement
  } = await req.json();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "BrainBlitz <onboarding@resend.dev>",
      to: [email],
      subject: `🧠 Your Weekly Brain Report — ${username}`,
      html: `
        <div style="background:#000;color:#fff;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;border-radius:16px;border:1px solid rgba(255,255,255,0.1)">
          
          <h1 style="color:#8b5cf6;font-size:2rem;margin-bottom:4px">⚡ BrainBlitz</h1>
          <p style="color:rgba(255,255,255,0.3);font-size:0.85rem;margin:0 0 32px">Weekly Brain Report</p>

          <h2 style="color:#fff;font-size:1.4rem;margin-bottom:4px">
            Hey ${username}! Here's your week 🧠
          </h2>
          <p style="color:rgba(255,255,255,0.5);font-size:0.9rem;line-height:1.6;margin-bottom:28px">
            Here's a summary of your cognitive training this week.
          </p>

          <!-- Brain Age Card -->
          <div style="background:linear-gradient(135deg,rgba(124,58,237,0.15),rgba(6,182,212,0.1));border:1px solid rgba(139,92,246,0.2);border-radius:16px;padding:24px;text-align:center;margin-bottom:16px">
            <p style="color:rgba(255,255,255,0.4);font-size:0.75rem;text-transform:uppercase;letter-spacing:2px;margin:0 0 4px">Brain Age</p>
            <p style="color:#fff;font-size:3.5rem;font-weight:900;margin:0;letter-spacing:-2px">${brainAge}</p>
            <p style="color:#10b981;font-size:0.85rem;font-weight:600;margin:4px 0 0">
              ${improvement > 0 ? `↑ Improved by ${improvement}% this week` : 'Keep training to improve!'}
            </p>
          </div>

          <!-- Stats Grid -->
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px">
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center">
              <p style="color:#f59e0b;font-size:1.5rem;font-weight:800;margin:0">${level}</p>
              <p style="color:rgba(255,255,255,0.3);font-size:0.72rem;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Level</p>
            </div>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center">
              <p style="color:#06b6d4;font-size:1.5rem;font-weight:800;margin:0">${streak} 🔥</p>
              <p style="color:rgba(255,255,255,0.3);font-size:0.72rem;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Day Streak</p>
            </div>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center">
              <p style="color:#8b5cf6;font-size:1.5rem;font-weight:800;margin:0">${totalSessions}</p>
              <p style="color:rgba(255,255,255,0.3);font-size:0.72rem;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Sessions</p>
            </div>
            <div style="background:rgba(255,255,255,0.03);border:1px solid rgba(255,255,255,0.06);border-radius:12px;padding:16px;text-align:center">
              <p style="color:#10b981;font-size:1.5rem;font-weight:800;margin:0">${weeklyScore}</p>
              <p style="color:rgba(255,255,255,0.3);font-size:0.72rem;margin:4px 0 0;text-transform:uppercase;letter-spacing:1px">Weekly XP</p>
            </div>
          </div>

          <!-- Best Game -->
          <div style="background:rgba(16,185,129,0.06);border:1px solid rgba(16,185,129,0.15);border-radius:12px;padding:16px;margin-bottom:24px">
            <p style="color:rgba(255,255,255,0.4);font-size:0.75rem;text-transform:uppercase;letter-spacing:1px;margin:0 0 4px">
              🏆 Best Game This Week
            </p>
            <p style="color:#10b981;font-size:1.1rem;font-weight:700;margin:0">${bestGame}</p>
          </div>

          <a href="https://brainblitz.vercel.app" 
             style="display:block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;text-align:center;margin-bottom:24px">
            Continue Training →
          </a>

          <p style="color:rgba(255,255,255,0.2);font-size:0.75rem;text-align:center;margin:0">
            BrainBlitz — Train your brain, level up your mind.<br/>
            <span style="color:rgba(255,255,255,0.1)">
              You're receiving this because you have an account at BrainBlitz.
            </span>
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