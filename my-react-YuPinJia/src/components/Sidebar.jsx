import React, { useState, useEffect, useMemo } from "react";
import axios from "axios";
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

/** ===== Front 權限常數 & API ===== */
const API_BASE = "https://yupinjia.hyjr.com.tw:8443/api/api";
const ACTION = { View: 1 }; // 只用檢視權控制 Sidebar 顯示
// 前台 PageType 對照（依你提供的 Front PageType）
const PAGE = {
  SalesOrder: 100,       // 銷售訂單
  Stock: 200,            // 庫存
  Member: 300,           // 會員
  ShiftHandover: 400,    // 交接班
  Complaint: 500,        // 客訴
  Settings: 600,         // 設定
};

const api = axios.create({ baseURL: API_BASE, headers: { Accept: "application/json" } });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("accessToken");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

export default function Sidebar() {
  const [currentTime, setCurrentTime] = useState("");
  const [viewablePageIds, setViewablePageIds] = useState(new Set());
  const [permLoaded, setPermLoaded] = useState(false); // ✅ 是否已載入權限
  const location = useLocation();
  const navigate = useNavigate();
  const { currentUser } = useEmployee() || {};

  // 取使用者的「前台角色 roleId」：盡量多路徑容錯
  const roleId = useMemo(() => {
    const fromCtx = currentUser?.user?.roleId ?? currentUser?.roleId;
    const fromStorage =
      localStorage.getItem("frontRoleId") ??
      localStorage.getItem("roleId");
    return Number(fromCtx ?? fromStorage ?? 0) || 0;
  }, [currentUser]);

  // 值班人員顯示
  const staffOnDuty =
    currentUser?.user?.chineseName ||
    currentUser?.name ||
    currentUser?.user?.account ||
    "—";

  // 時鐘
  useEffect(() => {
    const updateTime = () => setCurrentTime(new Date().toLocaleString());
    const id = setInterval(updateTime, 1000);
    updateTime();
    return () => clearInterval(id);
  }, []);

  // 抓取此角色的「可檢視頁面」集合
  useEffect(() => {
    let mounted = true;
    setPermLoaded(false);
    if (!roleId) {
      setViewablePageIds(new Set());
      setPermLoaded(true);
      return;
    }
    api
      .get("/t_FrontPermission/GetRolePermission", { params: { roleId } })
      .then(({ data }) => {
        if (!mounted) return;
        const allow = new Set(
          (Array.isArray(data) ? data : [])
            .filter((x) => x.isEnabled && Number(x.actionId) === ACTION.View)
            .map((x) => Number(x.pageId))
        );
        setViewablePageIds(allow);
      })
      .catch((err) => {
        console.error("載入前台角色權限失敗", err);
        Swal.fire({
          icon: "warning",
          title: "無法載入權限",
          text: "目前功能按鈕會顯示，但需要權限才能點擊。",
          timer: 2000,
          showConfirmButton: false,
        });
        setViewablePageIds(new Set());
      })
      .finally(() => setPermLoaded(true));
    return () => {
      mounted = false;
    };
  }, [roleId]);

  // 你的功能清單（全顯示；pageId 用於控制可否點擊）
  const rawMenu = useMemo(
    () => [
      { key: "sales", icon: <FaClipboardList />, text: "銷售訂單", path: "/SalesOrder/SalesIndex", pageId: PAGE.SalesOrder },
      { key: "stock", icon: <FaBoxes />, text: "庫存", path: "/Stock/StockIndex", pageId: PAGE.Stock },
      { key: "member", icon: <FaUsers />, text: "會員", path: "/Member/MemberIndex", pageId: PAGE.Member },
      { key: "shift", icon: <FaExchangeAlt />, text: "交接班", path: "/ShiftChange/ShiftChangeIndex", pageId: PAGE.ShiftHandover },
      { key: "complaint", icon: <FaHeadset />, text: "客訴", path: "/CustomerComplain/CustomerComplainIndex", pageId: PAGE.Complaint },
      { key: "settings", icon: <FaCog />, text: "設定", path: "/Setting/SettingIndex", pageId: PAGE.Settings },
    ],
    []
  );

  // 離開結帳確認
  const confirmAndGo = async (to) => {
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

  const showNoPermission = () =>
    Swal.fire({ icon: "error", title: "沒有權限", text: "此功能未開啟檢視權限" });

  // 統一渲染一個 Sidebar 按鈕（可帶禁用狀態與樣式）
  const renderMenuItem = (item) => {
    // ✅ 規則：
    //  - permLoaded=false 時，功能鍵先禁用（避免還沒判斷就點進去）
    //  - permLoaded=true 時，只有擁有 View 權限的才能點擊
    const canView = permLoaded && viewablePageIds.has(item.pageId);

    const onClick = () => {
      if (canView) confirmAndGo(item.path);
      else showNoPermission();
    };

    return (
      <div
        key={item.key}
        style={{
          opacity: canView ? 1 : 0.4,
          cursor: canView ? "pointer" : "not-allowed",
          transition: "opacity .2s ease",
        }}
      >
        <SidebarItem
          icon={item.icon}
          text={item.text}
          onClick={onClick}
          // 若 SidebarItem 支援 disabled，也一起傳（不支援也沒關係）
          disabled={!canView}
        />
      </div>
    );
  };

  return (
    <div className="sidebar d-flex flex-column justify-content-between text-center vh-100">
      {/* 上方選單 */}
      <div>
        <div className="pt-0" style={{ background: "#275BA3" }}>
          {/* 首頁永遠可點 */}
          <SidebarItem icon={<FaHome size={50} />} onClick={() => confirmAndGo("/")} />
        </div>

        {/* 全部顯示，但依權限決定是否可點 */}
        {rawMenu.map(renderMenuItem)}
      </div>

      {/* 底部資訊 */}
      <div className="text-center mb-3" style={{ color: "#fff", fontSize: "0.8rem" }}>
        <div>機號碼: 002-P1</div>
        <div>{currentUser?.user?.storeName || "林園門市"}</div>
        <div>值班人員: {staffOnDuty}</div>
        <div>{currentTime}</div>
      </div>
    </div>
  );
}
