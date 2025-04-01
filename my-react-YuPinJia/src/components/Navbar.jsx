import { FaSearch } from "react-icons/fa";
import NavbarItem from "./NavbarItem";
import "./Navbar.css";

export default function Navbar() {
  return (
    <div className="navbar d-flex  justify-content-between text-center w-100 px-4">
      {/* 上方選單 */}
      <div className="d-flex">
        <NavbarItem text="熱銷排行" active/>
        <NavbarItem text="新品排行" />
        <NavbarItem text="產品分類" />
        <NavbarItem text="贈送" />
      </div>

      {/* 底部資訊 */}
      <div className="search-bar">
        <FaSearch className="search-icon" />
        <input type="text" placeholder="搜尋..." />
      </div>
    </div>
  );
}
