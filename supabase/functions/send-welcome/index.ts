import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");

serve(async (req) => {
  const { email, username } = await req.json();

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${RESEND_API_KEY}`,
    },
    body: JSON.stringify({
      from: "BrainBlitz <onboarding@resend.dev>",
      to: [email],
      subject: "⚡ Welcome to BrainBlitz!",
      html: `
        <div style="background:#000;color:#fff;font-family:sans-serif;padding:40px;max-width:600px;margin:0 auto;border-radius:16px;border:1px solid rgba(255,255,255,0.1)">
          <h1 style="color:#8b5cf6;font-size:2rem;margin-bottom:8px">⚡ BrainBlitz</h1>
          <h2 style="color:#fff;font-size:1.5rem">Welcome, ${username}! 🧠</h2>
          <p style="color:rgba(255,255,255,0.6);font-size:1rem;line-height:1.6">
            Your cognitive training journey starts now. 
            You have access to 7 adaptive brain training modules.
          </p>
          <div style="background:rgba(139,92,246,0.1);border:1px solid rgba(139,92,246,0.2);border-radius:12px;padding:20px;margin:24px 0">
            <p style="color:#a78bfa;font-weight:700;margin:0 0 8px">Your modules:</p>
            <p style="color:rgba(255,255,255,0.5);margin:0;font-size:0.9rem">
              🧠 Neural Recall &nbsp;|&nbsp; ⚡ Arithmetic Engine &nbsp;|&nbsp; 
              🔮 Pattern Intelligence &nbsp;|&nbsp; 🎯 Inhibition Protocol &nbsp;|&nbsp;
              💡 Working Memory Lab &nbsp;|&nbsp; ⚡ Reflex Matrix &nbsp;|&nbsp; 
              📝 Lexical Decoder
            </p>
          </div>
          <a href="https://brainblitz.vercel.app" 
             style="display:inline-block;background:linear-gradient(135deg,#7c3aed,#06b6d4);color:#fff;padding:14px 32px;border-radius:10px;text-decoration:none;font-weight:700;margin-top:8px">
            Start Training →
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