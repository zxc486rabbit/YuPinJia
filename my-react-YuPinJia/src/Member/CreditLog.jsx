import { useState, useEffect, useMemo, useCallback } from "react";
import "../components/Search.css";
import SearchField from "../components/SearchField";
import Swal from "sweetalert2";
import { Pagination, Form } from "react-bootstrap";
import axios from "axios";
import CreditSettleModal from "./CreditSettleModal";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

// 金額格式
const money = (n) => Number(n || 0).toLocaleString("zh-TW");

// 將 API 回傳整理為表格使用的結構
const normalizeRow = (item) => ({
  id: item.id,
  memberId: item.memberId,
  memberNo: item.memberNo || "-",
  fullName: item.fullName || "-",
  contact: item.contact ?? item.contactPerson ?? "-", // 若有聯絡人就帶
  billingDate: item.billingDate?.split("T")[0] || "-",
  creditAmount: Number(item.creditAmount ?? 0),
  reminderCount: Number(item.reminderCount ?? 0),
  lastRepaymentDate: item.lastRepaymentDate
    ? item.lastRepaymentDate.split("T")[0]
    : "-",
  // 這裡先用 reminderCount＞0 推斷未還款，如後端有明確欄位可替換
  status: (item.reminderCount ?? 0) > 0 ? "未還款" : "已還款",

  // 原始欄位保留
  raw: item,
});

export default function CreditLog() {
  // ===== 搜尋欄位（與網址同步）=====
  const [memberNo, setMemberNo] = useState("");
  const [status, setStatus] = useState("all"); // all / 未還款 / 已還款
  const [billingDate, setBillingDate] = useState("");

  // ===== 表格 / 載入 =====
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===== 分頁 =====
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1); // 1-based
  const totalPages = useMemo(
    () => Math.max(1, Math.ceil(total / Math.max(1, limit))),
    [total, limit]
  );

  // 記住最後一次查詢（翻頁沿用）
  const lastQueryRef = useMemo(() => ({ current: {} }), []);
  const setLastQuery = (obj) => (lastQueryRef.current = obj);
  const getLastQuery = () => lastQueryRef.current || {};

  // ===== 勾選列印 =====
  const [checkedIds, setCheckedIds] = useState([]);

  // ===== 提醒狀態 =====
  const [remindingId, setRemindingId] = useState(null);

  // ===== 結清 Modal =====
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const openSettleModal = (row) => {
    setSelectedOrder(row);
    setShowSettleModal(true);
  };
  const closeSettleModal = () => {
    setShowSettleModal(false);
    setSelectedOrder(null);
  };

  // ===== 取資料（相容新舊分頁回傳）=====
  const fetchCreditRecords = useCallback(
    async (query, _page = 1, _limit = limit) => {
      setLoading(true);
      try {
        const offset = (_page - 1) * _limit;

        // 後端查詢參數（若後端尚未支援，會被忽略；我們再做前端濾）
        const raw = {
          memberNo: query.memberNo || undefined,
          billingDate: query.billingDate || undefined, // YYYY-MM-DD
          status: query.status && query.status !== "all" ? query.status : undefined, // 未還款/已還款（若後端不認得可忽略）
          offset,
          limit: _limit,
        };
        const params = Object.fromEntries(
          Object.entries(raw).filter(([, v]) => v !== undefined && v !== "")
        );

        const res = await axios.get(`${API_BASE}/t_CreditRecord`, { params });

        // 相容：array 或 { total, limit, items }
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
          if (Array.isArray(items)) list = items;
          else if (Array.isArray(items?.[0])) list = items[0];
          else list = [];
        }

        // 正規化
        let mapped = list.map(normalizeRow);

        // 後端若未過濾，前端再補一層
        if (query.memberNo) {
          mapped = mapped.filter((r) =>
            String(r.memberNo).includes(query.memberNo)
          );
        }
        if (query.billingDate) {
          mapped = mapped.filter((r) => String(r.billingDate) === query.billingDate);
        }
        if (query.status && query.status !== "all") {
          mapped = mapped.filter((r) => r.status === query.status);
        }

        // 依帳單日期新到舊
        mapped.sort(
          (a, b) => new Date(b.raw?.billingDate ?? 0) - new Date(a.raw?.billingDate ?? 0)
        );

        setRows(mapped);
        setTotal(newTotal);
        setLimit(newLimit);
      } catch (err) {
        console.error("賒帳紀錄載入失敗：", err);
        Swal.fire("錯誤", "資料載入失敗，請稍後再試", "error");
      } finally {
        setLoading(false);
      }
    },
    [limit]
  );

  // ===== 初次載入（帶 URL 參數）=====
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const init = {
      memberNo: qs.get("memberNo") || "",
      billingDate: qs.get("billingDate") || "",
      status: qs.get("status") || "all",
    };
    setMemberNo(init.memberNo);
    setBillingDate(init.billingDate);
    setStatus(init.status);

    setLastQuery(init);
    setPage(1);
    fetchCreditRecords(init, 1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 條件變動 → 自動查詢（debounce 350ms） + URL 同步 =====
  useEffect(() => {
    const query = {
      memberNo: memberNo || "",
      billingDate: billingDate || "",
      status: status || "all",
    };

    // URL 同步
    const qs = new URLSearchParams({
      ...(query.memberNo ? { memberNo: query.memberNo } : {}),
      ...(query.billingDate ? { billingDate: query.billingDate } : {}),
      ...(query.status ? { status: query.status } : {}),
    }).toString();
    window.history.pushState({}, "", `?${qs}`);

    setLastQuery(query);
    setPage(1);

    const t = setTimeout(() => fetchCreditRecords(query, 1, limit), 350);
    return () => clearTimeout(t);
    // 不含 page/limit
  }, [memberNo, billingDate, status, fetchCreditRecords, limit]);

  // ===== 分頁 =====
  const goPage = (p) => {
    const safe = Math.min(Math.max(1, p), totalPages);
    setPage(safe);
    fetchCreditRecords(getLastQuery(), safe, limit);
  };
  const handleChangePageSize = (e) => {
    const newLimit = Number(e.target.value) || 20;
    setLimit(newLimit);
    setPage(1);
    fetchCreditRecords(getLastQuery(), 1, newLimit);
  };

  // ===== 勾選 =====
  const toggleCheck = (id) => {
    setCheckedIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  // ===== 提醒（後端 +1）=====
  const handleRemind = async (row) => {
    if (remindingId) return;
    setRemindingId(row.id);
    try {
      const res = await axios.put(
        `${API_BASE}/t_CreditRecord/CreditReminder/${row.id}`,
        null
      );
      const nextCount =
        typeof res?.data?.reminderCount === "number"
          ? res.data.reminderCount
          : (row.reminderCount ?? 0) + 1;

      setRows((prev) =>
        prev.map((r) =>
          r.id === row.id ? { ...r, reminderCount: nextCount, status: "未還款" } : r
        )
      );
      Swal.fire("已發送提醒 (+1)", "", "success");
    } catch (err) {
      console.error("更新提醒次數失敗:", err);
      Swal.fire("提醒失敗", "", "error");
    } finally {
      setRemindingId(null);
    }
  };

  // ===== 列印勾選清單 =====
  const handlePrint = () => {
    if (checkedIds.length === 0) {
      Swal.fire("請至少勾選一筆資料", "", "warning");
      return;
    }
    const selected = rows.filter((r) => checkedIds.includes(r.id));
    const html = `
      <html>
        <head>
          <title>列印結清單</title>
          <style>
            body { font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: center; }
            h3 { margin: 0; }
          </style>
        </head>
        <body>
          <h3>結清單</h3>
          <table>
            <thead>
              <tr>
                <th>會員編號</th>
                <th>會員名稱</th>
                <th>帳單日期</th>
                <th>賒帳金額</th>
                <th>提醒次數</th>
              </tr>
            </thead>
            <tbody>
              ${selected
                .map(
                  (r) => `
                  <tr>
                    <td>${r.memberNo}</td>
                    <td>${r.fullName}</td>
                    <td>${r.billingDate}</td>
                    <td>${money(r.creditAmount)}</td>
                    <td>${r.reminderCount}</td>
                  </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    const w = window.open("", "_blank");
    w.document.write(html);
    w.document.close();
    w.print();
  };

  return (
    <>
      {/* 搜尋列（無按鈕，輸入即查） */}
      <div className="search-container d-flex flex-wrap gap-3 px-4 pt-4 pb-3 rounded align-items-center">
        <SearchField
          label="會員編號"
          type="text"
          value={memberNo}
          onChange={(e) => setMemberNo(e.target.value)}
        />
        <SearchField
          label="帳單日期"
          type="date"
          value={billingDate}
          onChange={(e) => setBillingDate(e.target.value)}
        />
        <SearchField
          label="狀態"
          type="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "未還款", label: "未還款" },
            { value: "已還款", label: "已還款" },
          ]}
        />

        {/* 右側：清除 */}
        <div className="d-flex align-items-center ms-auto gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setMemberNo("");
              setBillingDate("");
              setStatus("all");
              setCheckedIds([]);
              setPage(1);
              setTotal(0);
              window.history.pushState({}, "", window.location.pathname);
              const empty = { memberNo: "", billingDate: "", status: "all" };
              setLastQuery(empty);
              fetchCreditRecords(empty, 1, limit);
            }}
          >
            清除搜尋
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div
        className="table-container"
        style={{ maxHeight: "73vh", overflowY: "auto", overflowX: "auto" }}
      >
        {loading ? (
          <div className="text-center py-4" style={{ color: "#28a745" }}>
            資料載入中...
          </div>
        ) : (
          <table className="table text-center" style={{ fontSize: "1.1rem" }}>
            <thead
              className="table-light"
              style={{
                position: "sticky",
                top: 0,
                background: "#d1ecf1",
                zIndex: 1,
                borderBlock: "1px solid #c5c6c7",
              }}
            >
              <tr>
                <th style={{ width: 40 }}>
                  <input
                    type="checkbox"
                    aria-label="select all"
                    onChange={(e) => {
                      if (e.target.checked) {
                        setCheckedIds(rows.map((r) => r.id));
                      } else {
                        setCheckedIds([]);
                      }
                    }}
                    checked={rows.length > 0 && checkedIds.length === rows.length}
                    indeterminate={
                      rows.length > 0 &&
                      checkedIds.length > 0 &&
                      checkedIds.length < rows.length
                    }
                  />
                </th>
                <th>會員編號</th>
                <th>會員名稱</th>
                <th>聯絡人</th>
                <th>帳單日期</th>
                <th>賒帳金額</th>
                <th>提醒次數</th>
                <th>狀態</th>
                <th style={{ width: 180 }}>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((r) => (
                  <tr key={r.id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={checkedIds.includes(r.id)}
                        onChange={() => toggleCheck(r.id)}
                      />
                    </td>
                    <td>{r.memberNo}</td>
                    <td>{r.fullName}</td>
                    <td>{r.contact}</td>
                    <td>{r.billingDate}</td>
                    <td>{money(r.creditAmount)}</td>
                    <td>{r.reminderCount}</td>
                    <td>
                      {r.status === "未還款" ? (
                        <span className="badge bg-warning text-dark">未還款</span>
                      ) : (
                        <span className="badge bg-success">已還款</span>
                      )}
                    </td>
                    <td>
                      <button
                        className="edit-button me-2"
                        onClick={() => handleRemind(r)}
                        disabled={remindingId === r.id}
                        title={remindingId === r.id ? "送出中…" : undefined}
                      >
                        {remindingId === r.id ? "送出中…" : "提醒"}
                      </button>
                      <button
                        className="edit-button"
                        onClick={() => openSettleModal(r)}
                      >
                        結清
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="9">無資料</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 底部：列印 + 每頁筆數 + 分頁器 */}
      <div
        className="d-flex align-items-center justify-content-between mt-2 ps-3 pe-3 mb-3 flex-wrap gap-3"
        style={{
          background: "#f5f6f7",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "10px",
          paddingBottom: "10px",
        }}
      >
        <div>
          <button
            className="pink-button me-3"
            style={{ fontSize: "1.1rem" }}
            onClick={handlePrint}
          >
            列印結清單
          </button>
        </div>

        <div className="d-flex align-items-center ms-auto flex-wrap gap-2">
          {/* 每頁筆數 */}
          <div className="d-flex align-items-center">
            <span className="me-2">每頁</span>
            <Form.Select
              size="sm"
              value={limit}
              onChange={handleChangePageSize}
              style={{ width: 100 }}
            >
              {[10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </Form.Select>
            <span className="ms-2">筆</span>
          </div>

          {/* 分頁器 */}
          <span className="ms-3">
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
            <Pagination.Next
              disabled={page >= totalPages}
              onClick={() => goPage(page + 1)}
            />
            <Pagination.Last
              disabled={page >= totalPages}
              onClick={() => goPage(totalPages)}
            />
          </Pagination>
        </div>
      </div>

      {/* 結清 Modal（成功後重抓主表） */}
      <CreditSettleModal
        show={showSettleModal}
        onClose={closeSettleModal}
        creditRecordId={selectedOrder?.id}
        onSettled={() => fetchCreditRecords(getLastQuery(), page, limit)}
      />
    </>
  );
}
