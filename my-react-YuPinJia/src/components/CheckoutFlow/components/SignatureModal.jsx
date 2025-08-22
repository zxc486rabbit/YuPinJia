// 電子簽明
import { useRef, useState, useEffect } from "react";

export default function SignatureModal({ show, onConfirm, onSkip, onClose }) {
  const canvasRef = useRef(null);
  const ctxRef = useRef(null);
  const drawing = useRef(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    if (!show) return;
    const canvas = canvasRef.current;
    const ratio = window.devicePixelRatio || 1;
    // 基本尺寸（視窗寬會自適應）
    const cssW = Math.min(600, window.innerWidth - 48);
    const cssH = 260;
    canvas.style.width = cssW + "px";
    canvas.style.height = cssH + "px";
    canvas.width = cssW * ratio;
    canvas.height = cssH * ratio;
    const ctx = canvas.getContext("2d");
    ctx.scale(ratio, ratio);
    ctx.lineCap = "round";
    ctx.lineJoin = "round";
    ctx.lineWidth = 2.5;
    ctx.strokeStyle = "#111827";
    ctxRef.current = ctx;
    // 白底
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, cssW, cssH);
    ctx.restore();
    setHasDrawn(false);
  }, [show]);

  const getPos = (e) => {
    const canvas = canvasRef.current;
    const rect = canvas.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    return { x: clientX - rect.left, y: clientY - rect.top };
  };

  const start = (e) => {
    e.preventDefault();
    drawing.current = true;
    const { x, y } = getPos(e);
    ctxRef.current.beginPath();
    ctxRef.current.moveTo(x, y);
  };
  const move = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    const { x, y } = getPos(e);
    ctxRef.current.lineTo(x, y);
    ctxRef.current.stroke();
    setHasDrawn(true);
  };
  const end = (e) => {
    if (!drawing.current) return;
    e.preventDefault();
    drawing.current = false;
    ctxRef.current.closePath();
  };

  const clear = () => {
    const canvas = canvasRef.current;
    const ctx = ctxRef.current;
    ctx.save();
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.clientWidth, canvas.clientHeight);
    ctx.restore();
    setHasDrawn(false);
  };

  const handleConfirm = () => {
    const dataUrl = canvasRef.current.toDataURL("image/jpeg", 0.75); // 壓成 JPEG
  // 取出純 base64（去掉 data:image/jpeg;base64, 前綴）
  const b64 = dataUrl.replace(/^data:image\/\w+;base64,/, "");
  onConfirm?.(hasDrawn ? b64 : ""); // 沒簽就回傳空字串
  };

  if (!show) return null;

  return (
    <div style={styles.backdrop}>
      <div style={styles.modal}>
        <h3 style={{ margin: 0, fontSize: 18 }}>賒帳簽名（可跳過）</h3>
        <p style={{ margin: "6px 0 12px", color: "#6b7280" }}>
          請在下方簽名留存；若不簽也可按「跳過」。
        </p>

        <div
          style={{
            border: "1px dashed #9ca3af",
            borderRadius: 12,
            padding: 8,
            background: "#f9fafb",
          }}
        >
          <canvas
            ref={canvasRef}
            onMouseDown={start}
            onMouseMove={move}
            onMouseUp={end}
            onMouseLeave={end}
            onTouchStart={start}
            onTouchMove={move}
            onTouchEnd={end}
            style={{ display: "block", borderRadius: 8, touchAction: "none" }}
          />
        </div>

        <div style={{ display: "flex", gap: 8, marginTop: 12, justifyContent: "flex-end" }}>
          <button style={btn.secondary} onClick={clear}>清除</button>
          <button style={btn.ghost} onClick={() => onSkip?.()}>跳過</button>
          <button style={btn.primary} onClick={handleConfirm}>送出簽名</button>
        </div>

        <button style={styles.close} onClick={() => onClose?.()}>×</button>
      </div>
    </div>
  );
}

const styles = {
  backdrop: {
    position: "fixed", inset: 0, background: "rgba(0,0,0,.45)",
    display: "flex", alignItems: "center", justifyContent: "center",
    zIndex: 2000,
    padding: 12,
  },
  modal: {
    width: "100%", maxWidth: 680, background: "#fff", borderRadius: 16,
    boxShadow: "0 10px 30px rgba(0,0,0,.2)", padding: 16, position: "relative",
  },
  close: {
    position: "absolute", right: 10, top: 6, fontSize: 22, lineHeight: 1,
    background: "transparent", border: "none", cursor: "pointer",
  },
};

const btn = {
  primary: {
    padding: "10px 14px", borderRadius: 10, border: "none", cursor: "pointer",
    background: "#16a34a", color: "#fff", fontWeight: 600,
  },
  secondary: {
    padding: "10px 14px", borderRadius: 10, border: "1px solid #d1d5db",
    background: "#fff", cursor: "pointer",
  },
  ghost: {
    padding: "10px 14px", borderRadius: 10, border: "none",
    background: "transparent", cursor: "pointer", fontWeight: 600,
  },
};