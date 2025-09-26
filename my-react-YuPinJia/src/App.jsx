import { BrowserRouter as Router, Routes, Route } from "react-router-dom";
import { useState } from "react";
import { EmployeeProvider } from "./utils/EmployeeContext"; // 引入登入上下文
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
import LoginPage from "./utils/LoginPage"; // 列印頁面
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PrivateRoute from "./utils/PrivateRoute"; // ★ 新增
import CustomerDisplay from "./utils/CustomerDisplay"; // 客顯頁面
import "./Cart.css";
import Modal from "react-modal";
import "./utils/httpBootstrap"; // ← 全域 Token/刷新/重送在這裡掛好
Modal.setAppElement("#root");

function App() {
  const [queryClient] = useState(() => new QueryClient()); // ★ lazy 建立一次
  return (
    <EmployeeProvider>
      <QueryClientProvider client={queryClient}>
        <Router>
          <Routes>
            {/* 用 AppLayout 套 Sidebar */}
            <Route
              element={
                <PrivateRoute>
                  <AppLayout />
                </PrivateRoute>
              }
            >
              {/* 主頁 */}
              <Route path="/" element={<Home />} />
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
            <Route path="/login" element={<LoginPage />} />

            {/* 新增客顯路由 */}
            <Route path="/customer-display" element={<CustomerDisplay />} />
          </Routes>
        </Router>
      </QueryClientProvider>
    </EmployeeProvider>
  );
}

export default App;
