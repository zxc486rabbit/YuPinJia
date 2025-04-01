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

export default function Sidebar() {
  return (
    <div className="sidebar d-flex flex-column justify-content-between text-center vh-100">
      {/* 上方選單 */}
      <div>
        {/* <FaHome className="" style={{color: "#fff", fontSize: "4rem", height: "150px" }}/> */}
        <div style={{ background: "#275BA3" }}>
          <SidebarItem icon={<FaHome size={50} />} route="/"/>
        </div>
        <SidebarItem icon={<FaClipboardList />} text="銷售訂單" route="/SalesOrder/SalesIndex"/>
        <SidebarItem icon={<FaBoxes />} text="庫存" />
        <SidebarItem icon={<FaUsers />} text="會員" />
        <SidebarItem icon={<FaExchangeAlt />} text="交接班" />
        <SidebarItem icon={<FaHeadset />} text="客訴" />
        <SidebarItem icon={<FaCog />} text="設定" />
      </div>

      {/* 底部資訊 */}
      <div className="text-center small" style={{ color: "#fff" }}>
        <div>機號碼: 002-P1</div>
        <div>台灣高雄市林圈區</div>
        <div>2024-11-15 16:22:18</div>
      </div>
    </div>
  );
}
