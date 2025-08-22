import { useState, useEffect } from "react";
import axios from "axios";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組
import { Modal, Button } from "react-bootstrap"; // 使用彈出框套件
import Swal from "sweetalert2";
import ReturnOrderForm from "./ReturnOrderModal"; // 引入退貨表單

export default function Sales() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupMethod, setPickupMethod] = useState("all");
  const [status, setStatus] = useState("all");

  const [tableData, setTableData] = useState([]); // 僅供顯示與搜尋用
  const [originalData, setOriginalData] = useState([]); // /保留全部原始資料
  const [selectedOrder, setSelectedOrder] = useState(null); //記錄選到哪筆
  const [showModal, setShowModal] = useState(false); //檢視按鈕彈出框
  const [showEditModal, setShowEditModal] = useState(false); //編輯按鈕彈出框
  const [month, setMonth] = useState(""); // 存儲月份查詢條件
  const [memberName, setMemberName] = useState(""); // 存儲會員名稱查詢條件
  const [showReturnModal, setShowReturnModal] = useState(false);

  const [loading, setLoading] = useState(true); // 控制載入狀態

  const handleReturnClick = (order) => {
    setShowEditModal(false); // 關閉編輯彈出框
    setSelectedOrder(order);
    setShowReturnModal(true);
  };

  // 文字/字串數字/數字 → 統一轉成數字代碼
  const toStatusCode = (raw) => {
    if (typeof raw === "number" && !Number.isNaN(raw)) return raw;
    if (typeof raw === "string") {
      if (/^\d+$/.test(raw)) return Number(raw);
      const map = {
        已作廢: 0,
        賒帳: 1,
        已付款: 2,
        已出貨: 3,
        配送中: 4,
        已完成: 5,
      };
      if (raw in map) return map[raw];
    }
    return null; // 無法辨識
  };

  // 根據狀態碼自動顯示對應的狀態文字
  const renderStatusBadge = (statusCode) => {
    const s = toStatusCode(statusCode);
    if (s === null)
      return <span className="badge bg-secondary fs-6">未知</span>;
    switch (s) {
      case 5:
        return <span className="badge bg-success fs-6">已完成</span>;
      case 4:
        return <span className="badge bg-warning text-dark fs-6">配送中</span>;
      case 3:
        return <span className="badge bg-primary fs-6">已出貨</span>;
      case 1:
        return <span className="badge bg-warning text-dark fs-6">賒帳</span>;
      case 2:
        return (
          <span className="badge bg-secondary text-light fs-6">已付款</span>
        );
      case 0:
        return <span className="badge bg-danger fs-6">已作廢</span>;
      default:
        return <span className="badge bg-secondary fs-6">未知</span>;
    }
  };

  // 以後端回傳為主；若後端沒回再退回用明細推算
  const calculatedCreditAmount =
    selectedOrder?.creditAmount != null
      ? Number(selectedOrder.creditAmount)
      : Math.max(
          0,
          (selectedOrder?.productDetails?.reduce((sum, item) => {
            const unitPrice = Number(item.unitPrice) || 0;
            const quantity = Number(item.quantity) || 0;
            const discount = Number(item.discountedAmount ?? 0) || 0;
            return sum + (unitPrice * quantity - discount);
          }, 0) || 0) - Number(selectedOrder?.paymentAmount || 0)
        );

  // 格式化金額（安全處理）
  const formatCurrency = (n) => Number(n || 0).toLocaleString();

  // 把 paymentMethod（0/1/2/3 或字串）轉中文
  const formatPaymentMethod = (pm) => {
    if (pm === null || pm === undefined) return "—";
    // 數字或數字字串
    const code =
      typeof pm === "number" ? pm : /^\d+$/.test(pm) ? Number(pm) : null;
    if (code !== null) return ["現金", "匯款", "支票", "刷卡"][code] + "付款";
    // 後端若已是中文
    if (typeof pm === "string") {
      if (/現金/.test(pm)) return "現金付款";
      if (/匯款/.test(pm)) return "匯款";
      if (/支票/.test(pm)) return "支票";
      if (/刷卡|信用卡/.test(pm)) return "刷卡";
      return pm;
    }
    return "—";
  };

  // 當前狀態（數字）必須轉換為數字，避免傳入 NaN
  const getNextStepLabel = (status) => {
    const numericStatus = toStatusCode(status);
    if (numericStatus === null) return "下一步";

    switch (numericStatus) {
      case 1:
        return "確認出貨"; // 賒帳後直接出貨
      case 2:
        return "確認出貨";
      case 3:
        return "確認配送";
      case 4:
        return "完成訂單";
      case 5:
        return "已完成";
      case 0:
        return "復原訂單";
      default:
        return "下一步";
    }
  };

  // 封裝「折扣後總價」邏輯
  const calculateDiscountedTotal = (unitPrice, quantity, discount = 0) => {
    return unitPrice * quantity - discount;
  };

  const computeTotals = (o) => {
    const paid = Number(o?.paymentAmount ?? 0);

    const itemsTotal = o?.productDetails?.length
      ? o.productDetails.reduce((sum, it) => {
          const unit = Number(it.unitPrice) || 0;
          const qty = Number(it.quantity) || 0;
          const disc = Number(it.discountedAmount ?? 0) || 0;
          return sum + (unit * qty - disc);
        }, 0)
      : null;

    const total = Number(itemsTotal != null ? itemsTotal : (o?.totalAmount ?? 0));
    const due = Math.max(0, total - paid);    // 應收餘額（賒帳）
    const change = Math.max(0, paid - total); // 找零
    return { total, paid, due, change };
  };

  // 把後端一筆訂單 → 轉成前端列表用的欄位（統一命名）
const mapApiOrder = (order) => ({
  id: order.id,
  orderId: order.orderNumber,
  store: order.storeName ?? "馬公門市",
  member: order.memberName ?? order.memberIdName ?? "未命名會員",
  phone: order.mobile ?? "",
  totalAmount: Number(order.totalAmount ?? 0),          // 列表顯示用
  paymentMethod: order.paymentMethod ?? "",             // 可能是「現金」或代碼
  carrierNumber: order.carrierNumber || "無",
  invoiceNumber: order.invoiceNumber || "",
  taxId: order.unifiedBusinessNumber || "無",
  pickupTime: order.pickupInfo?.match(/時間:(.*)/)?.[1] ?? "無",
  deliveryMethod: order.deliveryMethod || "無",
  operatorName: order.operatorName ?? "操作員A",
  createdAt: order.createdAt ?? "",
  status: toStatusCode(order.status),                   // 標準化狀態
});

  const handleSearch = () => {
    const rawParams = {
      orderNumber: orderId || undefined,
      createdAt: month || undefined,
      memberName: memberName || undefined,
      deliveryMethod: pickupMethod !== "all" ? pickupMethod : undefined,
      status: status !== "all" ? Number(status) : undefined, // 確保 status 為數字
    };

    // ✅ 過濾 undefined 參數
    const params = Object.fromEntries(
      Object.entries(rawParams).filter(([_, v]) => v !== undefined)
    );

    // ✅ 更新 URL 查詢參數
    const queryString = new URLSearchParams(params).toString();
    window.history.pushState({}, "", `?${queryString}`);

    setLoading(true); // 開始載入資料

    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder", { params })
      .then((res) => {
        const raw = res.data;

        raw.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

         const mapped = raw.map(mapApiOrder);

        setOriginalData(mapped);
        setTableData(mapped);
        setLoading(false); // 資料載入完成，結束載入狀態
      })
      .catch((err) => {
        console.error("搜尋失敗", err);
        Swal.fire("錯誤", "搜尋訂單失敗，請稍後再試", "error");
        setLoading(false); // 資料載入失敗，結束載入狀態
      });
  };

  // 檢視訂單彈出框
  const handleView = async (order) => {
    try {
      setSelectedOrder({ ...order, productDetails: [] });
      setShowModal(true);

      const res = await axios.get(
        `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/${order.id}`
      );

      const productDetails = res.data.orderItems.map((item) => {
        const quantity = Number(item.quantity) || 0;
        const unitPrice = Number(item.unitPrice) || 0;
        return {
          productName: item.productName || "未命名商品",
          quantity,
          unitPrice,
          discountedAmount: Number(item.discountedAmount ?? 0) || 0,
          subtotal: Number(item.subtotal ?? unitPrice * quantity), // ← 保障有小計
          isGift: !!item.isGift, // ← 帶入贈品旗標
        };
      });

      setSelectedOrder((prev) => ({
        ...prev,
        productDetails,
      }));
    } catch (error) {
      console.error("取得商品明細失敗", error);
      Swal.fire("錯誤", "載入商品明細失敗", "error");
    }
  };

  // 編輯訂單彈出框
  const handleEdit = async (order) => {
    setSelectedOrder({
      ...order,
      productDetails: [],
      totalAmount: order.totalAmount || 0,
      paymentAmount: order.paymentAmount || 0,
      creditAmount: order.creditAmount || 0,
    });

    setShowEditModal(true);

    try {
      const res = await axios.get(
        `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/${order.id}`
      );

      const data = res.data;

      // 把 API 回傳的欄位全部放入 selectedOrder
      setSelectedOrder((prev) => ({
        ...prev,
        id: data.id,
        orderId: data.orderNumber,
        store: data.storeName || "林園門市",
        member: data.memberName || "未命名會員",
        phone: data.mobile || "",
        totalAmount: data.totalAmount || 0,
        paymentAmount: data.paymentAmount || 0,
        creditAmount: data.creditAmount || 0,
        paymentMethod: data.paymentMethod || "現金",
        totalQuantity: data.totalQuantity || 0,
        status: toStatusCode(data.status),
        unifiedBusinessNumber: data.unifiedBusinessNumber || "",
        invoiceNumber: data.invoiceNumber || "",
        note: data.note || "",
        deliveryMethod: data.deliveryMethod || "",
        carrierNumber: data.carrierNumber || "",
        createdAt: data.createdAt || "",
        operatorName: data.operatorName || "",
        pickupInfo: data.pickupInfo || "",
        signature: data.signature || "",
        signatureMime: data.signatureMime || "image/jpeg",
        mobile: data.mobile || "",
        shippingAddress: data.shippingAddress || "",

        // 商品明細
        productDetails: data.orderItems.map((item) => {
          const quantity = Number(item.quantity) || 0;
          const unitPrice = Number(item.unitPrice) || 0;
          return {
            productName: item.productName || "未命名商品",
            quantity,
            unitPrice,
            discountedAmount: Number(item.discountedAmount ?? 0) || 0,
            subtotal: Number(item.subtotal ?? unitPrice * quantity), // 原價小計保底
            isGift: !!item.isGift, // 贈品旗標
          };
        }),
      }));
    } catch (error) {
      console.error("載入訂單資料失敗", error);
      Swal.fire("錯誤", "無法載入訂單資料", "error");
    }
  };
  useEffect(() => {
    // 當 selectedOrder 更新時觸發這個 effect
    if (selectedOrder) {
      console.log("當前狀態：", selectedOrder.status); // 用來檢查狀態的輸出
    }
  }, [selectedOrder]); // 依賴 selectedOrder，當其改變時執行

  // 關閉彈出框
  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  // 將後端回來的簽名（可能是純 base64 或已經有 data: 前綴）轉成 <img> 可用的 src
  const getSignatureSrc = (order) => {
    const sig = order?.signature;
    if (!sig) return null;
    if (typeof sig === "string" && sig.startsWith("data:image/")) {
      return sig; // 已經是 data:URL 了
    }
    const mime = order?.signatureMime || "image/jpeg";
    return `data:${mime};base64,${sig}`; // 把純 base64 補前綴
  };

  // 顯示對應的操作按鈕
  const handleCompleteOrder = async () => {
    if (!selectedOrder) return;

    // 檢查訂單是否已作廢
    if (selectedOrder.status === 0) {
      Swal.fire("錯誤", "已作廢的訂單不能進行此操作", "error");
      return; // 禁止進行後續操作
    }
    const currentStatus = toStatusCode(selectedOrder.status);
    if (currentStatus === null) {
      Swal.fire(
        "提示",
        "此筆訂單狀態無法辨識，請先在後台修正狀態再操作",
        "info"
      );
      return;
    }
    // ✅ 新規則：賒帳(1) → 已出貨(3)，跳過已付款(2)
    let nextStatus = currentStatus;
    switch (currentStatus) {
      case 1:
        nextStatus = 3;
        break; // 賒帳 → 已出貨
      case 2:
        nextStatus = 3;
        break; // 仍允許已付款 → 已出貨
      case 3:
        nextStatus = 4;
        break; // 已出貨 → 配送中
      case 4:
        nextStatus = 5;
        break; // 配送中 → 已完成
      default:
        nextStatus = currentStatus; // 0/5 等保持不變
    }

    // 顯示 SweetAlert 確認框
    const nextStepLabel = getNextStepLabel(currentStatus); // 獲取對應的操作文字
    const result = await Swal.fire({
      title: `確定要將訂單狀態變更為「${nextStepLabel}」嗎？`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "確認",
      cancelButtonText: "取消",
    });

    if (!result.isConfirmed) return; // 使用者未確認，退出

    // 更新訂單狀態
    const payload = {
      id: selectedOrder.id,
      orderNumber: selectedOrder.orderId || "",
      storeId: selectedOrder.storeId || 1,
      memberId: selectedOrder.memberId || 1,
      totalAmount: Number(
        selectedOrder.totalAmount?.toString().replace(/,/g, "") || 0
      ),
      totalQuantity: selectedOrder.totalQuantity || 1,
      status: nextStatus, // 設定下一步狀態
      unifiedBusinessNumber: selectedOrder.unifiedBusinessNumber || "",
      invoiceNumber: selectedOrder.invoiceNumber || "",
      note: selectedOrder.note || "",
      deliveryMethod: selectedOrder.deliveryMethod || "",
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
      // 將新的狀態更新至後端
      await axios.put(
        `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/${selectedOrder.id}`,
        payload
      );

      // 成功提示
      Swal.fire("更新成功", `訂單狀態已變更為「${nextStepLabel}」`, "success");

      // 更新前端資料，確保 UI 正確顯示
      setTableData((prev) =>
        prev.map((item) =>
          item.id === selectedOrder.id ? { ...item, status: nextStatus } : item
        )
      );

      // 更新 selectedOrder 的狀態以觸發重新渲染
      setSelectedOrder((prev) => ({
        ...prev,
        status: nextStatus, // 更新狀態
      }));
    } catch (error) {
      console.error("更新訂單狀態失敗：", error);
      Swal.fire("錯誤", "更新訂單狀態失敗，請稍後再試", "error");
    }
  };

  // `getNextStatus` 邏輯可以保留，依照原邏輯遞進狀態
  const getNextStatus = (currentStatus) => {
    const STATUS_FLOW = ["賒帳", "已付款", "已出貨", "配送中", "已完成"];
    const index = STATUS_FLOW.indexOf(currentStatus); // 找到當前狀態在陣列中的位置

    if (index >= 0 && index < STATUS_FLOW.length - 1) {
      return STATUS_FLOW[index + 1]; // 返回下一個狀態
    }

    return currentStatus; // 如果已經是「已完成」，則返回原狀態
  };

  const handleCancelOrder = () => {
    // 先檢查是否選擇了訂單
    if (!selectedOrder || !selectedOrder.orderId) {
      Swal.fire("錯誤", "未選擇有效訂單", "error");
      return;
    }

    // 顯示確認框
    Swal.fire({
      title: `確定要將訂單狀態更新為「已作廢」嗎？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "是的，作廢",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        // 更新訂單狀態為「已作廢」
        setTableData((prev) =>
          prev.map((order) => {
            if (order.orderId === selectedOrder.orderId) {
              return { ...order, prevStatus: order.status, status: 0 }; // 更新為「作廢」
            }
            return order;
          })
        );

        // 清空選擇的訂單並關閉編輯彈框
        setShowEditModal(false);
        setSelectedOrder(null);

        // 顯示成功訊息
        Swal.fire({
          title: `訂單已更新為「已作廢」`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  // 顯示確認對話框
  const handleSubmitReturnOrder = async (payload) => {
    try {
      await axios.post(
        "https://yupinjia.hyjr.com.tw/api/api/t_ReturnOrder",
        payload,
        { headers: { "Content-Type": "application/json" } }
      );
      Swal.fire("成功", "退貨處理成功", "success");
      setShowReturnModal(false);
    } catch (error) {
      console.error(error);
      Swal.fire("錯誤", "退貨失敗", "error");
    }
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedOrder(null);
  };

  // 載入訂單資料
  useEffect(() => {
    setLoading(true); // 開始載入資料

    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder")
      .then((res) => {
        const raw = res.data;

        // 排序資料
        raw.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

        const mapped = raw.map(mapApiOrder);

        setOriginalData(mapped);
        setTableData(mapped);
        setLoading(false); // 資料載入完成，結束載入狀態
      })
      .catch((err) => {
        console.error("載入訂單失敗", err);
        setLoading(false); // 資料載入失敗，結束載入狀態
      });
  }, []);

  useEffect(() => {
    // 從 URL 查詢參數中讀取搜尋條件
    const queryParams = new URLSearchParams(window.location.search);

    setOrderId(queryParams.get("orderNumber") || "");
    setPickupTime(queryParams.get("pickupTime") || "");
    setPickupMethod(queryParams.get("deliveryMethod") || "all");
    setStatus(queryParams.get("status") || "all");
    setMonth(queryParams.get("createdAt") || "");
    setMemberName(queryParams.get("memberName") || "");
  }, []);

  return (
    <>
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
        {/* 訂單編號 */}
        <SearchField
          label="訂單編號"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />

        {/* 訂單成立月份 */}
        <SearchField
          label="訂單成立月份"
          type="month"
          value={month}
          onChange={(e) => setMonth(e.target.value)}
        />

        {/* 會員名稱查詢 */}
        <SearchField
          label="會員名稱"
          type="text"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
        />

        {/* 取貨方式 */}
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
          ]}
        />

        {/* 訂單狀態 */}
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

        {/* 搜尋按鈕 */}
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
        <button
          className="btn btn-outline-secondary"
          onClick={() => {
            setOrderId("");
            setMonth("");
            setMemberName("");
            setPickupMethod("all");
            setStatus("all");
            setTableData(originalData);

            // ✅ 清除 URL 查詢參數
            window.history.pushState({}, "", window.location.pathname);
          }}
        >
          清除搜尋
        </button>
      </div>
      {/* 表格 */}
      <div
        className="table-container"
        style={{
          maxHeight: "73vh", // 根據你想要的高度調整
          overflowY: "auto",
        }}
      >
        {/* 資料載入中提示 */}
        {loading && (
          <div
            className="loading-message"
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "1.5rem",
              color: "#28a745",
            }}
          >
            資料載入中...
          </div>
        )}
        <table className="table text-center" style={{ fontSize: "1.2rem" }}>
          <thead
            className="table-light"
            style={{
              borderTop: "1px solid #c5c6c7",
              position: "sticky",
              top: 0,
              background: "#d1ecf1",
              zIndex: 1,
            }}
          >
            <tr>
              <th scope="col">
                {" "}
                <input type="checkbox" className="w-5 h-5 text-gray-600" />
              </th>
              <th scope="col">訂單編號</th>
              <th scope="col">門市</th>
              <th scope="col">會員</th>
              <th scope="col">商品明細</th>
              <th scope="col">商品總金額</th>
              {/* <th scope="col">商品總數</th> */}
              <th scope="col">取貨方式</th>
              <th scope="col">狀態</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item) => (
                <tr key={item.id}>
                  <td>
                    {" "}
                    <input type="checkbox" className="w-5 h-5 text-gray-600" />
                  </td>
                  <td>{item.orderId}</td>
                  <td>{item.store}</td>
                  <td>{item.member}</td>
                  <td>
                    <button
                      className="check-button"
                      onClick={() => handleView(item)}
                    >
                      檢視
                    </button>
                  </td>
                  <td>{item.totalAmount.toLocaleString()}</td>
                  {/* <td>{item.totalCount}</td> */}
                  <td>{item.deliveryMethod}</td>
                  <td>{renderStatusBadge(item.status)}</td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(item)}
                    >
                      操作
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan="12">無資料</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
      <div className="d-flex align-items-center mt-2 ps-3">
        {/* <input type="checkbox" className="w-5 h-5 text-gray-600 me-2" /> */}
        {/* <h5 className="fw-bold mb-0 me-3">全選</h5> */}
        <button className="pink-button me-3" style={{ fontSize: "1.2rem" }}>
          列印清單
        </button>
        <button className="pink-button" style={{ fontSize: "1.2rem" }}>
          列印明細
        </button>
      </div>

      <Modal
        show={showModal}
        onHide={closeModal}
        dialogClassName="w-auto-modal"
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>商品明細</Modal.Title>
        </Modal.Header>
        <div style={{ maxHeight: "60vh", overflowY: "auto" }}>
          <Modal.Body>
            <table className="table text-center" style={{ fontSize: "1.2rem" }}>
              <thead
                className="table-light"
                style={{
                  borderTop: "1px solid #c5c6c7",
                  position: "sticky",
                  top: 0,
                  background: "#d1ecf1",
                  zIndex: 1,
                }}
              >
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
                    const unitPrice = Number(item.unitPrice) || 0;
                    const subtotal = Number(
                      item.subtotal ?? unitPrice * quantity
                    );
                    const discountedAmount = Number(item.discountedAmount) || 0;
                    const discountedTotal = Math.max(
                      0,
                      subtotal - discountedAmount
                    );

                    return (
                      <tr
                        key={i}
                        style={isGift ? { background: "#fff7e6" } : undefined} // ← 贈品列淡色
                      >
                        <td>
                          {item.productName}
                          {isGift && (
                            <span className="badge bg-info ms-2">贈品</span> // ← 贈品徽章
                          )}
                        </td>

                        <td>
                          {isGift ? (
                            <>
                              <div
                                style={{
                                  textDecoration: "line-through",
                                  color: "#888",
                                }}
                              >
                                ${unitPrice.toLocaleString()}
                              </div>
                              <div
                                style={{ color: "#17a2b8", fontWeight: "bold" }}
                              >
                                贈送
                              </div>
                            </>
                          ) : discountedAmount > 0 ? (
                            <>
                              <div
                                style={{
                                  textDecoration: "line-through",
                                  color: "#888",
                                }}
                              >
                                ${unitPrice.toLocaleString()}
                              </div>
                              <div
                                style={{ color: "#dc3545", fontWeight: "bold" }}
                              >
                                $
                                {Math.round(
                                  discountedTotal / Math.max(1, quantity)
                                ).toLocaleString()}
                              </div>
                            </>
                          ) : (
                            `$${unitPrice.toLocaleString()}`
                          )}
                        </td>

                        <td>{quantity}</td>

                        <td
                          style={{
                            color: isGift ? "#17a2b8" : "#28a745",
                            fontWeight: "bold",
                          }}
                        >
                          ${discountedTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4">無資料</td>
                  </tr>
                )}
              </tbody>
            </table>

            {selectedOrder?.productDetails?.length > 0 &&
              (() => {
                let originalTotal = 0;
                let discountedTotal = 0;

                selectedOrder.productDetails.forEach((item) => {
                  const unitPrice = Number(item.unitPrice) || 0;
                  const quantity = Number(item.quantity) || 0;
                  const discountedAmount = Number(item.discountedAmount) || 0;

                  // 計算折扣前金額
                  originalTotal += unitPrice * quantity;

                  // 計算折扣後金額
                  discountedTotal += unitPrice * quantity - discountedAmount;
                });

                const totalDiscount = originalTotal - discountedTotal; // 計算總折扣金額

                return (
                  <div
                    className="mt-3 p-3 d-flex justify-content-start bg-light border rounded"
                    style={{ fontSize: "1.1rem", gap: "2rem" }}
                  >
                    <div>
                      共計商品：
                      <strong>
                        {selectedOrder?.productDetails?.length ?? 0} 項
                      </strong>
                    </div>
                    <div>
                      折扣前金額：
                      <strong>${originalTotal.toLocaleString()}</strong> 元
                    </div>
                    <div>
                      折扣後金額：
                      <strong style={{ color: "#28a745" }}>
                        ${discountedTotal.toLocaleString()}
                      </strong>{" "}
                      元
                    </div>
                    <div>
                      總折扣金額：
                      <strong style={{ color: "#dc3545" }}>
                        -${totalDiscount.toLocaleString()}
                      </strong>{" "}
                      元
                    </div>
                  </div>
                );
              })()}
          </Modal.Body>
        </div>
        <Modal.Footer>
          <Button
            className="modalButton"
            variant="secondary"
            onClick={closeModal}
          >
            關閉
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 編輯按鈕的彈出框 */}
      <Modal
        show={showEditModal}
        onHide={closeEditModal}
        size="xl"
        dialogClassName="w-auto-modal"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>編輯訂單</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <div style={{ maxHeight: "50vh", overflowY: "auto" }}>
            <table className="table text-center" style={{ fontSize: "1.2rem" }}>
              <thead
                className="table-light"
                style={{
                  borderTop: "1px solid #c5c6c7",
                  position: "sticky",
                  top: 0,
                  background: "#d1ecf1",
                  zIndex: 1,
                }}
              >
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
                    const unitPrice = Number(item.unitPrice) || 0;
                    const subtotal = Number(
                      item.subtotal ?? unitPrice * quantity
                    );
                    const discountedAmount = Number(item.discountedAmount) || 0;
                    const discountedTotal = Math.max(
                      0,
                      subtotal - discountedAmount
                    );

                    return (
                      <tr
                        key={i}
                        style={isGift ? { background: "#fff7e6" } : undefined} // ← 贈品列淡色
                      >
                        <td>
                          {item.productName}
                          {isGift && (
                            <span className="badge bg-info ms-2">贈品</span> // ← 贈品徽章
                          )}
                        </td>

                        <td>
                          {isGift ? (
                            <>
                              <div
                                style={{
                                  textDecoration: "line-through",
                                  color: "#888",
                                }}
                              >
                                ${unitPrice.toLocaleString()}
                              </div>
                              <div
                                style={{ color: "#17a2b8", fontWeight: "bold" }}
                              >
                                贈送
                              </div>
                            </>
                          ) : discountedAmount > 0 ? (
                            <>
                              <div
                                style={{
                                  textDecoration: "line-through",
                                  color: "#888",
                                }}
                              >
                                ${unitPrice.toLocaleString()}
                              </div>
                              <div
                                style={{ color: "#dc3545", fontWeight: "bold" }}
                              >
                                $
                                {Math.round(
                                  discountedTotal / Math.max(1, quantity)
                                ).toLocaleString()}
                              </div>
                            </>
                          ) : (
                            `$${unitPrice.toLocaleString()}`
                          )}
                        </td>

                        <td>{quantity}</td>

                        <td
                          style={{
                            color: isGift ? "#17a2b8" : "#28a745",
                            fontWeight: "bold",
                          }}
                        >
                          ${discountedTotal.toLocaleString()}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan="4">無資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
          {selectedOrder && (() => {
  const { total, paid, due, change } = computeTotals(selectedOrder);

  return (
    <div className="mt-3 p-3 d-flex justify-content-between bg-light border rounded" style={{ fontSize: "1rem", lineHeight: "1.7" }}>
      <div>
        <div className="d-flex">
          <div>
            共計商品：
            <strong>{selectedOrder?.productDetails?.length ?? 0} 項</strong>
          </div>

          <div className="ms-5">
            總計：
            <strong>{formatCurrency(total)} 元</strong>
          </div>

          <div className="ms-5">
            付款方式：
            <strong>
              {formatPaymentMethod(selectedOrder?.paymentMethod ?? selectedOrder?.pay)}
              {due > 0 ? "（賒帳）" : ""}
            </strong>
          </div>

          {due > 0 && (
            <div className="ms-5">
              賒帳金額：
              <strong style={{ color: "#dc3545" }}>
                ${formatCurrency(due)} 元
              </strong>
            </div>
          )}
        </div>

        {/* 第二行 */}
        <div className="d-flex mt-1">
          <div>
            會員：<strong>{selectedOrder?.member || "未命名會員"}</strong>
          </div>
          <div className="ms-5">
            手機：<strong>{selectedOrder?.phone || "—"}</strong>
          </div>
          <div className="ms-5">
            配送方式：<strong>{selectedOrder?.deliveryMethod || "—"}</strong>
          </div>
        </div>

        {/* 第三行 - 付款金額與找零 / 餘額 */}
        {paid > 0 && toStatusCode(selectedOrder?.status) !== 1 && (
          <div className="d-flex mt-1">
            <div>
              付款金額：
              <strong style={{ color: "#28a745" }}>
                ${formatCurrency(paid)} 元
              </strong>
            </div>
            <div className="ms-5">
              {formatPaymentMethod(selectedOrder?.paymentMethod).includes("現金")
                ? `找零：$${formatCurrency(change)} 元`
                : `餘額：$${formatCurrency(due)} 元`}
            </div>
          </div>
        )}

                    {/* 其他欄位保持原樣 */}

                    <div className="d-flex mt-1">
                      <div>
                        發票號碼：
                        <strong>{selectedOrder?.invoiceNumber || "無"}</strong>
                      </div>
                      <div className="ms-5">
                        載具編號：
                        <strong>{selectedOrder?.carrierNumber || "無"}</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        郵寄地址：
                        <strong>
                          {selectedOrder?.shippingAddress || "無"}
                        </strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        訂單成立：
                        <strong>
                          {selectedOrder?.createdAt?.split("T")[0] || "無"}
                          <span className="ms-1">
                            ({selectedOrder?.store || "未知門市"})
                          </span>
                        </strong>
                      </div>
                      <div className="ms-5">
                        操作員：
                        <strong>{selectedOrder?.operatorName || "無"}</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        取貨資訊：
                        <strong>
                          {(selectedOrder?.pickupInfo &&
                            selectedOrder.pickupInfo.trim()) ||
                            "無"}
                          {selectedOrder?.deliveryMethod &&
                            `（${selectedOrder.deliveryMethod}）`}
                        </strong>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button
                        className="check-button fw-bold"
                        onClick={() => handleReturnClick(selectedOrder)}
                      >
                        退貨
                      </button>
                      <button
                        className="delete-button mx-4 fw-bold"
                        onClick={handleCancelOrder}
                      >
                        作廢
                      </button>
                      <button
                        className="pink-button"
                        style={{ fontSize: "1rem" }}
                      >
                        列印明細
                      </button>
                      <Button
                        variant="success"
                        className="fw-bold ms-4"
                        onClick={handleCompleteOrder}
                        disabled={
                          selectedOrder?.status === 0 ||
                          selectedOrder?.status === 5
                        }
                      >
                        {getNextStepLabel(selectedOrder?.status)}
                      </Button>
                    </div>
                  </div>

                  {/* 簽名紀錄區 */}
                  <div className="signature-container p-3 border rounded d-flex align-items-center">
                    <span className="me-2">簽名紀錄：</span>
                    <div
                      className="signature-box border rounded overflow-hidden d-flex align-items-center justify-content-center"
                      style={{ width: 130, height: 120, background: "#f8f9fa" }}
                    >
                      {getSignatureSrc(selectedOrder) ? (
                        <img
                          src={getSignatureSrc(selectedOrder)}
                          alt="簽名圖片"
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "contain",
                          }}
                        />
                      ) : (
                        <span style={{ color: "#9ca3af" }}>無簽名</span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })()}
          {/* 渲染時查看資料 */}
        </Modal.Body>
        <Modal.Footer>
          {/* <Button variant="primary" onClick={closeEditModal}>
            儲存變更
          </Button>
          <Button variant="secondary" onClick={closeEditModal}>
            取消
          </Button> */}
        </Modal.Footer>
      </Modal>
      <ReturnOrderForm
        show={showReturnModal}
        onClose={() => setShowReturnModal(false)}
        orderData={selectedOrder}
        onSubmit={handleSubmitReturnOrder}
      />
    </>
  );
}
