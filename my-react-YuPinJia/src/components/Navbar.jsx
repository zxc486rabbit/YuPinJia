import { FaSearch, FaTimes } from "react-icons/fa";
import NavbarItem from "./NavbarItem";
import "./Navbar.css";
import { useState } from "react";

export default function Navbar({ activeTab, setActiveTab, onSearch, suggestions }) {
  const [searchTerm, setSearchTerm] = useState("");

  const handleSearch = (e) => {
    if (e.key === "Enter") {
      onSearch?.(searchTerm.trim());
    }
  };

  const handleClear = () => {
    setSearchTerm("");
    onSearch?.(""); // 重置搜尋
  };

  const handleSuggestionClick = (serial) => {
    setSearchTerm(serial);
    onSearch?.(serial);
  };

  return (
    <div className="navbar d-flex justify-content-center text-center w-100 flex-column">
      {/* 上方選單 */}
      <div className="d-flex">
        <NavbarItem text="熱銷排行" active={activeTab === "熱銷排行"} onClick={() => setActiveTab("熱銷排行")} />
        <NavbarItem text="新品排行" active={activeTab === "新品排行"} onClick={() => setActiveTab("新品排行")} />
        <NavbarItem text="產品分類" active={activeTab === "產品分類"} onClick={() => setActiveTab("產品分類")} />
        <NavbarItem text="贈送" active={activeTab === "贈送"} onClick={() => setActiveTab("贈送")} />
      </div>

      {/* 搜尋欄 */}
      <div className="search-bar ms-2 position-relative">
        <FaSearch className="search-icon" />
        <input
          type="text"
          placeholder="輸入產品序號搜尋..."
          value={searchTerm}
          onChange={(e) => {
            const val = e.target.value;
            setSearchTerm(val);
            onSearch?.(val.trim());
          }}
          onKeyDown={handleSearch}
        />
        {searchTerm && (
          <FaTimes className="clear-icon" onClick={handleClear} style={{ cursor: "pointer" }} />
        )}

        {suggestions?.length > 0 && (
          <div
            style={{
              position: "absolute",
              top: "100%",
              left: 0,
              right: 0,
              background: "#fff",
              border: "1px solid #ddd",
              zIndex: 10,
              textAlign: "left",
              fontSize: "0.9rem",
              maxHeight: "200px",
              overflowY: "auto",
            }}
          >
            {suggestions.map((s) => (
              <div
                key={s.id}
                style={{ padding: "4px 8px", cursor: "pointer" }}
                onClick={() => handleSuggestionClick(s.serialNumber)}
              >
                {s.serialNumber} - {s.name}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}