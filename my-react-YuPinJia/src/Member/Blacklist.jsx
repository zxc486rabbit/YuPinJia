// Blacklist.jsx
import { useEffect, useMemo, useState } from "react";
import { Pagination, Form } from "react-bootstrap";
import "../components/Search.css";
import SearchField from "../components/SearchField";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

// 正規化（避免 null 直出）
const normalize = (x) => ({
  id: x.id,
  memberNo: x.memberNo ?? "-",
  memberName: x.memberName ?? "-",
  contactPerson: x.contactPerson ?? "-",
  contactPhone: x.contactPhone ?? "-",
  lastRepaymentDate: x.lastRepaymentDate ?? null,
  creditLimit: Number(x.creditLimit ?? 0),
  creditAmount: Number(x.creditAmount ?? 0),
  reminderCount: Number(x.reminderCount ?? 0),
  note: x.note ?? "-",
});

const fmtDate = (iso) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "-";
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const da = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${da}`;
};

export default function Blacklist() {
  // ===== 搜尋條件（即時搜尋、與網址同步）=====
  const [memberNo, setMemberNo] = useState("");
  const [memberName, setMemberName] = useState("");

  // ===== 清單 / 載入狀態 =====
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

  // ===== 取資料（相容舊/新分頁格式）=====
  const fetchBlacklist = async (query, _page = 1, _limit = limit) => {
    setLoading(true);
    try {
      const offset = (_page - 1) * _limit;

      // 後端參數（若後端忽略，稍後前端會再補濾）
      const raw = {
        memberNo: query.memberNo || undefined,
        memberName: query.memberName || undefined,
        offset,
        limit: _limit,
      };
      const params = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined && v !== "")
      );

      const res = await fetch(`${API_BASE}/t_BlackList?${new URLSearchParams(params)}`);
      const data = await res.json();

      let list = [];
      let newTotal = 0;
      let newLimit = _limit;

      if (Array.isArray(data)) {
        list = data;
        newTotal = list.length; // 舊格式無 total，只能用目前筆數估算
      } else if (data && typeof data === "object") {
        const { total: t, limit: l, items } = data;
        newTotal = typeof t === "number" ? t : 0;
        newLimit = typeof l === "number" && l > 0 ? l : _limit;
        if (Array.isArray(items)) list = Array.isArray(items[0]) ? items[0] : items;
      }

      let mapped = list.map(normalize);

      // 若後端未過濾，前端補濾
      if (query.memberNo) {
        const q = String(query.memberNo).toLowerCase();
        mapped = mapped.filter((it) => String(it.memberNo).toLowerCase().includes(q));
      }
      if (query.memberName) {
        const q = String(query.memberName).toLowerCase();
        mapped = mapped.filter((it) => String(it.memberName).toLowerCase().includes(q));
      }

      // 以最後結款日期新到舊（沒有日期放後面）
      mapped.sort((a, b) => {
        const ta = a.lastRepaymentDate ? new Date(a.lastRepaymentDate).getTime() : 0;
        const tb = b.lastRepaymentDate ? new Date(b.lastRepaymentDate).getTime() : 0;
        return tb - ta;
      });

      setRows(mapped);
      setTotal(newTotal);
      setLimit(newLimit);
    } catch (err) {
      console.error("黑名單載入失敗：", err);
      alert("黑名單資料載入失敗，請稍後再試。");
    } finally {
      setLoading(false);
    }
  };

  // 初次：讀取 URL 參數並查詢
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const init = {
      memberNo: qs.get("memberNo") || "",
      memberName: qs.get("memberName") || "",
    };
    setMemberNo(init.memberNo);
    setMemberName(init.memberName);
    setPage(1);
    fetchBlacklist(init, 1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 條件變更 → 即時查詢 + URL 同步（debounce 350ms）
  useEffect(() => {
    const query = { memberNo, memberName };

    const qs = new URLSearchParams({
      ...(memberNo ? { memberNo } : {}),
      ...(memberName ? { memberName } : {}),
    }).toString();
    window.history.pushState({}, "", `?${qs}`);

    setPage(1);
    const t = setTimeout(() => fetchBlacklist(query, 1, limit), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberNo, memberName]);

  // 分頁跳轉
  const goPage = (p) => {
    const safe = Math.min(Math.max(1, p), totalPages);
    setPage(safe);
    fetchBlacklist({ memberNo, memberName }, safe, limit);
  };

  // 每頁筆數（放在下方頁籤區）
  const handleChangePageSize = (e) => {
    const newLimit = Number(e.target.value) || 20;
    setLimit(newLimit);
    setPage(1);
    fetchBlacklist({ memberNo, memberName }, 1, newLimit);
  };

  const handleRemove = (row) => {
    // 尚未提供移除 API，先提示避免誤觸
    alert(`尚未串接「移出黑名單」API（id=${row.id}）。`);
  };

  return (
    <>
      {/* 搜尋列（即時、無按鈕） */}
      <div className="search-container d-flex flex-wrap gap-3 px-4 pt-4 pb-3 rounded">
        <SearchField
          label="會員編號"
          type="text"
          value={memberNo}
          onChange={(e) => setMemberNo(e.target.value)}
        />
        <SearchField
          label="會員名稱"
          type="text"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
        />
        {/* 右側清除 */}
        <div className="ms-auto">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setMemberNo("");
              setMemberName("");
              setPage(1);
              setTotal(0);
              window.history.pushState({}, "", window.location.pathname);
              fetchBlacklist({ memberNo: "", memberName: "" }, 1, limit);
            }}
          >
            清除搜尋
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div
        className="table-container"
        style={{ maxHeight: "79vh", overflowY: "auto", overflowX: "auto" }}
      >
        {loading ? (
          <div className="text-center py-4" style={{ color: "#28a745" }}>
            資料載入中...
          </div>
        ) : (
          <table className="table text-center" style={{ fontSize: "1.2rem" }}>
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
                <th scope="col">
                  <input type="checkbox" className="w-5 h-5 text-gray-600" disabled />
                </th>
                <th scope="col">會員編號</th>
                <th scope="col">會員名稱</th>
                <th scope="col">聯絡人</th>
                <th scope="col">聯絡電話</th>
                <th scope="col">最後結款日期</th>
                <th scope="col">信用額度</th>
                <th scope="col">賒帳總金額</th>
                <th scope="col">通知紀錄</th>
                <th scope="col">備註</th>
                <th scope="col">操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((it) => (
                  <tr key={it.id}>
                    <td>
                      <input type="checkbox" className="w-5 h-5 text-gray-600" />
                    </td>
                    <td>{it.memberNo}</td>
                    <td>{it.memberName}</td>
                    <td>{it.contactPerson}</td>
                    <td>{it.contactPhone}</td>
                    <td>{fmtDate(it.lastRepaymentDate)}</td>
                    <td>{it.creditLimit.toLocaleString()}</td>
                    <td>{it.creditAmount.toLocaleString()}</td>
                    <td>{it.reminderCount}</td>
                    <td>{it.note}</td>
                    <td>
                      <button className="edit-button" onClick={() => handleRemove(it)}>
                        移出
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="11">無資料</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
      </div>

      {/* 下方：每頁筆數 + 分頁器 */}
      <div
        className="d-flex align-items-center justify-content-end pe-3 mb-3 mt-2 flex-wrap gap-2"
        style={{
          background: "#f5f6f7",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "10px",
          paddingBottom: "10px",
        }}
      >
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

        <span className="ms-3">
          共 <strong>{total}</strong> 筆，第 <strong>{page}</strong> / {totalPages} 頁
        </span>
        <Pagination className="mb-0">
          <Pagination.First disabled={page <= 1} onClick={() => goPage(1)} />
          <Pagination.Prev disabled={page <= 1} onClick={() => goPage(page - 1)} />
          {(() => {
            const items = [];
            const start = Math.max(1, page - 2);
            const end = Math.min(totalPages, start + 4);
            for (let p = start; p <= end; p++) {
              items.push(
                <Pagination.Item key={p} active={p === page} onClick={() => goPage(p)}>
                  {p}
                </Pagination.Item>
              );
            }
            return items;
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
    </>
  );
}
