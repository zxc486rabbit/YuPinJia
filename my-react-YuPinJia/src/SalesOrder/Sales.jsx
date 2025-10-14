import { useState, useEffect, useMemo } from "react";
import axios from "axios";
import "../components/Search.css";
import SearchField from "../components/SearchField";
import { Modal, Button, Pagination } from "react-bootstrap";
import Swal from "sweetalert2";
import ReturnOrderForm from "./ReturnOrderModal";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

// ★ PATCH: 配送方式映射
const DELIVERY_LABEL = {
  0: "現場帶走",
  1: "機場提貨",
  2: "碼頭提貨",
  3: "宅配到府",
  4: "店到店",
  5: "訂單自取",
  6: "司機配送",
};
const toDeliveryLabel = (v) => {
  const n = typeof v === "number" ? v : /^\d+$/.test(String(v)) ? Number(v) : v;
  return typeof n === "number" ? (DELIVERY_LABEL[n] ?? String(n)) : String(v ?? "—");
};

export default function Sales() {
  // ===== 查詢欄位 =====
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState(""); // 未用，但先保留相容
  const [pickupMethod, setPickupMethod] = useState("all");
  const [status, setStatus] = useState("all");
  const [month, setMonth] = useState("");
  const [memberName, setMemberName] = useState("");
  const [showMoreFilters, setShowMoreFilters] = useState(false);

  // ===== 清單資料 =====
  const [tableData, setTableData] = useState([]);
  const [originalData, setOriginalData] = useState([]);
  const [loading, setLoading] = useState(true);

  // ===== 明細 / 編輯 / 退貨 =====
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);

  // ===== 分頁狀態（新 API）=====
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  const lastQueryRef = useMemo(() => ({ current: {} }), []);
  const setLastQuery = (obj) => (lastQueryRef.current = obj);
  const getLastQuery = () => lastQueryRef.current || {};

  // ===== 公用轉換 =====
  const toStatusCode = (raw) => {
    if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
    if (typeof raw === "string") {
      if (/^\d+$/.test(raw)) return Number(raw);
      const map = { 已作廢: 0, 賒帳: 1, 已付款: 2, 已出貨: 3, 配送中: 4, 已完成: 5 };
      if (raw in map) return map[raw];
    }
    return null;
  };

  const renderStatusBadge = (statusCode) => {
    const s = toStatusCode(statusCode);
    if (s === null) return <span className="badge bg-secondary fs-6">未知</span>;
    switch (s) {
      case 5: return <span className="badge bg-success fs-6">已完成</span>;
      case 4: return <span className="badge bg-warning text-dark fs-6">配送中</span>;
      case 3: return <span className="badge bg-primary fs-6">已出貨</span>;
      case 1: return <span className="badge bg-warning text-dark fs-6">賒帳</span>;
      case 2: return <span className="badge bg-secondary text-light fs-6">已付款</span>;
      case 0: return <span className="badge bg-danger fs-6">已作廢</span>;
      default: return <span className="badge bg-secondary fs-6">未知</span>;
    }
  };

  const formatCurrency = (n) => Number(n || 0).toLocaleString();

  const formatPaymentMethod = (pm) => {
    if (pm === null || pm === undefined) return "—";
    const code = typeof pm === "number" ? pm : /^\d+$/.test(pm) ? Number(pm) : null;
    if (code !== null) return ["現金", "匯款", "支票", "刷卡"][code] + "付款";
    if (typeof pm === "string") {
      if (/現金/.test(pm)) return "現金付款";
      if (/匯款/.test(pm)) return "匯款";
      if (/支票/.test(pm)) return "支票";
      if (/刷卡|信用卡/.test(pm)) return "刷卡";
      return pm;
    }
    return "—";
  };

  const getNextStepLabel = (status) => {
    const s = toStatusCode(status);
    if (s === null) return "下一步";
    switch (s) {
      case 1:
      case 2: return "確認出貨";
      case 3: return "確認配送";
      case 4: return "完成訂單";
      case 5: return "已完成";
      case 0: return "復原訂單";
      default: return "下一步";
    }
  };

  // ★ PATCH: 改用訂單欄位直接計算（總計=totalAmount；找零=paymentAmount-totalAmount；欠款=總計-付款）
  const computeTotals = (o) => {
    const total = Number(o?.totalAmount ?? 0);
    const paid = Number(o?.paymentAmount ?? 0);
    const due = Math.max(0, total - paid);
    const change = Math.max(0, paid - total);
    return { total, paid, due, change };
  };

  // ★ PATCH: 對照 API 欄位產出列表資料（包含配送方式中文與 offsetAmount）
  const mapApiOrder = (order) => ({
    id: order.id,
    orderId: order.orderNumber,
    store: order.storeName ?? "馬公門市",
    member: order.memberName ?? order.memberIdName ?? "未命名會員",
    phone: order.mobile ?? "",
    totalAmount: Number(order.totalAmount ?? 0),
    paymentAmount: Number(order.paymentAmount ?? 0),
    creditAmount: Number(order.creditAmount ?? 0),
    offsetAmount: Number(order.offsetAmount ?? 0),
    paymentMethod: order.paymentMethod ?? "",
    carrierNumber: order.carrierNumber || "無",
    invoiceNumber: order.invoiceNumber || "",
    taxId: order.unifiedBusinessNumber || "無",
    pickupTime: order.pickupInfo?.match(/時間:(.*)/)?.[1] ?? "無",
    deliveryMethod: toDeliveryLabel(order.deliveryMethod),
    deliveryMethodRaw: order.deliveryMethod,
    operatorName: order.operatorName ?? "操作員A",
    createdAt: order.createdAt ?? "",
    status: toStatusCode(order.status),
    storeId: order.storeId,
    memberId: order.memberId,
    totalQuantity: order.totalQuantity,
    note: order.note,
    pickupInfo: order.pickupInfo,
    signature: order.signature,
    signatureMime: order.signatureMime,
    mobile: order.mobile,
    shippingAddress: order.shippingAddress,
  });

  // ===== 共用載入 =====
  const fetchOrders = async (query, _page = 1, _limit = limit) => {
    setLoading(true);
    try {
      const offset = (_page - 1) * _limit;
      const params = { ...query, offset, limit: _limit };
      Object.keys(params).forEach((k) => params[k] === undefined && delete params[k]);

      const res = await axios.get(`${API_BASE}/t_SalesOrder`, { params });

      let list = [];
      let newTotal = 0;
      let newLimit = _limit;

      if (Array.isArray(res.data)) {
        list = res.data;
        newTotal = list.length;
      } else if (res.data && typeof res.data === "object") {
        const { total: t, limit: l, items } = res.data;
        newTotal = typeof t === "number" ? t : 0;
        newLimit = typeof l === "number" && l > 0 ? l : _limit;
        list = Array.isArray(items) ? (Array.isArray(items[0]) ? items[0] : items) : [];
      }

      list.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
      const mapped = list.map(mapApiOrder);

      setOriginalData(mapped);
      setTableData(mapped);
      setTotal(newTotal);
      setLimit(newLimit);
      setLoading(false);
    } catch (err) {
      console.error("載入訂單失敗", err);
      setLoading(false);
      Swal.fire("錯誤", "載入訂單失敗，請稍後再試", "error");
    }
  };

  // ===== 初次載入 =====
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const initParams = {
      orderNumber: qs.get("orderNumber") || undefined,
      createdAt: qs.get("createdAt") || undefined,
      memberName: qs.get("memberName") || undefined,
      deliveryMethod:
        (qs.get("deliveryMethod") || undefined) === "all"
          ? undefined
          : qs.get("deliveryMethod") || undefined,
      status: (() => {
        const sv = qs.get("status");
        if (!sv || sv === "all") return undefined;
        return /^\d+$/.test(sv) ? Number(sv) : undefined;
      })(),
    };

    setOrderId(initParams.orderNumber || "");
    setMonth(initParams.createdAt || "");
    setMemberName(initParams.memberName || "");
    setPickupMethod(qs.get("deliveryMethod") || "all");
    setStatus(qs.get("status") || "all");

    setLastQuery(initParams);
    setPage(1);
    fetchOrders(initParams, 1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 🔎 條件變動即自動搜尋
  useEffect(() => {
    const rawParams = {
      orderNumber: orderId || undefined,
      createdAt: month || undefined,
      memberName: memberName || undefined,
      deliveryMethod: pickupMethod !== "all" ? pickupMethod : undefined,
      status: status !== "all" ? Number(status) : undefined,
    };
    const params = Object.fromEntries(Object.entries(rawParams).filter(([, v]) => v !== undefined));

    const queryString = new URLSearchParams({
      ...(params.orderNumber ? { orderNumber: params.orderNumber } : {}),
      ...(params.createdAt ? { createdAt: params.createdAt } : {}),
      ...(params.memberName ? { memberName: params.memberName } : {}),
      ...(pickupMethod ? { deliveryMethod: pickupMethod } : {}),
      ...(status ? { status } : {}),
    }).toString();
    window.history.pushState({}, "", `?${queryString}`);

    setLastQuery(params);
    setPage(1);

    const t = setTimeout(() => {
      fetchOrders(params, 1, limit);
    }, 350);
    return () => clearTimeout(t);
  }, [orderId, month, memberName, pickupMethod, status]);

  // ===== 分頁 =====
  const goPage = (p) => {
    const safe = Math.min(Math.max(1, p), totalPages);
    setPage(safe);
    fetchOrders(getLastQuery(), safe, limit);
  };

  const handleChangePageSize = (e) => {
    const newLimit = Number(e.target.value) || 20;
    setLimit(newLimit);
    setPage(1);
    fetchOrders(getLastQuery(), 1, newLimit);
  };

  // ===== 檢視明細 =====
  const handleView = async (order) => {
    try {
      setSelectedOrder({ ...order, productDetails: [] });
      setShowModal(true);
      const res = await axios.get(`${API_BASE}/t_SalesOrder/${order.id}`);
      // ★ PATCH: 以 API 欄位建構：原價=unitPrice，單件新價=subtotal，行總=subtotal*quantity
      const productDetails = (res.data.orderItems || []).map((item) => {
        const quantity = Number(item.quantity) || 0;
        const originalUnit = Number(item.unitPrice) || 0;     // 原價/每件
        const chosenUnit = Number(item.subtotal ?? originalUnit); // 新價/每件（API 的 subtotal）
        return {
          productName: item.productName || "未命名商品",
          quantity,
          unitPrice: originalUnit,
          chosenUnit,
          isGift: !!item.isGift,
        };
      });

      setSelectedOrder((prev) => ({
        ...prev,
        // 帶回明細與關鍵金額
        productDetails,
        totalAmount: Number(res.data.totalAmount ?? prev.totalAmount ?? 0),
        paymentAmount: Number(res.data.paymentAmount ?? prev.paymentAmount ?? 0),
        creditAmount: Number(res.data.creditAmount ?? prev.creditAmount ?? 0),
        offsetAmount: Number(res.data.offsetAmount ?? 0),
        deliveryMethod: toDeliveryLabel(res.data.deliveryMethod),
        deliveryMethodRaw: res.data.deliveryMethod,
        paymentMethod: res.data.paymentMethod ?? prev.paymentMethod,
        invoiceNumber: res.data.invoiceNumber ?? prev.invoiceNumber,
        carrierNumber: res.data.carrierNumber ?? prev.carrierNumber,
        shippingAddress: res.data.shippingAddress ?? prev.shippingAddress,
        operatorName: res.data.operatorName ?? prev.operatorName,
        createdAt: res.data.createdAt ?? prev.createdAt,
        member: res.data.memberName ?? prev.member,
        phone: res.data.mobile ?? prev.phone,
        store: res.data.storeName ?? prev.store,
        status: toStatusCode(res.data.status),
      }));
    } catch (error) {
      console.error("取得商品明細失敗", error);
      Swal.fire("錯誤", "載入商品明細失敗", "error");
    }
  };

  // ===== 編輯 =====
  const handleEdit = async (order) => {
    setSelectedOrder({
      ...order,
      productDetails: [],
      totalAmount: order.totalAmount || 0,
      paymentAmount: order.paymentAmount || 0,
      creditAmount: order.creditAmount || 0,
      offsetAmount: order.offsetAmount || 0,
    });
    setShowEditModal(true);

    try {
      const res = await axios.get(`${API_BASE}/t_SalesOrder/${order.id}`);
      const data = res.data;
      setSelectedOrder((prev) => ({
        ...prev,
        id: data.id,
        orderId: data.orderNumber,
        store: data.storeName || "林園門市",
        member: data.memberName || "未命名會員",
        phone: data.mobile || "",
        totalAmount: Number(data.totalAmount || 0),
        paymentAmount: Number(data.paymentAmount || 0),
        creditAmount: Number(data.creditAmount || 0),
        offsetAmount: Number(data.offsetAmount || 0),
        paymentMethod: data.paymentMethod || "現金",
        totalQuantity: data.totalQuantity || 0,
        status: toStatusCode(data.status),
        unifiedBusinessNumber: data.unifiedBusinessNumber || "",
        invoiceNumber: data.invoiceNumber || "",
        note: data.note || "",
        deliveryMethod: toDeliveryLabel(data.deliveryMethod),
        deliveryMethodRaw: data.deliveryMethod,
        carrierNumber: data.carrierNumber || "",
        createdAt: data.createdAt || "",
        operatorName: data.operatorName || "",
        pickupInfo: data.pickupInfo || "",
        signature: data.signature || "",
        signatureMime: data.signatureMime || "image/jpeg",
        mobile: data.mobile || "",
        shippingAddress: data.shippingAddress || "",
        // ★ PATCH: 單價顯示用（原價=unitPrice，新價=chosenUnit=API subtotal）
        productDetails: (data.orderItems || []).map((item) => {
          const quantity = Number(item.quantity) || 0;
          const originalUnit = Number(item.unitPrice) || 0;
          const chosenUnit = Number(item.subtotal ?? originalUnit);
          return {
            productName: item.productName || "未命名商品",
            quantity,
            unitPrice: originalUnit,
            chosenUnit,
            isGift: !!item.isGift,
          };
        }),
      }));
    } catch (error) {
      console.error("載入訂單資料失敗", error);
      Swal.fire("錯誤", "無法載入訂單資料", "error");
    }
  };

  // ===== 退貨按鈕 =====
  const handleReturnClick = (order) => {
    setShowEditModal(false);
    setSelectedOrder(order);
    setShowReturnModal(true);
  };

  const handleSubmitReturnOrder = async (payload) => {
    try {
      await axios.post(`${API_BASE}/t_ReturnOrder`, payload, {
        headers: { "Content-Type": "application/json" },
      });
      Swal.fire("成功", "退貨處理成功", "success");
      setShowReturnModal(false);
    } catch (error) {
      console.error(error);
      Swal.fire("錯誤", "退貨失敗", "error");
    }
  };

  // ===== 狀態流轉 =====
  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;
    if (selectedOrder.status === 0) {
      Swal.fire("錯誤", "已作廢的訂單不能進行此操作", "error");
      return;
    }
    const currentStatus = toStatusCode(selectedOrder.status);
    if (currentStatus === null) {
      Swal.fire("提示", "此筆訂單狀態無法辨識，請先修正狀態再操作", "info");
      return;
    }
    let nextStatus = currentStatus;
    switch (currentStatus) {
      case 1:
      case 2: nextStatus = 3; break;
      case 3: nextStatus = 4; break;
      case 4: nextStatus = 5; break;
      default: nextStatus = currentStatus;
    }

    const nextStepLabel = getNextStepLabel(currentStatus);
    const result = await Swal.fire({
      title: `確定要將訂單狀態變更為「${nextStepLabel}」嗎？`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "確認",
      cancelButtonText: "取消",
    });
    if (!result.isConfirmed) return;

    const payload = {
      id: selectedOrder.id,
      orderNumber: selectedOrder.orderId || "",
      storeId: selectedOrder.storeId || 1,
      memberId: selectedOrder.memberId || 1,
      totalAmount: Number(String(selectedOrder.totalAmount ?? 0).replace(/,/g, "")),
      totalQuantity: selectedOrder.totalQuantity || 1,
      status: nextStatus,
      unifiedBusinessNumber: selectedOrder.unifiedBusinessNumber || "",
      invoiceNumber: selectedOrder.invoiceNumber || "",
      note: selectedOrder.note || "",
      deliveryMethod: selectedOrder.deliveryMethodRaw ?? selectedOrder.deliveryMethod ?? "",
      dealerMemberId: selectedOrder.dealerMemberId || 0,
      paymentMethod: selectedOrder.paymentMethod || "現金",
      carrierNumber: selectedOrder.carrierNumber || "",
      createdAt: selectedOrder.createdAt || new Date().toISOString(),
      operatorName: selectedOrder.operatorName || "系統",
      pickupInfo: selectedOrder.pickupInfo || "",
      signature: selectedOrder.signature || "",
      mobile: selectedOrder.mobile || "0912345678",
    };

    try {
      await axios.put(`${API_BASE}/t_SalesOrder/${selectedOrder.id}`, payload);
      Swal.fire("更新成功", `訂單狀態已變更為「${nextStepLabel}」`, "success");
      setTableData((prev) =>
        prev.map((item) => (item.id === selectedOrder.id ? { ...item, status: nextStatus } : item))
      );
      setSelectedOrder((prev) => ({ ...prev, status: nextStatus }));
    } catch (error) {
      console.error("更新訂單狀態失敗：", error);
      Swal.fire("錯誤", "更新訂單狀態失敗，請稍後再試", "error");
    }
  };

  const handleCancelOrder = () => {
    if (!selectedOrder || !selectedOrder.orderId) {
      Swal.fire("錯誤", "未選擇有效訂單", "error");
      return;
    }
    Swal.fire({
      title: `確定要將訂單狀態更新為「已作廢」嗎？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "是的，作廢",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        setTableData((prev) =>
          prev.map((order) =>
            order.orderId === selectedOrder.orderId ? { ...order, prevStatus: order.status, status: 0 } : order
          )
        );
        setShowEditModal(false);
        setSelectedOrder(null);
        Swal.fire({ title: `訂單已更新為「已作廢」`, icon: "success", timer: 1500, showConfirmButton: false });
      }
    });
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedOrder(null);
  };

  const getSignatureSrc = (order) => {
    const sig = order?.signature;
    if (!sig) return null;
    if (typeof sig === "string" && sig.startsWith("data:image/")) return sig;
    const mime = order?.signatureMime || "image/jpeg";
    return `data:${mime};base64,${sig}`;
  };

  // ====== UI ======
  return (
    <>
      {/* 搜尋列 */}
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded align-items-center">
        <SearchField label="訂單編號" type="text" value={orderId} onChange={(e) => setOrderId(e.target.value)} />
        <SearchField label="訂單成立月份" type="month" value={month} onChange={(e) => setMonth(e.target.value)} />
        <SearchField label="會員名稱" type="text" value={memberName} onChange={(e) => setMemberName(e.target.value)} />

        <button className="btn btn-outline-secondary btn-sm" onClick={() => setShowMoreFilters((v) => !v)}>
          {showMoreFilters ? "收合進階" : "進階條件"}
        </button>

        {showMoreFilters && (
          <>
            <SearchField
              label="取貨方式"
              type="select"
              value={pickupMethod}
              onChange={(e) => setPickupMethod(e.target.value)}
              options={[
                { value: "all", label: "全部" },
                { value: "現場帶走", label: "現場帶走" },
                { value: "機場提貨", label: "機場提貨" },
                { value: "碼頭提貨", label: "碼頭提貨" },
                { value: "宅配到府", label: "宅配到府" },
                { value: "店到店", label: "店到店" },
                { value: "訂單自取", label: "訂單自取" },
                { value: "司機配送", label: "司機配送" },
              ]}
            />

            <SearchField
              label="狀態"
              type="select"
              value={status}
              onChange={(e) => setStatus(e.target.value)}
              options={[
                { value: "all", label: "全部" },
                { value: "0", label: "已作廢" },
                { value: "1", label: "賒帳" },
                { value: "2", label: "已付款" },
                { value: "3", label: "已出貨" },
                { value: "4", label: "配送中" },
                { value: "5", label: "已完成" },
              ]}
            />
          </>
        )}

        <div className="d-flex align-items-center ms-auto gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setOrderId("");
              setMonth("");
              setMemberName("");
              setPickupMethod("all");
              setStatus("all");
              setPage(1);
              setTotal(0);
              window.history.pushState({}, "", window.location.pathname);
              const empty = {};
              setLastQuery(empty);
              fetchOrders(empty, 1, limit);
            }}
          >
            清除搜尋
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div className="table-container position-relative" style={{ maxHeight: "73vh", overflowY: "auto" }}>
        {loading && (
          <div
            className="loading-message"
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "1.5rem", color: "#28a745" }}
          >
            資料載入中...
          </div>
        )}

        <table className="table text-center" style={{ fontSize: "1.2rem" }}>
          <thead className="table-light" style={{ borderTop: "1px solid #c5c6c7", position: "sticky", top: 0, background: "#d1ecf1", zIndex: 1 }}>
            <tr>
              <th scope="col"><input type="checkbox" className="w-5 h-5 text-gray-600" /></th>
              <th scope="col">訂單編號</th>
              <th scope="col">門市</th>
              <th scope="col">會員</th>
              <th scope="col">商品明細</th>
              <th scope="col">商品總金額</th>
              <th scope="col">取貨方式</th>
              <th scope="col">狀態</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item) => (
                <tr key={item.id}>
                  <td><input type="checkbox" className="w-5 h-5 text-gray-600" /></td>
                  <td>{item.orderId}</td>
                  <td>{item.store}</td>
                  <td>{item.member}</td>
                  <td>
                    <button className="check-button" onClick={() => handleView(item)}>檢視</button>
                  </td>
                  <td>{formatCurrency(item.totalAmount)}</td>
                  <td>{item.deliveryMethod}</td>
                  <td>{renderStatusBadge(item.status)}</td>
                  <td>
                    <button className="edit-button" onClick={() => handleEdit(item)}>操作</button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="12">無資料</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 表格底部 */}
      <div className="d-flex align-items-center justify-content-between mt-2 ps-3 pe-3 mb-3" >
        <div>
          <button className="pink-button me-3" style={{ fontSize: "1.2rem" }}>列印清單</button>
          <button className="pink-button" style={{ fontSize: "1.2rem" }}>列印明細</button>
        </div>

        <div className="d-flex align-items-center flex-wrap gap-2 justify-content-end">
          <div className="d-flex align-items-center">
            <span className="me-2">每頁</span>
            <select className="form-select form-select-sm" style={{ width: 100 }} value={limit} onChange={handleChangePageSize}>
              {[10, 20, 30, 50, 100].map((n) => (<option key={n} value={n}>{n}</option>))}
            </select>
            <span className="ms-2">筆</span>
          </div>

          <span className="ms-3 me-2">
            共 <strong>{total}</strong> 筆，第 <strong>{page}</strong> / {totalPages} 頁
          </span>
          <Pagination className="mb-0">
            <Pagination.First disabled={page <= 1} onClick={() => goPage(1)} />
            <Pagination.Prev disabled={page <= 1} onClick={() => goPage(page - 1)} />
            {(() => {
              const pages = [];
              const start = Math.max(1, page - 2);
              const end = Math.min(totalPages, start + 4);
              for (let p = start; p <= end; p++) {
                pages.push(
                  <Pagination.Item key={p} active={p === page} onClick={() => goPage(p)}>
                    {p}
                  </Pagination.Item>
                );
              }
              return pages;
            })()}
            <Pagination.Next disabled={page >= totalPages} onClick={() => goPage(page + 1)} />
            <Pagination.Last disabled={page >= totalPages} onClick={() => goPage(totalPages)} />
          </Pagination>
        </div>
      </div>

      {/* 檢視明細 Modal */}
      <Modal show={showModal} onHide={closeModal} dialogClassName="w-auto-modal" size="xl" centered>
        <Modal.Header closeButton><Modal.Title>商品明細</Modal.Title></Modal.Header>
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          <Modal.Body>
            <table className="table text-center" style={{ fontSize: "1.2rem" }}>
              <thead className="table-light" style={{ borderTop: "1px solid #c5c6c7", position: "sticky", top: 0, background: "#d1ecf1", zIndex: 1 }}>
                <tr>
                  <th>商品名稱</th>
                  <th>單價</th>
                  <th>數量</th>
                  <th>折扣後總額</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder?.productDetails?.length > 0 ? (
                  selectedOrder.productDetails.map((item, i) => {
                    const isGift = !!item.isGift;
                    const quantity = Number(item.quantity) || 0;
                    const originalUnit = Number(item.unitPrice) || 0;      // 原價/每件
                    const chosenUnit = isGift ? 0 : Number(item.chosenUnit ?? originalUnit); // 新價/每件
                    const lineTotal = isGift ? 0 : Math.round(chosenUnit * quantity);

                    return (
                      <tr key={i} style={isGift ? { background: "#fff7e6" } : undefined}>
                        <td>
                          {item.productName}
                          {isGift && <span className="badge bg-info ms-2">贈品</span>}
                        </td>
                        <td>
                          {isGift ? (
                            <>
                              {originalUnit > 0 && (
                                <div style={{ textDecoration: "line-through", color: "#888" }}>
                                  ${originalUnit.toLocaleString()}
                                </div>
                              )}
                              <div style={{ color: "#17a2b8", fontWeight: "bold" }}>贈送</div>
                            </>
                          ) : originalUnit !== chosenUnit ? (
                            <>
                              <span style={{ textDecoration: "line-through", color: "#888", marginRight: 6 }}>
                                ${originalUnit.toLocaleString()}
                              </span>
                              <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                                ${chosenUnit.toLocaleString()}
                              </span>
                            </>
                          ) : (
                            `$${originalUnit.toLocaleString()}`
                          )}
                        </td>
                        <td>{quantity}</td>
                        <td style={{ color: isGift ? "#17a2b8" : "#28a745", fontWeight: "bold" }}>
                          ${lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="4">無資料</td></tr>
                )}
              </tbody>
            </table>

            {selectedOrder?.productDetails?.length > 0 &&
              (() => {
                let originalTotal = 0;
                let discountedTotal = 0;
                selectedOrder.productDetails.forEach((item) => {
                  const q = Number(item.quantity) || 0;
                  const orig = Number(item.unitPrice) || 0;
                  const chosen = item.isGift ? 0 : Number(item.chosenUnit ?? orig);
                  originalTotal += orig * q;               // 折扣前金額
                  discountedTotal += Math.max(0, chosen) * q; // 折扣後金額 = subtotal(每件新價)*數量
                });
                const totalDiscount = Math.max(0, originalTotal - discountedTotal);

                return (
                  <div className="mt-3 p-3 d-flex justify-content-start bg-light border rounded" style={{ fontSize: "1.1rem", gap: "2rem" }}>
                    <div>共計商品：<strong>{selectedOrder?.productDetails?.length ?? 0} 項</strong></div>
                    <div>折扣前金額：<strong>${originalTotal.toLocaleString()}</strong> 元</div>
                    <div>折扣後金額：<strong style={{ color: "#28a745" }}>${discountedTotal.toLocaleString()}</strong> 元</div>
                    <div>總折扣金額：<strong style={{ color: "#dc3545" }}>-${totalDiscount.toLocaleString()}</strong> 元</div>
                  </div>
                );
              })()}
          </Modal.Body>
        </div>
        <Modal.Footer>
          <Button className="modalButton" variant="secondary" onClick={closeModal}>關閉</Button>
        </Modal.Footer>
      </Modal>

      {/* 編輯 Modal */}
      <Modal show={showEditModal} onHide={closeEditModal} size="xl" dialogClassName="w-auto-modal" centered>
        <Modal.Header closeButton><Modal.Title>編輯訂單</Modal.Title></Modal.Header>
        <Modal.Body>
          <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
            <table className="table text-center" style={{ fontSize: "1.2rem" }}>
              <thead className="table-light" style={{ borderTop: "1px solid #c5c6c7", position: "sticky", top: 0, background: "#d1ecf1", zIndex: 1 }}>
                <tr>
                  <th>商品名稱</th><th>單價</th><th>數量</th><th>折扣後總額</th>
                </tr>
              </thead>
              <tbody>
                {selectedOrder?.productDetails?.length > 0 ? (
                  selectedOrder.productDetails.map((item, i) => {
                    const isGift = !!item.isGift;
                    const quantity = Number(item.quantity) || 0;
                    const originalUnit = Number(item.unitPrice) || 0;
                    const chosenUnit = isGift ? 0 : Number(item.chosenUnit ?? originalUnit);
                    const lineTotal = isGift ? 0 : Math.round(chosenUnit * quantity);

                    return (
                      <tr key={i} style={isGift ? { background: "#fff7e6" } : undefined}>
                        <td>
                          {item.productName}
                          {isGift && <span className="badge bg-info ms-2">贈品</span>}
                        </td>
                        <td>
                          {isGift ? (
                            <>
                              {originalUnit > 0 && (
                                <div style={{ textDecoration: "line-through", color: "#888" }}>
                                  ${originalUnit.toLocaleString()}
                                </div>
                              )}
                              <div style={{ color: "#17a2b8", fontWeight: "bold" }}>贈送</div>
                            </>
                          ) : originalUnit !== chosenUnit ? (
                            <>
                              <span style={{ textDecoration: "line-through", color: "#888", marginRight: 6 }}>
                                ${originalUnit.toLocaleString()}
                              </span>
                              <span style={{ color: "#dc3545", fontWeight: "bold" }}>
                                ${chosenUnit.toLocaleString()}
                              </span>
                            </>
                          ) : (
                            `$${originalUnit.toLocaleString()}`
                          )}
                        </td>
                        <td>{quantity}</td>
                        <td style={{ color: isGift ? "#17a2b8" : "#28a745", fontWeight: "bold" }}>
                          ${lineTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan="4">無資料</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {selectedOrder && (() => {
            const { total, paid, due, change } = computeTotals(selectedOrder);
            const credit = Number(selectedOrder?.creditAmount ?? 0);
            const offset = Number(selectedOrder?.offsetAmount ?? 0);
            return (
              <div className="mt-3 p-3 d-flex justify-content-between bg-light border rounded" style={{ fontSize: "1rem", lineHeight: "1.7" }}>
                <div>
                  <div className="d-flex">
                    <div>共計商品：<strong>{selectedOrder?.productDetails?.length ?? 0} 項</strong></div>
                    <div className="ms-5">總計：<strong>{formatCurrency(total)} 元</strong></div>
                    <div className="ms-5">付款方式：<strong>{formatPaymentMethod(selectedOrder?.paymentMethod ?? selectedOrder?.pay)}</strong></div>
                    {/* ★ PATCH: 顯示賒帳金額（creditAmount） */}
                    <div className="ms-5">賒帳金額：<strong style={{ color: credit > 0 ? "#dc3545" : "#6c757d" }}>${formatCurrency(credit)} 元</strong></div>
                  </div>
                  <div className="d-flex mt-1">
                    <div>會員：<strong>{selectedOrder?.member || "未命名會員"}</strong></div>
                    <div className="ms-5">手機：<strong>{selectedOrder?.phone || "—"}</strong></div>
                    <div className="ms-5">配送方式：<strong>{selectedOrder?.deliveryMethod || "—"}</strong></div>
                  </div>

                  {/* ★ PATCH: 付款金額 / 找零 or 賒帳（由總計與付款直接比） */}
                  <div className="d-flex mt-1">
                    <div>付款金額：<strong style={{ color: "#28a745" }}>${formatCurrency(paid)} 元</strong></div>
                    {paid >= total ? (
                      <div className="ms-5">找零：<strong>${formatCurrency(change)} 元</strong></div>
                    ) : (
                      <div className="ms-5">賒帳：<strong style={{ color: "#dc3545" }}>${formatCurrency(total - paid)} 元</strong></div>
                    )}
                  </div>

                  {/* ★ PATCH: 點數折抵 offsetAmount */}
                  <div className="d-flex mt-1">
                    <div>點數折抵：<strong style={{ color: "#0d6efd" }}>${formatCurrency(offset)} 元</strong></div>
                  </div>

                  <div className="d-flex mt-1">
                    <div>發票號碼：<strong>{selectedOrder?.invoiceNumber || "無"}</strong></div>
                    <div className="ms-5">載具編號：<strong>{selectedOrder?.carrierNumber || "無"}</strong></div>
                  </div>
                  <div className="d-flex mt-1">
                    <div>郵寄地址：<strong>{selectedOrder?.shippingAddress || "無"}</strong></div>
                  </div>
                  <div className="d-flex mt-1">
                    <div>
                      訂單成立：
                      <strong>
                        {selectedOrder?.createdAt?.split("T")[0] || "無"}
                        <span className="ms-1">（{selectedOrder?.store || "未知門市"}）</span>
                      </strong>
                    </div>
                    <div className="ms-5">操作員：<strong>{selectedOrder?.operatorName || "無"}</strong></div>
                  </div>
                  <div className="d-flex mt-1">
                    <div>
                      取貨資訊：
                      <strong>
                        {(selectedOrder?.pickupInfo && selectedOrder.pickupInfo.trim()) || "無"}
                        {selectedOrder?.deliveryMethod && `（${selectedOrder.deliveryMethod}）`}
                      </strong>
                    </div>
                  </div>
                  <div className="mt-3">
                    <button className="check-button fw-bold" onClick={() => handleReturnClick(selectedOrder)}>退貨</button>
                    <button className="delete-button mx-4 fw-bold" onClick={handleCancelOrder}>作廢</button>
                    <button className="pink-button" style={{ fontSize: "1rem" }}>列印明細</button>
                    <Button
                      variant="success"
                      className="fw-bold ms-4"
                      onClick={handleCompleteOrder}
                      disabled={selectedOrder?.status === 0 || selectedOrder?.status === 5}
                    >
                      {getNextStepLabel(selectedOrder?.status)}
                    </Button>
                  </div>
                </div>

                <div className="signature-container p-3 border rounded d-flex align-items-center">
                  <span className="me-2">簽名紀錄：</span>
                  <div className="signature-box border rounded overflow-hidden d-flex align-items-center justify-content-center" style={{ width: 130, height: 120, background: "#f8f9fa" }}>
                    {getSignatureSrc(selectedOrder) ? (
                      <img src={getSignatureSrc(selectedOrder)} alt="簽名圖片" style={{ width: "100%", height: "100%", objectFit: "contain" }} />
                    ) : (
                      <span style={{ color: "#9ca3af" }}>無簽名</span>
                    )}
                  </div>
                </div>
              </div>
            );
          })()}
        </Modal.Body>
        <Modal.Footer></Modal.Footer>
      </Modal>

      {/* 退貨 Modal */}
      <ReturnOrderForm
        show={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        orderData={selectedOrder}
        onSubmit={handleSubmitReturnOrder}
      />
    </>
  );
}
