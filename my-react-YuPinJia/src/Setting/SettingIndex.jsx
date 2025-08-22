// SettingIndex.jsx
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import Swal from "sweetalert2";
import { useEmployee } from "../utils/EmployeeContext";

import NavbarItem from "../components/NavbarItem"; // navbar模組
import Setting from "./Setting"; // 密碼變更

export default function SettingIndex() {
  const [activeTab, setActiveTab] = useState("密碼變更");
  const { logout } = useEmployee();
  const navigate = useNavigate();

  const handleLogout = async () => {
    const result = await Swal.fire({
      icon: "warning",
      title: "確定要登出嗎？",
      text: "登出後需要重新登入才能繼續操作。",
      showCancelButton: true,
      confirmButtonText: "登出",
      cancelButtonText: "取消",
      reverseButtons: true,
      confirmButtonColor: "#d33",
      cancelButtonColor: "#6b7280",
    });
    if (result.isConfirmed) {
      logout();          // 清除登入狀態 & token
      navigate("/login"); // 若你的登入路徑不同，改這裡
    }
  };

  return (
    <>
      <div className="navbar d-flex justify-content-between text-center w-100 px-4">
        <div className="d-flex">
          <NavbarItem
            text="密碼變更"
            active={activeTab === "密碼變更"}
            onClick={() => setActiveTab("密碼變更")}
          />
        </div>

        {/* 右側登出按鈕（紅色風格） */}
        <div className="d-flex align-items-center">
          <button
            onClick={handleLogout}
            className="btn"
            style={{
              background: "#e12d2d",
              color: "#fff",
              borderRadius: 12,
              padding: "8px 14px",
              fontWeight: 700,
              boxShadow: "0 3px 8px rgba(225,45,45,.25)",
            }}
          >
            登出
          </button>
        </div>
      </div>

      {/* 內容區域 */}
      <div className="content-container" style={{ height: "89vh" }}>
        {activeTab === "密碼變更" && <Setting />}
      </div>
    </>
  );
}
