// AppLayout.jsx
import Sidebar from "./components/sidebar";
import { Outlet } from "react-router-dom";

export default function AppLayout() {
  return (
    <div className="d-flex">
      <div className="sidebar-container">
        <Sidebar />
      </div>
      <div className="w-100">
        <Outlet />
      </div>
    </div>
  );
}