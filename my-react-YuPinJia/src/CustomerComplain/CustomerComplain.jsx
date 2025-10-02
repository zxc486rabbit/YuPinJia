import { useEffect, useRef, useState } from "react";
import Swal from "sweetalert2";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

// 類別代碼（如與後端不一致，請在此調整）
const CATEGORY_OPTIONS = [
  { value: 1, label: "產品客訴" },
  { value: 2, label: "服務問題" },
  { value: 3, label: "配送問題" },
  { value: 4, label: "其他" },
];

// 放在檔案上方 utilities 區
function authJsonHeaders() {
  const h = { "Content-Type": "application/json", Accept: "application/json" };
  const token = localStorage.getItem("accessToken");
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// 轉成 ISO，不帶毫秒
function toISOSeconds(s) {
  const d = s ? new Date(s) : new Date();
  // 轉成 "YYYY-MM-DDTHH:mm:ss.sssZ" → 去掉毫秒
  return new Date(d.getTime() - d.getMilliseconds())
    .toISOString()
    .replace(/\.\d{3}Z$/, "Z");
}

// 產生 datetime-local 預設值（本地時間）
function nowLocalDatetime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const MM = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mm = pad(d.getMinutes());
  return `${yyyy}-${MM}-${dd}T${hh}:${mm}`;
}

// ✅ 以「折後單價」計價：unitPrice − perUnitDiscount
function computeNetUnitPrice(item) {
  const qty = Number(item?.quantity ?? 0) || 0;
  const unitPrice = Number(item?.unitPrice ?? 0) || 0;
  const discountedAmount = Number(item?.discountedAmount ?? 0) || 0;

  // 判斷折扣是「每件折扣」還是「整列折扣」
  // - 若 discountedAmount <= unitPrice：視為每件折扣
  // - 若 discountedAmount >  unitPrice：視為整列折扣，平均到每件
  let perUnitDiscount = 0;
  if (discountedAmount > 0) {
    perUnitDiscount =
      discountedAmount <= unitPrice
        ? discountedAmount
        : qty > 0
        ? discountedAmount / qty
        : 0;
  }

  // 折後單價不得為負
  return Math.max(0, unitPrice - perUnitDiscount);
}

export default function CustomerComplain() {
  // 表單狀態
  const [category, setCategory] = useState("");
  const [salesOrderId, setSalesOrderId] = useState(""); // 顯示在輸入框的「訂單編號(字串)」
  const [selectedOrderId, setSelectedOrderId] = useState(null); // 真正送後端用
  const [invoiceNumber, setInvoiceNumber] = useState("");
  const [reason, setReason] = useState("");
  const [refundAmount, setRefundAmount] = useState(""); // 自動計算 → 只讀
  const [complaintDate, setComplaintDate] = useState(nowLocalDatetime());

  // 送出中
  const [submitting, setSubmitting] = useState(false);

  // —— 訂單模糊查詢（依訂單編號） ——
  const [orderQuery, setOrderQuery] = useState("");
  const [orderLoading, setOrderLoading] = useState(false);
  const [orderResults, setOrderResults] = useState([]);
  const [showSuggest, setShowSuggest] = useState(false);
  const [searchMode, setSearchMode] = useState(null); // orderNumber | keyword | q
  const debounceRef = useRef(null);
  const abortRef = useRef(null);
  const inputWrapRef = useRef(null);

  // —— 訂單明細（選單 + 數量 + 自動金額） ——
  const [itemsLoading, setItemsLoading] = useState(false);
  const [orderItems, setOrderItems] = useState([]); // 該訂單的所有明細
  const [selectedItemId, setSelectedItemId] = useState(""); // 選到的明細 id
  const [maxQty, setMaxQty] = useState(0); // 可退上限
  const [returnQty, setReturnQty] = useState(""); // 使用者輸入的退貨數量

  // 嘗試以多種常見查詢參數呼叫 API，找到一個可用的就記住
  async function fetchOrdersByKeyword(q, signal) {
    const candidates = searchMode
      ? [searchMode]
      : ["orderNumber", "keyword", "q"];
    for (const key of candidates) {
      try {
        const url = `${API_BASE}/t_SalesOrder?${key}=${encodeURIComponent(q)}`;
        const res = await fetch(url, {
          headers: { Accept: "application/json" },
          signal,
        });
        if (!res.ok) continue;
        const data = await res.json();
        const list = Array.isArray(data)
          ? data
          : Array.isArray(data?.items)
          ? data.items
          : [];
        if (Array.isArray(list)) {
          if (!searchMode) setSearchMode(key); // 記住成功的查詢參數
          return list;
        }
      } catch (err) {
        if (err?.name === "AbortError") return [];
      }
    }
    return [];
  }

  // 監聽輸入框文字，做 Debounce 模糊查詢
  useEffect(() => {
    if (!orderQuery || orderQuery.trim().length < 2) {
      setOrderResults([]);
      return;
    }
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      try {
        setOrderLoading(true);
        setShowSuggest(true);
        if (abortRef.current) abortRef.current.abort();
        abortRef.current = new AbortController();

        const list = await fetchOrdersByKeyword(
          orderQuery.trim(),
          abortRef.current.signal
        );
        const normalized = (list || []).slice(0, 8).map((o) => ({
          id: o?.id ?? null,
          orderNumber: o?.orderNumber ?? String(o?.orderNo ?? ""),
          memberIdName: o?.memberIdName ?? "",
          totalAmount: Number(o?.totalAmount ?? 0),
          status: String(o?.status ?? ""),
          deliveryMethod: String(o?.deliveryMethod ?? ""),
          invoiceNumber: String(o?.invoiceNumber ?? ""),
          createdAt: o?.createdAt ?? o?.orderDate ?? "",
          pickupInfo: o?.pickupInfo ?? "",
        }));
        setOrderResults(normalized);
      } finally {
        setOrderLoading(false);
      }
    }, 350);
    return () => clearTimeout(debounceRef.current);
  }, [orderQuery, searchMode]);

  // 選擇某筆訂單 → 帶入：訂單編號、發票、id 並載入明細
  const applyOrder = async (o) => {
    setSalesOrderId(o.orderNumber || "");
    setSelectedOrderId(o.id || null);
    setInvoiceNumber(o.invoiceNumber || "");
    setShowSuggest(false);

    // 重置商品選擇與金額
    setOrderItems([]);
    setSelectedItemId("");
    setReturnQty("");
    setRefundAmount("");

    if (!o?.id) return;

    // 抓該訂單的明細
    try {
      setItemsLoading(true);
      const url = `${API_BASE}/t_SalesOrderItem/GetItemByOrderId?salesOrderId=${encodeURIComponent(
        o.id
      )}`;
      const res = await fetch(url, { headers: { Accept: "application/json" } });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const arr = await res.json();

      const normalized = (Array.isArray(arr) ? arr : []).map((it) => {
        const qty = Number(it?.quantity ?? 0) || 0;
        const returned = Number(it?.returnQuantity ?? 0) || 0;
        const available = Math.max(0, qty - returned);
        const netUnit = computeNetUnitPrice(it);
        return {
          id: it?.id ?? null,
          salesOrderId: it?.salesOrderId ?? o.id,
          productId: it?.productId ?? null,
          productName: it?.productName ?? "",
          shippingLocation: it?.shippingLocation ?? "",
          quantity: qty,
          unitPrice: Number(it?.unitPrice ?? 0) || 0,
          discountedAmount: Number(it?.discountedAmount ?? 0) || 0,
          subtotal: it?.subtotal, // 可能為 null
          status: it?.status ?? "",
          isGift: it?.isGift ?? null,
          staffId: it?.staffId ?? 0,
          returnQuantity: returned || 0,
          availableQty: available,
          netUnit, // 計算好的單件淨價
        };
      });

      setOrderItems(normalized);
    } catch (err) {
      console.error("讀取訂單明細失敗:", err);
      Swal.fire({
        icon: "error",
        title: "讀取訂單明細失敗",
        text: String(err.message || err),
      });
    } finally {
      setItemsLoading(false);
    }
  };

  // 清除所選訂單
  const clearOrder = () => {
    setSalesOrderId("");
    setSelectedOrderId(null);
    setInvoiceNumber("");
    setOrderQuery("");
    setOrderResults([]);
    setShowSuggest(false);

    // 也清空明細／商品選擇／金額
    setOrderItems([]);
    setSelectedItemId("");
    setReturnQty("");
    setRefundAmount("");
  };

  // 當選擇商品改變 → 設定可退上限與預設數量/金額
  useEffect(() => {
    if (!selectedItemId) {
      setMaxQty(0);
      setReturnQty("");
      setRefundAmount("");
      return;
    }
    const item = orderItems.find(
      (x) => String(x.id) === String(selectedItemId)
    );
    if (!item) return;

    const upper = Number(item.availableQty || 0);
    setMaxQty(upper);

    // 預設數量 1（若可退上限 >=1）
    const nextQty = upper > 0 ? 1 : 0;
    setReturnQty(nextQty || "");

    // 自動計算退款金額
    const refund = Math.round((item.netUnit || 0) * (nextQty || 0));
    setRefundAmount(Number.isFinite(refund) ? String(refund) : "");
  }, [selectedItemId, orderItems]);

  // 當數量變動 → 重新計算退款金額與限制上限
  const onQtyChange = (e) => {
    let v = e.target.value;
    if (v === "") {
      setReturnQty("");
      setRefundAmount("");
      return;
    }
    v = Math.max(0, Math.floor(Number(v)));
    if (maxQty > 0 && v > maxQty) {
      Swal.fire({
        icon: "warning",
        title: "超過可退上限",
        text: `此商品可退上限為 ${maxQty} 件`,
      });
      v = maxQty;
    }
    // 不允許 0
    if (v === 0) {
      setReturnQty("");
      setRefundAmount("");
      return;
    }
    setReturnQty(v);

    const item = orderItems.find(
      (x) => String(x.id) === String(selectedItemId)
    );
    if (item) {
      const refund = Math.round((item.netUnit || 0) * v);
      setRefundAmount(Number.isFinite(refund) ? String(refund) : "");
    } else {
      setRefundAmount("");
    }
  };

  // ⬇️ 直接替換你的 handleSubmit
  const handleSubmit = async (e) => {
    e.preventDefault();

    // 基本驗證
    if (!category) return Swal.fire({ icon: "warning", title: "請選擇類別" });
    if (!reason.trim())
      return Swal.fire({ icon: "warning", title: "請填寫原因" });

    if (selectedOrderId) {
      if (!selectedItemId) {
        return Swal.fire({
          icon: "warning",
          title: "請選擇商品",
          text: "請先選擇要退的商品項目",
        });
      }
      const qty = Number(returnQty || 0);
      if (!qty || qty < 1) {
        return Swal.fire({
          icon: "warning",
          title: "請輸入數量",
          text: "數量需為 1 以上，且不超過可退上限",
        });
      }
    }

    const amount = Number(refundAmount || 0);
    if (!(amount > 0))
      return Swal.fire({ icon: "warning", title: "退款金額需大於 0" });

    // 找到選中的明細
    const selItem = orderItems.find(
      (x) => String(x.id) === String(selectedItemId)
    );

    // ✅ 依你的 API 規格組裝：{ complaint: {...}, orderItemIds: [...] }
    const payload = {
      complaint: {
        category: Number(category),
        reason: reason.trim(),
        refundAmount: amount,
        complaintDate: toISOSeconds(complaintDate),
        ...(selectedOrderId ? { salesOrderId: Number(selectedOrderId) } : {}),
        ...(invoiceNumber ? { invoiceNumber: invoiceNumber.trim() } : {}),
        // ⚠️ 不送 id / createdAt，讓後端自己產生
      },
      orderItemIds: selItem ? [Number(selItem.id)] : [],
    };

    try {
      setSubmitting(true);
      const res = await fetch(`${API_BASE}/t_Complaint`, {
        method: "POST",
        headers: authJsonHeaders(),
        body: JSON.stringify(payload),
      });

      if (!res.ok) {
        const text = await res.text();
        let msg = `HTTP ${res.status}`;
        try {
          const j = JSON.parse(text || "{}");
          if (j?.errors && typeof j.errors === "object") {
            // 展開 ASP.NET ModelState 錯誤
            const lines = [];
            for (const [k, arr] of Object.entries(j.errors)) {
              const joined = Array.isArray(arr) ? arr.join("；") : String(arr);
              lines.push(`${k}: ${joined}`);
            }
            msg = lines.join(" | ");
          } else {
            msg = j?.title || j?.message || text || msg;
          }
        } catch {
          msg = text || msg;
        }
        throw new Error(msg);
      }

      const data = await res.json();
      await Swal.fire({
        icon: "success",
        title: "已送出客訴",
        text: `單號：${data?.id ?? "—"}`,
      });

      // 重置
      setCategory("");
      setReason("");
      setRefundAmount("");
      setComplaintDate(nowLocalDatetime());
      clearOrder();
    } catch (err) {
      Swal.fire({
        icon: "error",
        title: "送出失敗",
        text: String(err?.message || err),
      });
      console.error("POST /t_Complaint error:", err);
      console.log("payload sent:", payload);
    } finally {
      setSubmitting(false);
    }
  };

  // UI 小工具：格式化日期
  const fmtLocal = (s) => {
    if (!s) return "";
    const d = new Date(s);
    if (isNaN(d)) return s;
    const pad = (n) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(
      d.getDate()
    )} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const invoiceHint = selectedOrderId
    ? invoiceNumber
      ? "已帶入發票號碼"
      : "（此訂單無開立發票）"
    : "";

  return (
    <div className="container ms-5">
      <div className="card shadow" style={{ maxWidth: "60%" }}>
        <div className="card-body p-4">
          <h2 className="mb-4 fw-bold">客訴</h2>

          <form onSubmit={handleSubmit} autoComplete="off">
            <div className="row g-4 px-3">
              {/* 類別（數字枚舉） */}
              <div className="col-md-6 pe-2">
                <label htmlFor="category" className="form-label fw-bold">
                  類別
                </label>
                <select
                  id="category"
                  className="form-select"
                  value={category}
                  onChange={(e) => setCategory(e.target.value)}
                  required
                >
                  <option value="">請選擇類別</option>
                  {CATEGORY_OPTIONS.map((opt) => (
                    <option key={opt.value} value={opt.value}>
                      {opt.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* 訂單編號（模糊查詢 + 建議清單） */}
              <div
                className="col-md-6 ps-2"
                ref={inputWrapRef}
                style={{ position: "relative" }}
              >
                <label
                  htmlFor="salesOrderId"
                  className="form-label fw-bold d-flex align-items-center justify-content-between"
                >
                  <span>訂單編號</span>
                  {selectedOrderId ? (
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-secondary"
                      onClick={clearOrder}
                      disabled={submitting}
                    >
                      清除
                    </button>
                  ) : null}
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="salesOrderId"
                  placeholder="輸入至少 2 個字進行查詢，例如 SO1755…"
                  value={salesOrderId}
                  onChange={(e) => {
                    const v = e.target.value;
                    setSalesOrderId(v); // 顯示用途
                    setOrderQuery(v); // 查詢用途
                    setSelectedOrderId(null); // 只要改字就視為未選定
                    if (!v) setShowSuggest(false);

                    // 改字同時清空明細/商品/金額
                    setOrderItems([]);
                    setSelectedItemId("");
                    setReturnQty("");
                    setRefundAmount("");
                  }}
                  onFocus={() => {
                    if (orderResults.length > 0) setShowSuggest(true);
                  }}
                  onBlur={() => {
                    setTimeout(() => setShowSuggest(false), 150);
                  }}
                  disabled={submitting}
                />

                {/* 建議清單 */}
                {showSuggest && (
                  <div
                    className="position-absolute w-100"
                    style={{ zIndex: 20, top: "100%", left: 0 }}
                  >
                    <div
                      className="list-group shadow-sm"
                      style={{ maxHeight: 320, overflow: "auto" }}
                    >
                      {orderLoading && (
                        <div className="list-group-item text-muted">
                          搜尋中…
                        </div>
                      )}
                      {!orderLoading &&
                        orderResults.length === 0 &&
                        orderQuery.trim().length >= 2 && (
                          <div className="list-group-item text-muted">
                            查無符合訂單
                          </div>
                        )}
                      {!orderLoading &&
                        orderResults.map((o) => (
                          <button
                            key={o.id ?? o.orderNumber}
                            type="button"
                            className="list-group-item list-group-item-action"
                            onMouseDown={(e) => e.preventDefault()} // 避免 blur
                            onClick={() => applyOrder(o)}
                            title={`建立於：${fmtLocal(o.createdAt)}`}
                          >
                            <div className="d-flex justify-content-between align-items-center">
                              <div>
                                <div className="fw-bold">{o.orderNumber}</div>
                                <div className="small text-muted">
                                  {o.memberIdName || "—"} ｜{" "}
                                  {o.deliveryMethod || "—"} ｜ NT${" "}
                                  {o.totalAmount}
                                </div>
                              </div>
                              <div className="text-end small">
                                <div>{o.status}</div>
                                <div className="text-muted">
                                  {fmtLocal(o.createdAt)}
                                </div>
                              </div>
                            </div>
                          </button>
                        ))}
                    </div>
                  </div>
                )}
              </div>

              {/* 發票號碼 */}
              <div className="col-md-6 pe-2">
                <label
                  htmlFor="invoiceNumber"
                  className="form-label fw-bold d-flex align-items-center gap-2"
                >
                  <span>發票號碼</span>
                  {selectedOrderId && (
                    <span
                      className={`small ${
                        invoiceNumber ? "text-success" : "text-muted"
                      }`}
                    >
                      {invoiceHint}
                    </span>
                  )}
                </label>
                <input
                  type="text"
                  className="form-control"
                  id="invoiceNumber"
                  placeholder={
                    selectedOrderId && !invoiceNumber
                      ? "無開立發票"
                      : "請輸入發票號碼（可留空）"
                  }
                  value={invoiceNumber}
                  onChange={(e) => setInvoiceNumber(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* 客訴時間 */}
              <div className="col-md-6 ps-2">
                <label htmlFor="complaintDate" className="form-label fw-bold">
                  客訴時間
                </label>
                <input
                  type="datetime-local"
                  className="form-control"
                  id="complaintDate"
                  value={complaintDate}
                  onChange={(e) => setComplaintDate(e.target.value)}
                  disabled={submitting}
                />
              </div>

              {/* —— 新增：商品下拉 —— */}
              <div className="col-md-6 pe-2">
                <label htmlFor="orderItem" className="form-label fw-bold">
                  商品
                </label>
                <select
                  id="orderItem"
                  className="form-select"
                  value={selectedItemId}
                  onChange={(e) => setSelectedItemId(e.target.value)}
                  disabled={
                    !selectedOrderId ||
                    itemsLoading ||
                    orderItems.length === 0 ||
                    submitting
                  }
                >
                  {!selectedOrderId ? (
                    <option value="">請先選擇訂單</option>
                  ) : itemsLoading ? (
                    <option value="">讀取中…</option>
                  ) : orderItems.length === 0 ? (
                    <option value="">此訂單沒有明細</option>
                  ) : (
                    <>
                      <option value="">請選擇商品</option>
                      {orderItems.map((it) => (
                        <option key={it.id} value={it.id}>
                          {it.productName}（原數量 {it.quantity}，已退{" "}
                          {it.returnQuantity}）
                        </option>
                      ))}
                    </>
                  )}
                </select>
                {/* 商品說明（單價/可退） */}
                {selectedItemId && (
                  <small className="text-muted d-block mt-1">
                    單件淨價 NT${" "}
                    {(() => {
                      const it = orderItems.find(
                        (x) => String(x.id) === String(selectedItemId)
                      );
                      return it ? Math.round(it.netUnit) : 0;
                    })()}{" "}
                    ，可退上限 {maxQty}
                  </small>
                )}
              </div>

              {/* —— 新增：數量（不可超過上限） —— */}
              <div className="col-md-6 ps-2">
                <label htmlFor="returnQty" className="form-label fw-bold">
                  數量
                </label>
                <input
                  type="number"
                  className="form-control text-end"
                  id="returnQty"
                  placeholder={
                    selectedItemId ? `1 ～ ${maxQty}` : "請先選擇商品"
                  }
                  min={selectedItemId ? 1 : undefined}
                  max={selectedItemId ? maxQty : undefined}
                  value={returnQty}
                  onChange={onQtyChange}
                  disabled={!selectedItemId || submitting || maxQty === 0}
                />
                {selectedItemId && maxQty === 0 && (
                  <small className="text-danger">此商品無可退數量</small>
                )}
              </div>

              {/* 原因 */}
              <div className="col-12">
                <label htmlFor="reason" className="form-label fw-bold">
                  原因
                </label>
                <textarea
                  className="form-control"
                  id="reason"
                  placeholder="請輸入原因"
                  rows="3"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                  disabled={submitting}
                />
              </div>

              {/* 退款金額（自動帶入、不可修改） */}
              <div className="col-6 col-md-4">
                <label htmlFor="refundAmount" className="form-label fw-bold">
                  退款金額
                </label>
                <div className="input-group">
                  <span className="input-group-text">NT$</span>
                  <input
                    type="number"
                    className="form-control text-end"
                    id="refundAmount"
                    placeholder="0"
                    value={refundAmount}
                    readOnly // ⬅️ 不可修改
                  />
                  <span className="input-group-text">元</span>
                </div>
                {selectedItemId && returnQty && (
                  <small className="text-muted">
                    計算：單件淨價 × 數量 = 退款金額
                  </small>
                )}
              </div>
            </div>

            <div className="text-center mt-4">
              <button
                type="submit"
                className="add-button"
                disabled={submitting}
                style={{ opacity: submitting ? 0.8 : 1 }}
              >
                {submitting ? "送出中…" : "確認送出"}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
