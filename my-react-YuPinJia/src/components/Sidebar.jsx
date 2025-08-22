import React, { useState, useEffect } from "react";
import SidebarItem from "./SidebarItem";
import "./Sidebar.css";
import {
  FaHome,
  FaClipboardList,
  FaUsers,
  FaExchangeAlt,
  FaHeadset,
  FaCog,
  FaBoxes,
} from "react-icons/fa";
import Swal from "sweetalert2";
import { useLocation, useNavigate } from "react-router-dom";
import { useEmployee } from "../utils/EmployeeContext";

export default function Sidebar() {
  const [currentTime, setCurrentTime] = useState(""); // 用來儲存當前時間
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useEmployee() || {};
  // 登入者姓名：先取 user.chineseName，其次取 name，再退而取 account
  const staffOnDuty =
    currentUser?.user?.chineseName ||
    currentUser?.name ||
    currentUser?.user?.account ||
    "—";

  useEffect(() => {
    const updateTime = () => {
      const now = new Date();
      setCurrentTime(now.toLocaleString()); // 使用本地時間格式
    };

    const intervalId = setInterval(updateTime, 1000); // 每秒更新一次時間

    // 清除 interval 在組件卸載時
    return () => clearInterval(intervalId);
  }, []);

  const confirmAndGo = async (to) => {
    // 只在 /checkout（或其子路由）時攔截
    if (location.pathname.startsWith("/checkout")) {
      const { isConfirmed } = await Swal.fire({
        icon: "warning",
        title: "要離開結帳頁嗎？",
        text: "離開可能會中斷目前的結帳流程。",
        showCancelButton: true,
        confirmButtonText: "確定離開",
        cancelButtonText: "取消",
        reverseButtons: true,
        focusCancel: true,
      });
      if (!isConfirmed) return;
    }
    navigate(to);
  };

  return (
    <div className="sidebar d-flex flex-column justify-content-between text-center vh-100">
      {/* 上方選單 */}
      <div>
        {/* <FaHome className="" style={{color: "#fff", fontSize: "4rem", height: "150px" }}/> */}
        <div className="pt-0" style={{ background: "#275BA3" }}>
          <SidebarItem
            icon={<FaHome size={50} />}
            onClick={() => confirmAndGo("/")}
          />
        </div>
        <SidebarItem
          icon={<FaClipboardList />}
          text="銷售訂單"
          onClick={() => confirmAndGo("/SalesOrder/SalesIndex")}
        />
        <SidebarItem
          icon={<FaBoxes />}
          text="庫存"
          onClick={() => confirmAndGo("/Stock/StockIndex")}
        />
        <SidebarItem
          icon={<FaUsers />}
          text="會員"
          onClick={() => confirmAndGo("/Member/MemberIndex")}
        />
        <SidebarItem
          icon={<FaExchangeAlt />}
          text="交接班"
          onClick={() => confirmAndGo("/ShiftChange/ShiftChangeIndex")}
        />
        <SidebarItem
          icon={<FaHeadset />}
          text="客訴"
          onClick={() =>
            confirmAndGo("/CustomerComplain/CustomerComplainIndex")
          }
        />
        <SidebarItem
          icon={<FaCog />}
          text="設定"
          onClick={() => confirmAndGo("/Setting/SettingIndex")}
        />
      </div>

      {/* 底部資訊 */}
      <div
        className="text-center mb-3"
        style={{ color: "#fff", fontSize: "0.8rem" }}
      >
        <div>機號碼: 002-P1</div>
        <div>{currentUser?.user?.storeName || "林園門市"}</div>{" "}
        {/* 若要一起顯示門市 */}
        <div>值班人員: {staffOnDuty}</div>
        <div>{currentTime}</div> {/* 顯示當前時間 */}
      </div>
    </div>
  );
}
