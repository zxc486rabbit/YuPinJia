import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import Sidebar from "./components/sidebar";
import AppLayout from "./AppLayout"; // 👈 主版面
import Home from "./Home"; // 主頁
import SalesIndex from "./SalesOrder/SalesIndex"; // 銷售訂單頁面
import StockIndex from "./Stock/StockIndex"; // 庫存頁面
import MemberIndex from "./Member/MemberIndex"; // 會員頁面
import ShiftChangeIndex from "./ShiftChange/ShiftChangeIndex"; // 交接班頁面
import CustomerComplainIndex from "./CustomerComplain/CustomerComplainIndex"; // 客訴頁面
import SettingIndex from "./Setting/SettingIndex"; // 設定頁面
import CheckoutPage from "./components/CheckoutPage"; // 結帳頁面
import PrintPage from "./components/PrintPage"; // 列印頁面
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
          <Routes>
          {/* 用 AppLayout 套 Sidebar */}
        <Route element={<AppLayout />}>
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
            </Route>

            {/* 列印 */}
            <Route path="/print" element={<PrintPage />} />
          </Routes>
    </Router>
  );
}

export default App;
