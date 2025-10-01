import { useEffect, useMemo, useRef, useState } from "react";
import "../components/Search.css";
import SearchField from "../components/SearchField";
import { FaSearch } from "react-icons/fa";
import { useEmployee } from "../utils/EmployeeContext";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

function buildQuery(params = {}) {
  const qs = new URLSearchParams();
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && String(v).trim() !== "") {
      qs.set(k, v);
    }
  });
  const s = qs.toString();
  return s ? `?${s}` : "";
}

const toStr = (v) => (v === undefined || v === null ? "" : String(v));
const clamp = (n, min, max) => Math.max(min, Math.min(max, n));

export default function Stock() {
  const { currentUser } = useEmployee() || {};
  // userInfo 預設門市
  const userStoreId = toStr(currentUser?.user?.storeId);
  const userStoreName = toStr(currentUser?.user?.storeName);

  // 查詢條件
  const [category, setCategory] = useState("");                 // categoryId
  const [keyword, setKeyword] = useState("");                   // productName (輸入中)
  const [debouncedKeyword, setDebouncedKeyword] = useState(""); // 防抖後關鍵字
  const [storeId, setStoreId] = useState("");                   // storeId（字串）

  // 分頁（t_Stock 專用）
  const [page, setPage] = useState(0);      // 0-based page index
  const [limit, setLimit] = useState(50);   // 每頁筆數
  const [total, setTotal] = useState(0);    // 總筆數

  // 左側：庫存資料（t_Stock.items）
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // 門市下拉
  const [storeOptions, setStoreOptions] = useState([]);         // [{value,label}]
  const [storeLoading, setStoreLoading] = useState(false);

  // 分類下拉（★ 新增）
  const [categoryOptions, setCategoryOptions] = useState([{ value: "", label: "全部分類" }]);
  const [categoryLoading, setCategoryLoading] = useState(false);

  // 右側：低庫存預警（GetWarningStock）
  const [warningData, setWarningData] = useState([]);
  const [warningLoading, setWarningLoading] = useState(false);
  const [warningError, setWarningError] = useState("");

  // 高亮（右表點擊 → 左表）
  const [highlightId, setHighlightId] = useState(""); // 字串版 productId
  const rowRefs = useRef(new Map()); // productId(string) -> <tr> ref

  // ---------- 關鍵字防抖 ----------
  useEffect(() => {
    const h = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(h);
  }, [keyword]);

  // ---------- 當 storeId / category / keyword 改變時，重置分頁 ----------
  useEffect(() => {
    setPage(0);
  }, [storeId, category, debouncedKeyword]);

  // ---------- 載入門市清單（[{label,value,key}]） ----------
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      setStoreLoading(true);
      try {
        const res = await fetch(`${API_BASE}/Dropdown/GetStoreList`, { signal: ctrl.signal });
        const text = await res.text();
        if (!res.ok) {
          console.error("[GetStoreList] HTTP", res.status, res.statusText, "Body:", text);
          throw new Error(`HTTP ${res.status}`);
        }
        const raw = text ? JSON.parse(text) : [];
        let opts = (Array.isArray(raw) ? raw : [])
          .map((x) => ({
            value: toStr(x.value),
            label: toStr(x.label ?? x.key ?? x.value),
          }))
          .filter((o) => o.value);

        // 若清單中沒有 userInfo 的門市，補上去（置頂）
        if (userStoreId && !opts.some((o) => o.value === userStoreId)) {
          opts = [{ value: userStoreId, label: userStoreName || `門市 ${userStoreId}` }, ...opts];
        }

        setStoreOptions(opts);

        // 預設選取：優先 userInfo，其次第一個選項
        if (!storeId) {
          setStoreId(userStoreId || (opts[0]?.value ?? ""));
        }
      } catch (e) {
        if (e.name !== "AbortError") {
          console.warn("門市清單載入失敗，使用 fallback：", e);
          const fbValue = userStoreId || "1";
          const fbLabel = userStoreName || `門市 ${fbValue}`;
          setStoreOptions([{ value: fbValue, label: fbLabel }]);
          if (!storeId) setStoreId(fbValue);
        }
      } finally {
        setStoreLoading(false);
      }
    })();
    return () => ctrl.abort();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userStoreId, userStoreName]);

  // ---------- 載入分類清單（★ 新增，[{label,value,key}]） ----------
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      setCategoryLoading(true);
      try {
        const res = await fetch(`${API_BASE}/Dropdown/GetCategoryList`, { signal: ctrl.signal });
        const text = await res.text();
        if (!res.ok) {
          console.error("[GetCategoryList] HTTP", res.status, res.statusText, "Body:", text);
          throw new Error(`HTTP ${res.status}`);
        }
        const raw = text ? JSON.parse(text) : [];
        const opts = (Array.isArray(raw) ? raw : [])
          .map((x) => ({
            value: toStr(x.value),
            label: toStr(x.label ?? x.key ?? x.value),
          }))
          .filter((o) => o.value);
        setCategoryOptions([{ value: "", label: "全部分類" }, ...opts]);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.warn("分類清單載入失敗，使用預設『全部分類』：", e);
          setCategoryOptions([{ value: "", label: "全部分類" }]);
        }
      } finally {
        setCategoryLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  // ---------- 依條件載入 t_Stock（分頁 + 相容純陣列） ----------
  useEffect(() => {
    if (!storeId) return; // 沒選門市不打
    const ctrl = new AbortController();
    (async () => {
      setLoading(true);
      setError("");
      try {
        const offset = page * limit;
        const url = API_BASE + "/t_Stock" + buildQuery({
          storeId,
          categoryId: category || undefined,                // ★ 帶入分類
          productName: debouncedKeyword || undefined,
          offset,
          limit,
        });

        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        const text = await res.text();
        if (!res.ok) {
          console.error("[t_Stock] HTTP", res.status, res.statusText, "Body:", text);
          throw new Error(`HTTP ${res.status}`);
        }

        const json = text ? JSON.parse(text) : null;

        // 兩種格式皆可
        let items = [];
        let totalVal = 0;
        let limitVal = limit;
        let offsetVal = offset;

        if (Array.isArray(json)) {
          // 純陣列
          items = json;
          totalVal = Number(json.total ?? json.Total ?? json.length ?? 0);
          limitVal = limit;
          offsetVal = offset;
        } else {
          // 分頁殼：{ total, offset, limit, items }
          items = Array.isArray(json?.items) ? json.items : [];
          totalVal = Number(json?.total ?? 0);
          limitVal = Number(json?.limit ?? limit);
          offsetVal = Number(json?.offset ?? offset);
        }

        setTableData(items);
        setTotal(Number.isFinite(totalVal) ? totalVal : (items?.length || 0));

        // 後端可能調整 limit/offset，做一次對齊
        if (Number.isFinite(limitVal) && limitVal > 0 && limitVal !== limit) setLimit(limitVal);
        const correctedPage = Math.floor((Number.isFinite(offsetVal) ? offsetVal : 0) / (limitVal || 1));
        if (correctedPage !== page) setPage(correctedPage);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("庫存載入失敗:", e);
          setError("庫存載入失敗");
          setTableData([]);
          setTotal(0);
        }
      } finally {
        setLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [storeId, category, debouncedKeyword, page, limit]);

  // ---------- 依條件載入 Warning API（低庫存預警，不分頁） ----------
  useEffect(() => {
    if (!storeId) return;
    const ctrl = new AbortController();
    (async () => {
      setWarningLoading(true);
      setWarningError("");
      try {
        const url = API_BASE + "/t_Stock/GetWarningStock" + buildQuery({
          storeId,
          categoryId: category || undefined,               // ★ 帶入分類
          productName: debouncedKeyword || undefined,
        });

        const res = await fetch(url, { signal: ctrl.signal, headers: { Accept: "application/json" } });
        const text = await res.text();
        if (!res.ok) {
          console.warn("[GetWarningStock] HTTP", res.status, res.statusText, "Body:", text);
          throw new Error(`HTTP ${res.status}`);
        }
        const raw = text ? JSON.parse(text) : [];
        const arr = Array.isArray(raw) ? raw : (Array.isArray(raw?.data) ? raw.data : []);
        setWarningData(arr);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.warn("WarningStock 載入失敗：", e);
          setWarningError("預警載入失敗");
          setWarningData([]);
        }
      } finally {
        setWarningLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, [storeId, category, debouncedKeyword]);

  // ---------- 左表欄位取值（依 t_Stock） ----------
  const getProductId     = (x) => toStr(x.productId ?? x.id ?? x.product?.id ?? "");
  const getProductName   = (x) => x.productName ?? x.product?.name ?? "";
  const getTotalQuantity = (x) => Number(x.totalQuantity ?? 0);
  const getStoreQuantity = (x) => Number(x.quantity ?? 0);
  const getSafetyStock   = (x) => Number(x.safetyStock ?? 0);

  // ---------- 右表欄位取值（Warning） ----------
  const wId         = (w) => toStr(w.Id ?? w.id ?? w.stockId ?? w.StockId);
  const wProductId  = (w) => toStr(w.ProductId ?? w.productId ?? w.pid);
  const wName       = (w) => w.ProductName ?? w.productName ?? w.name ?? "";
  const wQty        = (w) => Number(w.Quantity ?? w.quantity ?? w.qty ?? 0);
  const wSafe       = (w) => Number(w.SafetyStock ?? w.safetyStock ?? w.safe ?? 0);
  const wDiff       = (w) => wQty(w) - wSafe(w); // 差異 = 門市庫存 - 安全庫存

  // 右表依差異由小到大（越缺越上面）
  const sortedWarning = useMemo(() => {
    const arr = [...warningData];
    arr.sort((a, b) => wDiff(a) - wDiff(b));
    return arr;
  }, [warningData]);

  // 點擊右側預警 → 左表高亮 + 捲動
  const onPickWarning = (w) => {
    const pid = wProductId(w);
    if (!pid) return;
    setHighlightId(pid);

    const el = rowRefs.current.get(pid);
    if (el && typeof el.scrollIntoView === "function") {
      el.scrollIntoView({ behavior: "smooth", block: "center" });
    }
    setTimeout(() => setHighlightId((cur) => (cur === pid ? "" : cur)), 3000);
  };

  // 分頁計算
  const pageCount = Math.max(1, Math.ceil((total || 0) / (limit || 1)));
  const canPrev = page > 0;
  const canNext = page + 1 < pageCount;

  // 直接跳頁（輸入框）
  const handleJump = (e) => {
    const v = e.target.value;
    const n = Number(v);
    if (Number.isFinite(n)) {
      const p = clamp(Math.floor(n) - 1, 0, pageCount - 1); // 使用者用 1-based
      if (p !== page) setPage(p);
    }
  };

  return (
    <div className="container-fluid">
      <div className="row">
        {/* 搜尋區 */}
        <div className="search-container d-flex flex-wrap gap-3 px-5 pt-4 pb-3 rounded">
          {/* 門市（預設取 userInfo 的 storeId/storeName） */}
          <SearchField
            type="select"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            options={[...storeOptions]}
            disabled={storeLoading}
          />

          {/* 分類（★ 改為用 API 清單） */}
          <SearchField
            type="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={categoryOptions}
            disabled={categoryLoading}
          />

          {/* 關鍵字（商品名稱） */}
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="搜尋商品名稱..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value.trimStart())}
            />
          </div>
        </div>

        {/* 左邊 - 全部庫存（對齊 t_Stock 欄位，分頁） */}
        <div className="col-7">
          <div
            style={{
              height: "75vh",
              overflowY: "auto",
              width: "90%",
              margin: "0 auto",
              border: "1px solid #D7D7D7",
            }}
            className="no-scrollbar"
          >
            <table
              className="table text-center mb-0"
              style={{
                fontSize: "1.2rem",
                width: "100%",
                tableLayout: "fixed",
                borderCollapse: "collapse",
              }}
            >
              <thead
                className="table-info"
                style={{
                  position: "sticky",
                  top: 0,
                  background: "#d1ecf1",
                  zIndex: 1,
                }}
              >
                <tr>
                  <th style={{ width: "420px" }}>商品名稱</th>
                  <th>總庫存</th>
                  <th>門市庫存</th>
                  <th>安全庫存</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr><td colSpan={4}>載入中…</td></tr>
                ) : error ? (
                  <tr><td colSpan={4} style={{ color: "red" }}>{error}</td></tr>
                ) : tableData.length > 0 ? (
                  tableData.map((item) => {
                    const pid    = getProductId(item); // 字串
                    const name   = getProductName(item);
                    const totalQ = getTotalQuantity(item);
                    const storeQ = getStoreQuantity(item);
                    const safety = getSafetyStock(item);
                    const danger = storeQ < safety;

                    return (
                      <tr
                        key={pid || Math.random()}
                        ref={(el) => { if (pid) rowRefs.current.set(pid, el); }}
                        style={{
                          transition: "background-color 200ms",
                          backgroundColor: pid && pid === highlightId ? "rgba(255,230,150,0.8)" : "transparent",
                        }}
                      >
                        <td
                          title={name}
                          style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}
                        >
                          {name}
                        </td>
                        <td>{totalQ}</td>
                        <td style={{ color: danger ? "red" : "inherit", fontWeight: danger ? 600 : 400 }}>{storeQ}</td>
                        <td>{safety}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={4}>無資料</td></tr>
                )}
              </tbody>
            </table>
          </div>

          {/* 分頁器 */}
          <div
            style={{
              width: "90%",
              margin: "8px auto 0",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              gap: 12,
              fontSize: "0.95rem",
            }}
          >
            <div>
              總筆數：{total}　|　每頁
              <select
                value={limit}
                onChange={(e) => {
                  const v = Number(e.target.value) || 20;
                  setLimit(v);
                  setPage(0); // 換每頁筆數時回到第一頁
                }}
                style={{ marginLeft: 6, marginRight: 6 }}
              >
                {[10, 20, 30, 50, 100].map(n => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
              筆
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={!canPrev}
                onClick={() => canPrev && setPage(page - 1)}
              >
                上一頁
              </button>

              <span>
                第{" "}
                <input
                  type="number"
                  min={1}
                  max={pageCount}
                  defaultValue={page + 1}
                  onBlur={handleJump}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") handleJump(e);
                  }}
                  style={{ width: 64, textAlign: "center" }}
                />{" "}
                / {pageCount} 頁
              </span>

              <button
                className="btn btn-sm btn-outline-secondary"
                disabled={!canNext}
                onClick={() => canNext && setPage(page + 1)}
              >
                下一頁
              </button>
            </div>
          </div>
        </div>

        {/* 右邊 - 低庫存預警（可點擊） */}
        <div className="col-5">
          <div style={{ height: "79vh", overflow: "auto" }}>
            <h5 className="no-safe-text mt-1 mb-2 py-2">低庫存預警</h5>
            <table className="table text-center" style={{ fontSize: "1.1rem", width: "90%" }}>
              <thead className="table-light" style={{ borderTop: "1px solid #c5c6c7" }}>
                <tr>
                  <th>商品名稱</th>
                  <th>門市庫存</th>
                  <th>安全庫存</th>
                  <th>差異</th>
                </tr>
              </thead>
              <tbody>
                {warningLoading ? (
                  <tr><td colSpan={4}>載入中…</td></tr>
                ) : warningError ? (
                  <tr><td colSpan={4} style={{ color: "red" }}>{warningError}</td></tr>
                ) : sortedWarning.length > 0 ? (
                  sortedWarning.map((w, i) => {
                    const id   = wId(w) || `row-${i}`;
                    const pid  = wProductId(w);
                    const name = wName(w);
                    const qty  = wQty(w);
                    const safe = wSafe(w);
                    const diff = wDiff(w);
                    return (
                      <tr
                        key={id}
                        onClick={() => onPickWarning(w)}
                        style={{ cursor: pid ? "pointer" : "default" }}
                        title={pid ? "點擊以在左側高亮" : undefined}
                      >
                        <td style={{ whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{name}</td>
                        <td style={{ color: qty < safe ? "red" : "inherit", fontWeight: qty < safe ? 600 : 400 }}>{qty}</td>
                        <td>{safe}</td>
                        <td style={{ fontWeight: 600, color: diff < 0 ? "red" : "inherit" }}>{diff}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr><td colSpan={4}>目前沒有低庫存品項</td></tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

      </div>
    </div>
  );
}
