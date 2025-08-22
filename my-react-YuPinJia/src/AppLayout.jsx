import Sidebar from "./components/sidebar";
import { useEmployee } from "./utils/EmployeeContext"; // 引入上下文
import { Navigate, Outlet } from "react-router-dom"; // 用來進行頁面重定向


export default function AppLayout() {
  const { currentUser } = useEmployee(); // 從上下文中獲取當前員工

  // 如果員工未登入，則跳轉到登入頁面
  if (!currentUser) {
    return <Navigate to="/login" />;
  }

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