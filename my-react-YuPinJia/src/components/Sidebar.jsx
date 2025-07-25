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
        <div className="pt-0" style={{ background: "#275BA3" }}>
          <SidebarItem icon={<FaHome size={50} />} route="/"/>
        </div>
        <SidebarItem icon={<FaClipboardList />} text="銷售訂單" route="/SalesOrder/SalesIndex"/>
        <SidebarItem icon={<FaBoxes />} text="庫存" route="/Stock/StockIndex"/>
        <SidebarItem icon={<FaUsers />} text="會員" route="/Member/MemberIndex"/>
        <SidebarItem icon={<FaExchangeAlt />} text="交接班" route="/ShiftChange/ShiftChangeIndex"/>
        <SidebarItem icon={<FaHeadset />} text="客訴" route="/CustomerComplain/CustomerComplainIndex"/>
        <SidebarItem icon={<FaCog />} text="設定" route="/Setting/SettingIndex"/>
      </div>

      {/* 底部資訊 */}
      <div className="text-center mb-3" style={{ color: "#fff", fontSize: "0.8rem" }}>
        <div>機號碼: 002-P1</div>
        <div>高雄市林圈門市</div>
        <div>2024-11-15 16:22:18</div>
      </div>
    </div>
  );
}
