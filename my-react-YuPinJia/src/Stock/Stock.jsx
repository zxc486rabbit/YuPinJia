import { useState, useEffect, useMemo } from "react";
import "../components/Search.css"; // 引入搜尋框的 CSS
import SearchField from "../components/SearchField"; // 搜尋框模組
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

export default function Stock() {
  const { currentUser } = useEmployee() || {}; // ⬅️ 取登入者
  const [category, setCategory] = useState(""); // 對應後端 categoryId
  const [keyword, setKeyword] = useState(""); // 對應後端 productName
  const [storeId, setStoreId] = useState(""); // ⬅️ 新增：門市（對應後端 storeId）
  const [tableData, setTableData] = useState([]); // t_Stock 原始資料
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // PendingOrder（未包裝/待處理）資料
  const [pendingList, setPendingList] = useState([]);
  const [pendingMap, setPendingMap] = useState(new Map()); // productId -> pendingQty

  // 門市下拉資料
  const [storeOptions, setStoreOptions] = useState([]);
  const [storeLoading, setStoreLoading] = useState(false);
  const [storeError, setStoreError] = useState("");

  // 載入門市清單
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      setStoreLoading(true);
      setStoreError("");
      try {
        const res = await fetch(`${API_BASE}/Dropdown/GetStoreList`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const arr = await res.json();
        // 轉成 SearchField 需要的 options 格式
        const opts = (Array.isArray(arr) ? arr : []).map((x) => ({
          value: String(x.value), // 用字串最穩，送參數時一樣會被轉成字串
          label: x.label ?? String(x.value),
        }));
        setStoreOptions(opts);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("門市清單載入失敗:", e);
          setStoreError("門市清單載入失敗");
        }
      } finally {
        setStoreLoading(false);
      }
    })();
    return () => ctrl.abort();
  }, []);

  // 1) 依條件向後端查 t_Stock（用後端篩選，不在前端過濾）
  useEffect(() => {
    const ctrl = new AbortController();
    const t = setTimeout(async () => {
      setLoading(true);
      setError("");
      try {
        const url =
          API_BASE +
          "/t_Stock" +
          buildQuery({
            categoryId: category || undefined,
            productName: keyword || undefined,
            storeId: storeId || undefined, // ⬅️ 帶上門市
          });

        const res = await fetch(url, { signal: ctrl.signal });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();
        setTableData(Array.isArray(data) ? data : []);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("載入失敗:", e);
          setError("庫存載入失敗");
        }
      } finally {
        setLoading(false);
      }
    }, 250); // 關鍵字防抖

    return () => {
      clearTimeout(t);
      ctrl.abort();
    };
  }, [category, keyword, storeId]);

  // 2) 讀取 PendingOrder（未包裝）列表，建立 productId -> 數量 的對照表
  useEffect(() => {
    const ctrl = new AbortController();
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/t_SalesOrder/PendingOrder`, {
          signal: ctrl.signal,
        });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const list = await res.json();
        const arr = Array.isArray(list) ? list : [];
        setPendingList(arr);

        // 嘗試從可能的欄位推導 productId 與 pendingQty
        const map = new Map();
        for (const x of arr) {
          const productId =
            x.productId ?? x.id ?? x.product?.id ?? x.productID ?? null;
          const pendingQty =
            x.pendingQty ?? x.quantity ?? x.count ?? x.qty ?? 0;
          if (productId != null) {
            map.set(productId, (map.get(productId) || 0) + Number(pendingQty));
          }
        }
        setPendingMap(map);
      } catch (e) {
        if (e.name !== "AbortError") {
          console.error("PendingOrder 載入失敗:", e);
        }
      }
    })();
    return () => ctrl.abort();
  }, []);

  // 安全取值：不同後端欄位名的容錯
  const getProductId = (item) =>
    item.productId ?? item.id ?? item.product?.id ?? item.productID ?? null;
  const getProductName = (item) =>
    item.productName ?? item.product?.name ?? item.name ?? "";
  const getStoreQty = (item) =>
    Number(item.storeQuantity ?? item.quantity ?? 0); // 門市庫存（若後端沒有 storeQuantity，就用 quantity）
  const getTotalQty = (item) =>
    Number(
      item.totalQuantity ??
        item.totalQty ??
        item.allQuantity ??
        item.quantity ??
        0
    ); // 總庫存（若後端沒有 total，退回 quantity）
  const getSafety = (item) =>
    Number(item.safetyStock ?? item.safeQty ?? Infinity);
  const getPending = (item) => {
    const pid = getProductId(item);
    return pid != null ? pendingMap.get(pid) || 0 : 0;
  };

  // 右側：將 PendingOrder 結果與目前載入的庫存資料做 join（好顯示產品名與門市庫存）
  const pendingRows = useMemo(() => {
    const byId = new Map(tableData.map((x) => [getProductId(x), x]));
    const rows = [];
    for (const [pid, qty] of pendingMap.entries()) {
      const item = byId.get(pid);
      rows.push({
        productId: pid,
        productName: item ? getProductName(item) : `#${pid}`,
        storeQty: item ? getStoreQty(item) : 0,
        pendingQty: qty,
      });
    }
    // 大到小排序：先處理未包裝數量多的
    rows.sort((a, b) => b.pendingQty - a.pendingQty);
    return rows;
  }, [pendingMap, tableData]);

  // ✅ 清單載好後、且尚未選門市時，預設為登入者的門市
  useEffect(() => {
    if (!storeId && currentUser?.user?.storeId && storeOptions.length > 0) {
      setStoreId(String(currentUser.user.storeId));
    }
  }, [storeId, storeOptions.length, currentUser?.user?.storeId]);

  return (
    <div className="container-fluid">
      <div className="row">
        {/* 搜尋區 */}
        <div className="search-container d-flex flex-wrap gap-3 px-5 pt-4 pb-3 rounded">
          {/* 門市下拉（送 storeId） */}
          <SearchField
            type="select"
            value={storeId}
            onChange={(e) => setStoreId(e.target.value)}
            options={[...storeOptions]}
            disabled={storeLoading}
          />
          {storeError && <span style={{ color: "red" }}>{storeError}</span>}
          {/* 分類下拉（送 categoryId） */}
          <SearchField
            type="select"
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            options={[
              { value: "", label: "全部分類" },
              { value: "0", label: "澎湖特色土產海產類" },
              { value: "1", label: "自製糕餅類" },
              { value: "2", label: "澎湖冷凍海鮮產品類" },
              { value: "3", label: "澎湖海產(乾貨)類" },
            ]}
          />

          {/* 關鍵字搜尋（送 productName） */}
          <div className="search-bar">
            <FaSearch className="search-icon" />
            <input
              type="text"
              placeholder="搜尋商品名稱..."
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
            />
          </div>
        </div>

        {/* 左邊 - 全部庫存 */}
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
                  <th style={{ width: "400px" }}>商品名稱</th>
                  <th>總庫存</th>
                  <th>門市庫存</th>
                  <th>未包裝</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={4}>載入中…</td>
                  </tr>
                ) : error ? (
                  <tr>
                    <td colSpan={4} style={{ color: "red" }}>
                      {error}
                    </td>
                  </tr>
                ) : tableData.length > 0 ? (
                  tableData.map((item, index) => {
                    const name = getProductName(item);
                    const total = getTotalQty(item);
                    const store = getStoreQty(item);
                    const pending = getPending(item);
                    const safety = getSafety(item);
                    return (
                      <tr key={index}>
                        <td
                          title={name}
                          style={{
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                          }}
                        >
                          {name}
                        </td>
                        <td>{total}</td>
                        <td
                          style={{ color: store < safety ? "red" : "inherit" }}
                        >
                          {store}
                        </td>
                        <td>{pending}</td>
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td colSpan={4}>無資料</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* 右邊 - 預警／待處理（未包裝） */}
        <div className="col-5">
          <div style={{ height: "79vh", overflow: "auto" }}>
            <h5 className="no-safe-text mt-1 mb-0 py-2">
              預警（待處理 / 未包裝）
            </h5>
            <table
              className="table text-center"
              style={{ fontSize: "1.3rem", width: "90%" }}
            >
              <thead
                className="table-light"
                style={{ borderTop: "1px solid #c5c6c7" }}
              >
                <tr>
                  <th scope="col">商品名稱</th>
                  <th scope="col">未包裝</th>
                  <th scope="col">門市庫存</th>
                </tr>
              </thead>
              <tbody>
                {pendingRows.length > 0 ? (
                  pendingRows.map((row) => (
                    <tr key={row.productId}>
                      <td>{row.productName}</td>
                      <td style={{ fontWeight: 600 }}>{row.pendingQty}</td>
                      <td
                        style={{
                          color: row.storeQty === 0 ? "red" : "inherit",
                        }}
                      >
                        {row.storeQty}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={3}>目前沒有未包裝項目</td>
                  </tr>
                )}
              </tbody>
            </table>

            {/* 若你仍需要顯示「低庫存預警」，可取消下方註解（本地判斷 quantity < safetyStock） */}
            {/*
            <h6 className="mt-4 mb-2 px-3">低庫存預警</h6>
            <table className="table text-center" style={{ fontSize: "1.1rem", width: "90%" }}>
              <thead className="table-light">
                <tr>
                  <th>商品名稱</th>
                  <th>門市庫存</th>
                  <th>預警數量</th>
                </tr>
              </thead>
              <tbody>
                {tableData
                  .filter((v) => getStoreQty(v) < getSafety(v))
                  .map((v, i) => (
                    <tr key={i}>
                      <td>{getProductName(v)}</td>
                      <td style={{ color: "red" }}>{getStoreQty(v)}</td>
                      <td>{getSafety(v)}</td>
                    </tr>
                  ))}
              </tbody>
            </table>
            */}
          </div>
        </div>
      </div>
    </div>
  );
}
