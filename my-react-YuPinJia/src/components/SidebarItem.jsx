import { useNavigate } from "react-router-dom";

export default function SidebarItem({ icon, text, active, route }) {
  const navigate = useNavigate(); // React Router 的導航 Hook

  return (
    <div
      className={`sidebar-item d-flex flex-column justify-content-center text-center py-2 ${
        active ? "bg-dark" : ""
      }`}
      style={{
        borderBottom: "1px solid white",
        width: "100%",
        minHeight: "11vh",
      }}
      onClick={() => navigate(route)} // 點擊時導航
    >
      <div style={{ color: "#fff", fontSize: "2rem" }}>{icon}</div>
      <div style={{ color: "#fff", fontSize: "1.5rem" }}>{text}</div>
    </div>
  );
}
