import { useState } from "react";
import { FaSearch } from "react-icons/fa";
import NavbarItem from "./NavbarItem";
import "./Navbar.css";

export default function Navbar() {
  const [activeTab ,setActiveTab] = useState("熱銷排行")

  return (
    <div className="navbar d-flex  justify-content-start text-center w-100 px-5">
      {/* 上方選單 */}
      <div className="d-flex">
        <NavbarItem text="熱銷排行" active={activeTab === "熱銷排行"} onClick={() => setActiveTab("熱銷排行")}/>
        <NavbarItem text="新品排行" active={activeTab === "新品排行"} onClick={() => setActiveTab("新品排行")}/>
        <NavbarItem text="產品分類" active={activeTab === "產品分類"} onClick={() => setActiveTab("產品分類")}/>
        <NavbarItem text="贈送" active={activeTab === "贈送"} onClick={() => setActiveTab("贈送")}/>
      </div>

      {/* 底部資訊 */}
      <div className="search-bar ms-4">
        <FaSearch className="search-icon" />
        <input type="text" placeholder="搜尋..." />
      </div>
    </div>
  );
}
