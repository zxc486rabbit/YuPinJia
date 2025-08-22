import { useNavigate } from "react-router-dom";

export default function SidebarItem({ icon, text, active, route, onClick, disabled = false }) {
  const navigate = useNavigate(); // React Router 的導航 Hook

   const handleClick = (e) => {
    // 讓父層攔截
    if (onClick) {
      e.preventDefault();
      e.stopPropagation();
      onClick();
      return;
    }
    // 沒有 onClick 才走預設導頁
    if (route) navigate(route);
  };

  return (
    <div
      className={`sidebar-item d-flex flex-column justify-content-center text-center py-2 ${
        active ? "bg-dark" : ""
      } ${disabled ? "opacity-50" : ""}`}
      style={{
        borderBottom: "1px solid white",
        width: "100%",
        minHeight: "11vh",
        cursor: disabled ? "not-allowed" : "pointer",
      }}
      role="button"
      tabIndex={0}
      onClick={handleClick}                                    // ✅ 用 handleClick
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && handleClick(e)} // 無滑鼠也可觸發
      aria-disabled={disabled}
      title={disabled ? "目前不可操作" : undefined}
    >
      <div style={{ color: "#fff", fontSize: "2rem" }}>{icon}</div>
      <div style={{ color: "#fff", fontSize: "1.5rem" }}>{text}</div>
    </div>
  );
}
