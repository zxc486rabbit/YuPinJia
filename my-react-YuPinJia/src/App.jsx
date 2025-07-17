import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/sidebar";
import Home from "./Home"; // 主頁
import SalesIndex from "./SalesOrder/SalesIndex"; // 銷售訂單頁面
import StockIndex from "./Stock/StockIndex"; // 庫存頁面
import MemberIndex from "./Member/MemberIndex"; // 會員頁面
import ShiftChangeIndex from "./ShiftChange/ShiftChangeIndex"; // 交接班頁面
import CustomerComplainIndex from "./CustomerComplain/CustomerComplainIndex"; // 客訴頁面
import SettingIndex from "./Setting/SettingIndex"; // 設定頁面
import CheckoutPage from "./components/CheckoutPage"; // 結帳頁面
import "./Cart.css";
import Modal from "react-modal";
Modal.setAppElement("#root");

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
            {/* 主頁 */}
            <Route path="/" element={<Home products={products} />} />
            {/* 結帳頁面 */}
            <Route path="/checkout" element={<CheckoutPage />} />
            {/* 銷售訂單 */}
            <Route path="/SalesOrder/SalesIndex" element={<SalesIndex />} />
            {/* 庫存 */}
            <Route path="/Stock/StockIndex" element={<StockIndex />} />
            {/* 會員 */}
            <Route path="/Member/MemberIndex" element={<MemberIndex />} />
            {/* 交接班 */}
            <Route
              path="/ShiftChange/ShiftChangeIndex"
              element={<ShiftChangeIndex />}
            />
            {/* 客訴 */}
            <Route
              path="/CustomerComplain/CustomerComplainIndex"
              element={<CustomerComplainIndex />}
            />
            {/* 設定 */}
            <Route path="/Setting/SettingIndex" element={<SettingIndex />} />
          </Routes>
        </div>
      </div>
    </Router>
  );
}

export default App;
