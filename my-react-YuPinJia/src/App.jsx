import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/sidebar";
import Home from "./Home"; // 主頁
import SalesIndex from "./SalesOrder/SalesIndex"; // 銷售訂單頁面
import "./Cart.css";

function App() {
  const [products, setProducts] = useState([]);

  useEffect(() => {
    fetch("/product.json") // 從 public 目錄讀取 JSON
      .then((response) => response.json())
      .then((data) => setProducts(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  return (
    <Router>
      <div className="d-flex">
        {/* Sidebar 區域 */}
        <div className="sidebar-container">
          <Sidebar />
        </div>

        {/* 主要內容區域 - 根據路由切換顯示不同內容 */}
        <div className="w-100">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/SalesOrder/SalesIndex" element={<SalesIndex />} />
            <Route path="/inventory" element={<SalesIndex />} />
            <Route path="/members" element={<SalesIndex />} />
            <Route path="/shift-change" element={<SalesIndex />} />
            <Route path="/complaints" element={<SalesIndex />} />
            <Route path="/settings" element={<SalesIndex />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
