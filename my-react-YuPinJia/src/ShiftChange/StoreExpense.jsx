// StoreExpense.jsx — 門市支出（整合 EmployeeContext＋Modal 欄距修正＋類別/附件相容修正）
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";
import { useEmployee } from "../utils/EmployeeContext"; // ← 依你的專案路徑調整

// === API Base 與授權 ===
const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";
function authJsonHeaders() {
  const h = { "Content-Type": "application/json", Accept: "application/json" };
  const token = localStorage.getItem("accessToken");
  if (token) h.Authorization = `Bearer ${token}`;
  return h;
}

// === 類別（1 起算；送後端數字、畫面顯示中文）===
const CATEGORY_OPTIONS = [
  { value: 1, label: "備品/耗材" },
  { value: 2, label: "餐飲/飲料" },
  { value: 3, label: "交通/運輸" },
  { value: 4, label: "維修保養" },
  { value: 5, label: "清潔" },
  { value: 6, label: "其他" },
];

// === 付款方式（目前只允許現金 0）===
const PAY_METHODS = [{ value: 0, label: "現金" }];

// === 工具：時間 ↔ input(datetime-local) 互轉 ===
function toInputDateTimeLocal(isoLike) {
  if (!isoLike) return "";
  const d = new Date(isoLike);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  return `${yyyy}-${mm}-${dd}T${hh}:${mi}`;
}
function fromInputDateTimeLocal(input) {
  if (!input) return "";
  const d = new Date(input);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(
    d.getHours()
  )}:${pad(d.getMinutes())}:00`;
}

// === 檔案↔hex 與 hex→base64（預覽用）===
async function fileToHexPrefixed(file) {
  const buf = await file.arrayBuffer();
  const bytes = new Uint8Array(buf);
  let hex = "0x";
  for (let i = 0; i < bytes.length; i++)
    hex += bytes[i].toString(16).padStart(2, "0");
  return hex;
}
function hexToBase64(hexWith0x) {
  if (!hexWith0x) return "";
  const hex =
    hexWith0x.startsWith("0x") || hexWith0x.startsWith("0X")
      ? hexWith0x.slice(2)
      : hexWith0x;
  if (!hex || hex.length % 2 !== 0) return "";
  const bytes = new Uint8Array(hex.length / 2);
  for (let i = 0; i < bytes.length; i++)
    bytes[i] = parseInt(hex.substr(i * 2, 2), 16);
  let binary = "";
  for (let i = 0; i < bytes.length; i++)
    binary += String.fromCharCode(bytes[i]);
  return btoa(binary);
}

// === 類別/附件 相容工具 ===
// 將後端回來的 category（可能是數字或中文）統一成「字串數字」供 <select value> 使用
function normalizeCategoryToValue(cat) {
  if (cat === null || cat === undefined || cat === "") return "";
  if (typeof cat === "number") return String(cat);
  const found = CATEGORY_OPTIONS.find((c) => c.label === cat);
  return found ? String(found.value) : "";
}
// 類別顯示：把數字轉中文（2 → "餐飲/飲料"）
function categoryLabel(cat) {
  const v = Number(cat);
  return (
    CATEGORY_OPTIONS.find((c) => Number(c.value) === v)?.label ||
    String(cat ?? "")
  );
}
// 取附件：同時支援 POST/GET 大小寫鍵
function pickAttachment(row) {
  const mime = row.AttachmentMimeType || row.attachmentMimeType || "";
  const hex = row.AttachmentImage || row.attachmentImage || "";
  return { mime, hex };
}

export default function StoreExpense() {
  // 從 EmployeeContext 取登入者與 hydrating 狀態
  const { user, currentUser, hydrating } = useEmployee();

  // 三重保險：Context.user → currentUser?.user → localStorage.currentUser.user → localStorage.userInfo
  const displayUser = useMemo(() => {
    if (user) return user;
    if (currentUser?.user) return currentUser.user;
    try {
      const saved = JSON.parse(localStorage.getItem("currentUser") || "null");
      if (saved?.user) return saved.user;
    } catch {}
    try {
      const legacy = JSON.parse(localStorage.getItem("userInfo") || "null");
      if (legacy) return legacy;
    } catch {}
    return null;
  }, [user, currentUser]);

  // === 查詢條件 ===
  const [keyword, setKeyword] = useState("");
  const [category, setCategory] = useState(""); // 送後端數字字串
  const [payMethod, setPayMethod] = useState(""); // "" 或 "0"
  const [dateFrom, setDateFrom] = useState("");
  const [dateTo, setDateTo] = useState("");

  // === 分頁 ===
  const [offset, setOffset] = useState(0);
  const [limit, setLimit] = useState(10);

  // === 資料 ===
  const [loading, setLoading] = useState(false);
  const [items, setItems] = useState([]);
  const [total, setTotal] = useState(0);

  // === Modal（新增/編輯）===
  const [showModal, setShowModal] = useState(false);
  const [editing, setEditing] = useState(null);
  const [form, setForm] = useState({
    time: "",
    category: "",
    title: "",
    amount: "",
    payMethod: "0", // 只能現金
    receiptNo: "",
    note: "",
    attachmentFile: null,
    attachmentPreview: "",
  });

  // 初始化 & 當條件改變就查詢
  useEffect(() => {
    if (!displayUser) return; // 沒登入資訊先不查
    fetchList(0);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [displayUser, category, payMethod, keyword, dateFrom, dateTo, limit]);

  // 讀列表
  async function fetchList(newOffset = offset) {
    if (!displayUser) return;
    try {
      setLoading(true);
      const params = {
        storeId: displayUser.storeId,
        employeeId: displayUser.staffId,
        offset: newOffset,
        limit,
      };
      if (keyword) params.keyword = keyword;
      if (category) params.category = Number(category);
      if (payMethod !== "" && payMethod !== null && payMethod !== undefined)
        params.payMethod = Number(payMethod); // 0=現金
      if (dateFrom) params.dateFrom = dateFrom;
      if (dateTo) params.dateTo = dateTo;

      const res = await axios.get(`${API_BASE}/t_StoreExpense`, {
        headers: authJsonHeaders(),
        params,
      });

      const data = res.data || { items: [], total: 0, offset: 0, limit };
      setItems(Array.isArray(data.items) ? data.items : []);
      setTotal(Number(data.total ?? 0));
      setOffset(Number(data.offset ?? 0));
      setLimit(Number(data.limit ?? limit));
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "讀取失敗",
        text: "無法取得門市支出清單。",
      });
    } finally {
      setLoading(false);
    }
  }

  // 讀單筆並開編輯
  async function fetchOneAndOpenEdit(id) {
    try {
      setLoading(true);
      const res = await axios.get(`${API_BASE}/t_StoreExpense/${id}`, {
        headers: authJsonHeaders(),
      });
      const row = res.data;
      const { mime, hex } = pickAttachment(row);

      setEditing(row);
      setForm({
        time: toInputDateTimeLocal(row.time),
        category: normalizeCategoryToValue(row.category), // ← 關鍵：數字/中文都轉成 value 字串
        title: row.title ?? "",
        amount: String(row.amount ?? ""),
        payMethod: "0",
        receiptNo: row.receiptNo ?? "",
        note: row.note ?? "",
        attachmentFile: null,
        attachmentPreview:
          mime && hex ? `data:${mime};base64,${hexToBase64(hex)}` : "",
      });
      setShowModal(true);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "讀取失敗",
        text: "無法取得該筆資料。",
      });
    } finally {
      setLoading(false);
    }
  }

  // UI 操作
  const resetForm = () =>
    setForm({
      time: "",
      category: "",
      title: "",
      amount: "",
      payMethod: "0",
      receiptNo: "",
      note: "",
      attachmentFile: null,
      attachmentPreview: "",
    });

  const openAdd = () => {
    setEditing(null);
    resetForm();
    setShowModal(true);
  };

  const handleFileChange = (e) => {
    const file = e.target.files?.[0] || null;
    setForm((s) => ({ ...s, attachmentFile: file }));
    if (file) {
      const fr = new FileReader();
      fr.onload = () =>
        setForm((s) => ({ ...s, attachmentPreview: fr.result }));
      fr.readAsDataURL(file);
    } else {
      setForm((s) => ({ ...s, attachmentPreview: "" }));
    }
  };

  // 新增
  async function createItem() {
    if (!displayUser) return;
    if (!form.time || !form.category || !form.title || !form.amount) {
      Swal.fire({
        icon: "warning",
        title: "請填寫完整",
        text: "時間、類別、品名、金額必填",
      });
      return;
    }
    const payload = {
      storeId: displayUser.storeId,
      shiftId: null, // 你說目前沒有但要保留
      employeeId: displayUser.staffId,
      time: fromInputDateTimeLocal(form.time),
      category: Number(form.category),
      title: form.title.trim(),
      amount: Number(form.amount),
      payMethod: 0, // 只能現金
      receiptNo: form.receiptNo.trim(),
      note: form.note.trim(),
    };
    if (form.attachmentFile) {
      payload.AttachmentMimeType =
        form.attachmentFile.type || "application/octet-stream";
      payload.AttachmentImage = await fileToHexPrefixed(form.attachmentFile);
    }
    try {
      setLoading(true);
      await axios.post(`${API_BASE}/t_StoreExpense`, payload, {
        headers: authJsonHeaders(),
      });
      setShowModal(false);
      await Swal.fire({ icon: "success", title: "已新增" });
      fetchList(0);
    } catch (err) {
      console.error(err);
      Swal.fire({
        icon: "error",
        title: "新增失敗",
        text: err?.response?.data?.message || "請稍後再試",
      });
    } finally {
      setLoading(false);
    }
  }

 // 由 value(數字) 轉中文標籤
function categoryLabelFromValue(val) {
  const v = Number(val);
  return CATEGORY_OPTIONS.find((c) => Number(c.value) === v)?.label || "";
}

// 更新（帶 body.id，且 400 時自動 fallback 類別中文重試）
async function updateItem(id) {
  if (!id) return;

  const catValue = Number(form.category);
  if (!form.time || !catValue || catValue < 1 || catValue > 6 || !form.title || !form.amount) {
    Swal.fire({
      icon: "warning",
      title: "請填寫完整",
      text: "時間、類別(1~6)、品名、金額必填",
    });
    return;
  }

  // 基本 payload（先用「數字類別」）
  const basePayload = {
    id,                                     // ★ 很多後端 PUT 會比對 body.id 與路由 id
    storeId: displayUser?.storeId ?? undefined,
    shiftId: null,
    employeeId: displayUser?.staffId ?? undefined,
    time: fromInputDateTimeLocal(form.time),
    category: catValue,                     // ← 第一次用數字
    title: form.title.trim(),
    amount: Number(form.amount),
    payMethod: Number(form.payMethod || 0), // ← 確保數字
    receiptNo: (form.receiptNo || "").trim(),
    note: (form.note || "").trim(),
  };

  // 若重選了附件才帶；沒改附件就不要帶，避免被判為附件格式錯
  async function withAttachmentIfAny(payload) {
    if (form.attachmentFile) {
      return {
        ...payload,
        AttachmentMimeType: form.attachmentFile.type || "application/octet-stream",
        AttachmentImage: await fileToHexPrefixed(form.attachmentFile),
      };
    }
    return payload;
  }

  try {
    setLoading(true);

    // --- 第一次嘗試：類別用數字 ---
    const payload1 = await withAttachmentIfAny(basePayload);
    console.log("[PUT payload #1 numeric category]", payload1);

    await axios.put(`${API_BASE}/t_StoreExpense/${id}`, payload1, {
      headers: authJsonHeaders(),
    });

    setShowModal(false);
    await Swal.fire({ icon: "success", title: "已更新" });
    fetchList(offset);
  } catch (err1) {
    const status = err1?.response?.status;
    const msg =
      err1?.response?.data?.message ||
      err1?.response?.data?.title ||
      err1?.message ||
      "";

    // 只有在 400（格式驗證）時，再用「中文類別」重試一次
    if (status === 400) {
      try {
        const categoryText = categoryLabelFromValue(catValue); // 例如 2 → "餐飲/飲料"
        const payload2 = await withAttachmentIfAny({
          ...basePayload,
          category: categoryText, // ← 第二次改成中文類別
        });
        console.log("[PUT payload #2 text category Fallback]", payload2);

        await axios.put(`${API_BASE}/t_StoreExpense/${id}`, payload2, {
          headers: authJsonHeaders(),
        });

        setShowModal(false);
        await Swal.fire({ icon: "success", title: "已更新（文字類別）" });
        fetchList(offset);
        return;
      } catch (err2) {
        console.error("[PUT fallback failed]", err2);
        const msg2 =
          err2?.response?.data?.message ||
          err2?.response?.data?.title ||
          err2?.message ||
          "更新失敗（類別或欄位格式不正確）";
        Swal.fire({ icon: "error", title: "更新失敗", text: msg2 });
      }
    } else {
      console.error("[PUT failed]", err1);
      Swal.fire({
        icon: "error",
        title: "更新失敗",
        text: msg || "請稍後再試",
      });
    }
  } finally {
    setLoading(false);
  }
}

  // 合計（以目前頁面資料）
  const filtered = items; // 後端已篩選
  const totalAmount = useMemo(
    () => filtered.reduce((sum, it) => sum + Number(it.amount || 0), 0),
    [filtered]
  );
  const totalByCategory = useMemo(() => {
    const map = {};
    filtered.forEach((it) => {
      const cat = it.category || "-";
      // 這裡直接用顯示中文累加（若是數字會變中文再累加）
      const key = categoryLabel(cat);
      map[key] = (map[key] || 0) + Number(it.amount || 0);
    });
    return map;
  }, [filtered]);

  // 分頁
  const canPrev = offset > 0;
  const canNext = offset + limit < total;

  return (
    <div className="h-100 d-flex flex-column p-3">
      {/* Modal 欄距修正（只作用在 .expense-modal 的欄位） */}
      <style>{`
        .expense-modal .row > * { padding-left: .75rem; padding-right: .75rem; }
      `}</style>

      {/* 顯示目前使用者/門市（使用 displayUser，EmployeeContext + localStorage 備援） */}
      <div className="mb-3 p-3 border rounded bg-light">
        <div className="d-flex flex-wrap align-items-center gap-3">
          <span>
            <strong>門市：</strong>
            {displayUser?.storeName ?? "—"}
          </span>
          <span>
            <strong>員工：</strong>
            {displayUser?.chineseName ?? "—"}
          </span>
        </div>
        {!hydrating && !displayUser && (
          <div className="text-danger mt-2 small">
            無法取得登入者資訊，請確認此頁有被 EmployeeProvider
            包住或已完成登入。
          </div>
        )}
      </div>

      {/* 篩選列 */}
      <div className="d-flex flex-wrap align-items-end gap-2 mb-3">
        <div>
          <label className="form-label mb-1">關鍵字</label>
          <input
            className="form-control"
            placeholder="品名 / 備註 / 收據號"
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
          />
        </div>

        <div>
          <label className="form-label mb-1">類別</label>
          <select
            className="form-select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
          >
            <option value="">全部</option>
            {CATEGORY_OPTIONS.map((c) => (
              <option key={c.value} value={c.value}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label mb-1">付款方式</label>
          <select
            className="form-select"
            value={payMethod}
            onChange={(e) => setPayMethod(e.target.value)}
          >
            <option value="">全部</option>
            {PAY_METHODS.map((p) => (
              <option key={p.value} value={p.value}>
                {p.label}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="form-label mb-1">日期（起）</label>
          <input
            type="date"
            className="form-control"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
          />
        </div>
        <div>
          <label className="form-label mb-1">日期（迄）</label>
          <input
            type="date"
            className="form-control"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
          />
        </div>

        <div className="ms-auto d-flex gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setKeyword("");
              setCategory("");
              setPayMethod("");
              setDateFrom("");
              setDateTo("");
            }}
          >
            清除條件
          </button>
          <button className="btn btn-primary" onClick={() => fetchList(0)}>
            查詢
          </button>
          <button className="btn btn-success" onClick={openAdd}>
            ＋ 新增支出
          </button>
        </div>
      </div>

      {/* 合計區（以目前頁面資料） */}
      <div className="mb-2 p-3 border rounded">
        <div className="d-flex flex-wrap gap-3 align-items-center">
          <span className="badge text-bg-secondary p-2">
            本次查詢合計：<strong>NT$ {totalAmount.toLocaleString()}</strong>
          </span>
          <div className="d-flex flex-wrap gap-2">
            {Object.entries(totalByCategory).map(([cat, amt]) => (
              <span key={cat} className="badge text-bg-light border">
                {cat}：NT$ {amt.toLocaleString()}
              </span>
            ))}
          </div>
        </div>
      </div>

      {/* 列表 */}
      <div className="table-responsive border rounded">
        <table className="table mb-0 align-middle">
          <thead className="table-light">
            <tr>
              <th style={{ whiteSpace: "nowrap" }}>時間</th>
              <th>類別</th>
              <th>品名/項目</th>
              <th className="text-end" style={{ whiteSpace: "nowrap" }}>
                金額 (NT$)
              </th>
              <th>付款方式</th>
              <th style={{ whiteSpace: "nowrap" }}>收據號</th>
              <th>備註</th>
              <th>附件</th>
              <th className="text-center" style={{ width: 140 }}>
                操作
              </th>
            </tr>
          </thead>
          <tbody>
            {items.length === 0 ? (
              <tr>
                <td colSpan={10} className="text-center text-muted py-4">
                  {loading ? "載入中…" : "目前沒有符合條件的支出"}
                </td>
              </tr>
            ) : (
              items.map((row) => {
                const { mime, hex } = pickAttachment(row);
                return (
                  <tr key={row.id}>
                    <td style={{ whiteSpace: "nowrap" }}>
                      {toInputDateTimeLocal(row.time).replace("T", " ")}
                    </td>
                    <td>{categoryLabel(row.category)}</td>
                    <td>{row.title}</td>
                    <td className="text-end">
                      {Number(row.amount).toLocaleString()}
                    </td>
                    <td>{row.payMethod === 0 ? "現金" : row.payMethod}</td>
                    <td>{row.receiptNo || "-"}</td>
                    <td className="text-truncate" style={{ maxWidth: 240 }}>
                      {row.note}
                    </td>
                    <td>
                      {mime && hex ? (
                        <img
                          alt="attachment"
                          style={{
                            width: 40,
                            height: 40,
                            objectFit: "cover",
                            borderRadius: 4,
                          }}
                          src={`data:${mime};base64,${hexToBase64(hex)}`}
                        />
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                    <td className="text-center">
                      <div className="btn-group btn-group-sm">
                        <button
                          className="btn btn-outline-secondary"
                          onClick={() => fetchOneAndOpenEdit(row.id)}
                        >
                          編輯
                        </button>
                        {/* 目前未提供刪除 API */}
                      </div>
                    </td>
                  </tr>
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* 分頁 */}
      <div className="d-flex justify-content-between align-items-center mt-2">
        <div className="text-muted">
          共 {total} 筆；第 {Math.floor(offset / limit) + 1} /{" "}
          {Math.max(1, Math.ceil(total / limit))} 頁
        </div>
        <div className="d-flex align-items-center gap-2">
          <select
            className="form-select form-select-sm"
            style={{ width: 100 }}
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
          >
            {[10, 20, 50].map((n) => (
              <option key={n} value={n}>
                {n} 筆/頁
              </option>
            ))}
          </select>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={offset <= 0}
            onClick={() => fetchList(Math.max(0, offset - limit))}
          >
            上一頁
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            disabled={offset + limit >= total}
            onClick={() => fetchList(offset + limit)}
          >
            下一頁
          </button>
        </div>
      </div>

      {/* Modal：新增/編輯（外層套 .expense-modal，讓欄距修正只影響這裡） */}
      {showModal && (
        <div
          className="expense-modal position-fixed top-0 start-0 w-100 h-100 d-flex align-items-center justify-content-center"
          style={{ background: "rgba(0,0,0,0.35)", zIndex: 1050 }}
          onClick={() => setShowModal(false)}
        >
          <div
            className="bg-white rounded shadow p-3"
            style={{ width: 720, maxWidth: "95%" }}
            onClick={(e) => e.stopPropagation()}
          >
            <div className="d-flex align-items-center justify-content-between mb-2">
              <h5 className="m-0">{editing ? "編輯支出" : "新增支出"}</h5>
              <button
                className="btn btn-sm btn-outline-secondary"
                onClick={() => setShowModal(false)}
              >
                關閉
              </button>
            </div>

            <form
              onSubmit={async (e) => {
                e.preventDefault();
                if (editing) await updateItem(editing.id);
                else await createItem();
              }}
              className="d-grid gap-3"
            >
              <div className="row g-3">
                <div className="col-6">
                  <label className="form-label">時間</label>
                  <input
                    type="datetime-local"
                    className="form-control"
                    value={form.time}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, time: e.target.value }))
                    }
                  />
                </div>

                <div className="col-6">
                  <label className="form-label">類別</label>
                  <select
                    className="form-select"
                    value={form.category}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, category: e.target.value }))
                    }
                  >
                    <option value="">請選擇</option>
                    {CATEGORY_OPTIONS.map((c) => (
                      <option key={c.value} value={c.value}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="col-8">
                  <label className="form-label">品名/項目</label>
                  <input
                    className="form-control"
                    placeholder="例如：收據紙卷"
                    value={form.title}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, title: e.target.value }))
                    }
                  />
                </div>
                <div className="col-4">
                  <label className="form-label">金額 (NT$)</label>
                  <input
                    type="number"
                    min="0"
                    step="1"
                    className="form-control text-end"
                    value={form.amount}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, amount: e.target.value }))
                    }
                  />
                </div>

                <div className="col-4">
                  <label className="form-label">付款方式</label>
                  <select
                    className="form-select"
                    value={form.payMethod}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, payMethod: e.target.value }))
                    }
                    disabled
                  >
                    {PAY_METHODS.map((p) => (
                      <option key={p.value} value={p.value}>
                        {p.label}
                      </option>
                    ))}
                  </select>
                  <div className="form-text">目前僅支援現金。</div>
                </div>

                <div className="col-8">
                  <label className="form-label">收據號（選填）</label>
                  <input
                    className="form-control"
                    placeholder="例如：A12345678"
                    value={form.receiptNo}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, receiptNo: e.target.value }))
                    }
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">備註（選填）</label>
                  <textarea
                    rows={3}
                    className="form-control"
                    placeholder="補充說明…"
                    value={form.note}
                    onChange={(e) =>
                      setForm((s) => ({ ...s, note: e.target.value }))
                    }
                  />
                </div>

                <div className="col-12">
                  <label className="form-label">附件（單據照片，選填）</label>
                  <input
                    type="file"
                    className="form-control"
                    accept="image/*"
                    onChange={handleFileChange}
                  />
                  {form.attachmentPreview && (
                    <div className="mt-2">
                      <img
                        src={form.attachmentPreview}
                        alt="preview"
                        style={{
                          width: 120,
                          height: 120,
                          objectFit: "cover",
                          borderRadius: 6,
                          border: "1px solid #eee",
                        }}
                      />
                    </div>
                  )}
                </div>
              </div>

              <div className="d-flex justify-content-end gap-2">
                <button
                  type="button"
                  className="btn btn-outline-secondary"
                  onClick={() => setShowModal(false)}
                >
                  取消
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  disabled={loading}
                >
                  {editing ? "儲存變更" : "新增"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
