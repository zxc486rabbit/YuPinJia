import { useState, useEffect, useMemo } from "react";
import { Modal, Button, Form, Pagination } from "react-bootstrap";
import axios from "axios";
import "../components/Search.css";
import SearchField from "../components/SearchField";
import Swal from "sweetalert2";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

export default function Give() {
  // ===== 搜尋欄位（全部後端查詢）=====
  const [product, setProduct] = useState("");     // productName
  const [recipient, setRecipient] = useState(""); // fullName
  const [operator, setOperator] = useState("");   // operatorName
  const [startDate, setStartDate] = useState(""); // YYYY-MM-DD（唯一日期條件）

  // ===== 表格/載入 =====
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===== 分頁 =====
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1); // 1-based
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, limit))),
    [total, limit]
  );

  // 最後一次查詢參數（翻頁共用）
  const lastQueryRef = useMemo(() => ({ current: {} }), []);
  const setLastQuery = (obj) => (lastQueryRef.current = obj);
  const getLastQuery = () => lastQueryRef.current || {};

  // ===== 編輯彈窗 =====
  const [showModal, setShowModal] = useState(false);
  const [editItem, setEditItem] = useState(null);

  // ★ 新增：彈窗內即時計算所需的本地狀態
  const [modalQty, setModalQty] = useState(0);
  const [modalPrice, setModalPrice] = useState(0);

  // 工具
  const formatDate = (dateStr) => {
    if (!dateStr) return "";
    const d = new Date(dateStr);
    if (Number.isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString("zh-TW");
  };
  const formatMoney = (n) => Number(n || 0).toLocaleString("zh-TW");
  const num = (v) => { // ★ 小工具：安全轉數字
    const n = Number(v);
    return Number.isFinite(n) ? n : 0;
  };

  // ===== 後端取資料（相容 array / { total, limit, items }）=====
  const fetchGiftRecords = async (query, _page = 1, _limit = limit) => {
    setLoading(true);
    try {
      const offset = (_page - 1) * _limit;
      const raw = {
        productName: query.productName || undefined,
        fullName: query.fullName || undefined,
        operatorName: query.operatorName || undefined,
        startDate: query.startDate || undefined, // ✅ 只有 startDate
        offset,
        limit: _limit,
      };
      const params = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined && v !== "")
      );

      const res = await axios.get(
        `${API_BASE}/t_SalesOrderItem/GetGiftRecord`,
        { params }
      );

      let list = [];
      let newTotal = 0;
      let newLimit = _limit;

      if (Array.isArray(res.data)) {
        list = res.data;
        newTotal = list.length; // 舊格式沒 total 只能估
      } else if (res.data && typeof res.data === "object") {
        const { total: t, limit: l, items } = res.data;
        newTotal = typeof t === "number" ? t : 0;
        newLimit = typeof l === "number" && l > 0 ? l : _limit;
        if (Array.isArray(items)) list = items;
        else if (Array.isArray(items?.[0])) list = items[0];
        else list = [];
      }

      const mapped = list.map((item) => ({
        id: item.id,
        salesOrderId: item.salesOrderId ?? item.orderNumber ?? "-",
        createdAt: item.createdAt,
        productName: item.productName ?? "-",
        unitPrice: Number(item.unitPrice ?? 0),
        quantity: Number(item.quantity ?? 0),
        // ★ 不再信任後端 subtotal，保留但前端顯示用自算
        subtotal: Number(
          item.subtotal ??
            Number(item.unitPrice ?? 0) * Number(item.quantity ?? 0)
        ),
        fullName: item.fullName ?? "-",
        operatorName: item.operatorName ?? "-",
      }));

      // 新到舊
      mapped.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

      setTableData(mapped);
      setTotal(newTotal);
      setLimit(newLimit);
    } catch (err) {
      console.error("贈送紀錄載入失敗:", err);
      Swal.fire("錯誤", "資料載入失敗，請稍後再試", "error");
    } finally {
      setLoading(false);
    }
  };

  // ===== 初次載入（帶 URL 參數）=====
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const init = {
      productName: qs.get("productName") || "",
      fullName: qs.get("fullName") || "",
      operatorName: qs.get("operatorName") || "",
      startDate: qs.get("startDate") || "", // ✅ 讀取 startDate
    };
    setProduct(init.productName);
    setRecipient(init.fullName);
    setOperator(init.operatorName);
    setStartDate(init.startDate);

    setLastQuery(init);
    setPage(1);
    fetchGiftRecords(init, 1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 條件變動 → 自動查詢（debounce 350ms）=====
  useEffect(() => {
    const query = {
      productName: product || "",
      fullName: recipient || "",
      operatorName: operator || "",
      startDate: startDate || "", // ✅ 僅帶 startDate
    };

    // 同步 URL（保留參數）
    const qs = new URLSearchParams({
      ...(query.productName ? { productName: query.productName } : {}),
      ...(query.fullName ? { fullName: query.fullName } : {}),
      ...(query.operatorName ? { operatorName: query.operatorName } : {}),
      ...(query.startDate ? { startDate: query.startDate } : {}),
    }).toString();
    window.history.pushState({}, "", `?${qs}`);

    setLastQuery(query);
    setPage(1);

    const t = setTimeout(() => fetchGiftRecords(query, 1, limit), 350);
    return () => clearTimeout(t);
    // 不含 page/limit
  }, [product, recipient, operator, startDate]); // eslint-disable-line

  // ===== 分頁動作 =====
  const goPage = (p) => {
    const safe = Math.min(Math.max(1, p), totalPages);
    setPage(safe);
    fetchGiftRecords(getLastQuery(), safe, limit);
  };
  const handleChangePageSize = (e) => {
    const newLimit = Number(e.target.value) || 20;
    setLimit(newLimit);
    setPage(1);
    fetchGiftRecords(getLastQuery(), 1, newLimit);
  };

  // ===== 編輯 =====
  const handleEditClick = (item) => {
    setEditItem(item);
    // ★ 帶入彈窗初始值
    setModalQty(item?.quantity ?? 0);
    setModalPrice(item?.unitPrice ?? 0);
    setShowModal(true);
  };
  const handleModalClose = () => {
    setShowModal(false);
    setEditItem(null);
  };

  // ★ 即時計算彈窗合計
  const modalSubtotal = useMemo(
    () => num(modalQty) * num(modalPrice),
    [modalQty, modalPrice]
  );

  return (
    <>
      {/* 搜尋列（日期與其他欄位一起，同樣格式） */}
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
        <SearchField
          label="商品"
          type="text"
          value={product}
          onChange={(e) => setProduct(e.target.value)}
        />
        <SearchField
          label="受贈人"
          type="text"
          value={recipient}
          onChange={(e) => setRecipient(e.target.value)}
        />
        <SearchField
          label="操作人"
          type="text"
          value={operator}
          onChange={(e) => setOperator(e.target.value)}
        />
        <SearchField
          label="日期"
          type="date"
          value={startDate}
          onChange={(e) => setStartDate(e.target.value)}
        />

        {/* 右側：清除搜尋 */}
        <div className="d-flex align-items-center ms-auto gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setProduct("");
              setRecipient("");
              setOperator("");
              setStartDate("");
              setPage(1);
              setTotal(0);
              window.history.pushState({}, "", window.location.pathname);
              const empty = {};
              setLastQuery(empty);
              fetchGiftRecords(empty, 1, limit);
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
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "1.2rem", color: "#28a745" }}
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
              <th>訂單編號</th>
              <th>日期</th>
              <th>商品名稱</th>
              <th>單價</th>
              <th>數量</th>
              <th>合計</th>
              <th>受贈人</th>
              <th>操作人</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item) => {
                // ★ 合計一律用「單價 × 數量」計算
                const rowSubtotal = num(item.unitPrice) * num(item.quantity);
                return (
                  <tr key={item.id}>
                    <td>{item.salesOrderId}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{item.productName}</td>
                    <td>{formatMoney(item.unitPrice)}</td>
                    <td>{item.quantity}</td>
                    <td>{formatMoney(rowSubtotal)}</td> {/* ★ 這裡改了 */}
                    <td>{item.fullName}</td>
                    <td>{item.operatorName}</td>
                    <td>
                      <button className="edit-button" onClick={() => handleEditClick(item)}>
                        修改
                      </button>
                    </td>
                  </tr>
                );
              })
            ) : (
              <tr>
                <td colSpan="9">無資料</td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 表格底部：每頁筆數 + 分頁器 */}
      <div className="d-flex align-items-center justify-content-end mt-2 ps-3 pe-3 mb-3">
        <div className="d-flex align-items-center flex-wrap gap-2 justify-content-end">
          <div className="d-flex align-items-center">
            <span className="me-2">每頁</span>
            <select
              className="form-select form-select-sm"
              style={{ width: 100 }}
              value={limit}
              onChange={handleChangePageSize}
            >
              {[10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
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

      {/* 編輯彈出框 */}
      <Modal show={showModal} onHide={handleModalClose} centered>
        <Modal.Header
          closeButton
          className="give-modal-header"
          style={{ backgroundColor: "#3D7EA6", color: "white" }}
        >
          <Modal.Title>贈送紀錄</Modal.Title>
          <style>
            {`
              .give-modal-header .btn-close {
                filter: invert(1);
              }
            `}
          </style>
        </Modal.Header>
        <Modal.Body>
          {editItem && (
            <div style={{ fontSize: "1.2rem", lineHeight: "2" }}>
              <div>商品：{editItem.productName}</div>
              <div>日期：{formatDate(editItem.createdAt)}</div>
              <div>
                數量：
                {/* ★ 即時更新 modalQty */}
                <Form.Control
                  type="number"
                  value={modalQty}
                  min="0"
                  onChange={(e) => setModalQty(e.target.value)}
                  className="my-1"
                />
              </div>
              <div>
                銷售價格：
                {/* ★ 即時更新 modalPrice */}
                <Form.Control
                  type="number"
                  value={modalPrice}
                  min="0"
                  step="0.01"
                  onChange={(e) => setModalPrice(e.target.value)}
                  className="my-1"
                />
              </div>
              {/* ★ 合計 = 單價 × 數量（即時計算） */}
              <div>合計：{formatMoney(modalSubtotal)}</div>
              <div>受贈人：{editItem.fullName}</div>
              <div>操作人：{editItem.operatorName}</div>
            </div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="check-button"
            onClick={() => {
              // 這裡未串更新 API，僅示意（保留你原本的提示）
              Swal.fire("提示", "此功能可再串接更新 API。", "info");
              handleModalClose();
            }}
          >
            確認
          </Button>
          <Button className="cancel-button" onClick={handleModalClose}>
            取消
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
