import { useState, useEffect } from "react";

const updates = [
  {
    icon: "🔐",
    title: "Login Problem Fixed",
    description: "Sign-in errors resolved. Authentication is now smooth and reliable.",
  },
  {
    icon: "📱",
    title: "Better Mobile Experience",
    description: "Layout adapts perfectly across all screen sizes — phones, tablets, and desktops.",
  },
  {
    icon: "🎮",
    title: "Game Bugs Resolved",
    description: "All known gameplay issues have been identified and fixed for a seamless experience.",
  },
];

export default function UpdateModal() {
  const [visible, setVisible] = useState(false);
  const [closing, setClosing] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(true), 300);
    return () => clearTimeout(timer);
  }, []);

  const handleClose = () => {
    setClosing(true);
    setTimeout(() => setVisible(false), 300);
  };

  if (!visible) return null;

  return (
    <>
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; }
          to { opacity: 1; }
        }
        @keyframes slideUp {
          from { opacity: 0; transform: translateY(24px) scale(0.97); }
          to { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes fadeOut {
          from { opacity: 1; }
          to { opacity: 0; }
        }
        @keyframes slideDown {
          from { opacity: 1; transform: translateY(0) scale(1); }
          to { opacity: 0; transform: translateY(24px) scale(0.97); }
        }
        .um-overlay {
          position: fixed;
          inset: 0;
          background: rgba(0, 0, 0, 0.72);
          backdrop-filter: blur(6px);
          -webkit-backdrop-filter: blur(6px);
          display: flex;
          align-items: center;
          justify-content: center;
          z-index: 9999;
          padding: 20px;
          animation: fadeIn 0.3s ease forwards;
        }
        .um-overlay.closing {
          animation: fadeOut 0.3s ease forwards;
        }
        .um-card {
          background: #111111;
          border: 0.5px solid rgba(255,255,255,0.12);
          border-radius: 20px;
          padding: 36px 32px 28px;
          width: 100%;
          max-width: 420px;
          animation: slideUp 0.35s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
        }
        .um-card.closing {
          animation: slideDown 0.3s ease forwards;
        }
        .um-badge {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          background: rgba(255,255,255,0.06);
          border: 0.5px solid rgba(255,255,255,0.1);
          border-radius: 100px;
          padding: 5px 12px;
          font-size: 12px;
          color: rgba(255,255,255,0.5);
          letter-spacing: 0.04em;
          text-transform: uppercase;
          margin-bottom: 20px;
        }
        .um-badge-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: #7c5cfc;
        }
        .um-title {
          font-size: 22px;
          font-weight: 600;
          color: #ffffff;
          margin: 0 0 6px;
          letter-spacing: -0.4px;
          line-height: 1.3;
        }
        .um-subtitle {
          font-size: 14px;
          color: rgba(255,255,255,0.4);
          margin: 0 0 28px;
          line-height: 1.5;
        }
        .um-list {
          display: flex;
          flex-direction: column;
          gap: 4px;
          margin-bottom: 28px;
        }
        .um-item {
          display: flex;
          align-items: flex-start;
          gap: 14px;
          padding: 14px 16px;
          border-radius: 14px;
          background: rgba(255,255,255,0.04);
          border: 0.5px solid rgba(255,255,255,0.07);
          transition: background 0.2s;
        }
        .um-item:hover {
          background: rgba(255,255,255,0.07);
        }
        .um-item-icon {
          font-size: 20px;
          line-height: 1;
          flex-shrink: 0;
          margin-top: 1px;
        }
        .um-item-content {}
        .um-item-title {
          font-size: 14px;
          font-weight: 500;
          color: #ffffff;
          margin: 0 0 3px;
          letter-spacing: -0.1px;
        }
        .um-item-desc {
          font-size: 13px;
          color: rgba(255,255,255,0.4);
          margin: 0;
          line-height: 1.5;
        }
        .um-divider {
          height: 0.5px;
          background: rgba(255,255,255,0.08);
          margin-bottom: 20px;
        }
        .um-btn {
          width: 100%;
          padding: 14px;
          border-radius: 14px;
          border: none;
          cursor: pointer;
          font-size: 16px;
          font-weight: 600;
          letter-spacing: -0.2px;
          background: #ffffff;
          color: #7c5cfc;
          transition: opacity 0.15s, transform 0.15s;
          font-family: inherit;
        }
        .um-btn:hover {
          opacity: 0.92;
        }
        .um-btn:active {
          transform: scale(0.98);
          opacity: 0.85;
        }
        @media (max-width: 480px) {
          .um-card {
            padding: 28px 20px 22px;
            border-radius: 18px;
          }
          .um-title {
            font-size: 19px;
          }
          .um-item {
            padding: 12px 14px;
          }
        }
      `}</style>

      <div className={`um-overlay${closing ? " closing" : ""}`}>
        <div className={`um-card${closing ? " closing" : ""}`}>

          <div className="um-badge">
            <span className="um-badge-dot" />
            What's New
          </div>

          <h1 className="um-title">We've been busy 🛠️</h1>
          <p className="um-subtitle">Here's everything that's been improved since your last visit.</p>

          <div className="um-list">
            {updates.map((item, i) => (
              <div className="um-item" key={i}>
                <span className="um-item-icon">{item.icon}</span>
                <div className="um-item-content">
                  <p className="um-item-title">{item.title}</p>
                  <p className="um-item-desc">{item.description}</p>
                </div>
              </div>
            ))}
          </div>

          <div className="um-divider" />

          <button className="um-btn" onClick={handleClose}>
            Ok!
          </button>

        </div>
      </div>
    </>
  );
}