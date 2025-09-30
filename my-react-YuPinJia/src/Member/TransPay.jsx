import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Modal, Button, Form, Pagination } from "react-bootstrap";
import "../components/Search.css";
import SearchField from "../components/SearchField";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

// 付款方式 ↔ 顯示
const PAY_MAP = {
  0: "銀行轉帳",
  1: "ATM",
};
const payToLabel = (v) => {
  if (v === null || v === undefined || v === "") return "—";
  const n = /^\d+$/.test(String(v)) ? Number(v) : null;
  if (n !== null) return PAY_MAP[n] ?? String(v);
  // 有些後端直接回字串
  if (/銀行/.test(v)) return "銀行轉帳";
  if (/ATM/i.test(v)) return "ATM";
  return String(v);
};
// 顯示最後 5 碼
const last5 = (s) => {
  const v = String(s ?? "");
  return v.length > 5 ? v.slice(-5) : v || "—";
};

// 將後端記錄正規化
const normalize = (r) => ({
  id: r.id,
  memberId: r.memberId ?? 0,
  memberName: r.memberName ?? r.fullName ?? "—",
  mobile: r.mobile ?? r.phone ?? "—",
  createdAt: r.createdAt ?? r.repaymentDate ?? null, // 有些後端用 repaymentDate
  repaymentDate: r.repaymentDate ?? r.createdAt ?? null,
  repaymentMethod: r.repaymentMethod, // 0/1 或字串
  repaymentAmount: Number(r.repaymentAmount ?? 0),
  settledAmount: Number(r.settledAmount ?? 0),
  remainingBalance: Number(r.remainingBalance ?? 0),
  repaymentAccount: r.repaymentAccount ?? "",
  repaymentImage: r.repaymentImage ?? r.repaymentImageUrl ?? null, // 可能是 base64 或 URL
  remark: r.remark ?? "",
  raw: r,
});

export default function TransPay() {
  // ===== 搜尋條件（與網址同步）=====
  const [memberName, setMemberName] = useState("");
  const [mobile, setMobile] = useState("");
  const [createdAt, setCreatedAt] = useState(""); // YYYY-MM-DD
  const [repaymentMethod, setRepaymentMethod] = useState("all"); // all | 0 | 1

  // ===== 清單 / 載入 =====
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

  // ===== 影像預覽 =====
  const [previewSrc, setPreviewSrc] = useState(null);

  // 影像來源組裝
  const buildImgSrc = (val) => {
    if (!val) return null;
    const v = String(val);
    if (v.startsWith("data:image/")) return v;
    if (/^https?:\/\//i.test(v)) return v; // 直接 URL
    // 當作 base64（常見 jpeg）
    return `data:image/jpeg;base64,${v}`;
  };

  // 取得資料（相容新舊分頁格式）
  const fetchRecords = async (query, _page = 1, _limit = limit) => {
    setLoading(true);
    try {
      const offset = (_page - 1) * _limit;

      // 後端參數（若後端不支援會忽略，前端再過濾）
      const raw = {
        memberName: query.memberName || undefined,
        mobile: query.mobile || undefined,
        createdAt: query.createdAt || undefined, // YYYY-MM-DD
        repaymentMethod:
          query.repaymentMethod !== "all" ? query.repaymentMethod : undefined, // 0/1
        offset,
        limit: _limit,
      };
      const params = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined && v !== "")
      );

      const { data } = await axios.get(`${API_BASE}/t_RepaymentRecord`, {
        params,
      });

      // 相容：array 或 { total, limit, items }
      let list = [];
      let newTotal = 0;
      let newLimit = _limit;

      if (Array.isArray(data)) {
        list = data;
        newTotal = list.length;
      } else if (data && typeof data === "object") {
        const { total: t, limit: l, items } = data;
        newTotal = typeof t === "number" ? t : 0;
        newLimit = typeof l === "number" && l > 0 ? l : _limit;
        if (Array.isArray(items)) list = items;
        else if (Array.isArray(items?.[0])) list = items[0];
        else list = [];
      }

      // 正規化
      let mapped = list.map(normalize);

      // 後端若沒過濾，前端補濾
      if (query.memberName) {
        mapped = mapped.filter((r) =>
            String(r.memberName).includes(query.memberName)
        );
      }
      if (query.mobile) {
        mapped = mapped.filter((r) => String(r.mobile).includes(query.mobile));
      }
      if (query.createdAt) {
        const ymd = String(query.createdAt);
        mapped = mapped.filter((r) =>
          String(r.createdAt ?? "").startsWith(ymd)
        );
      }
      if (query.repaymentMethod !== "all") {
        const want = String(query.repaymentMethod);
        mapped = mapped.filter((r) => {
          const code = /^\d+$/.test(String(r.repaymentMethod))
            ? String(r.repaymentMethod)
            : /銀行/.test(String(r.repaymentMethod))
            ? "0"
            : /ATM/i.test(String(r.repaymentMethod))
            ? "1"
            : "";
          return code === want;
        });
      }

      // 以建立日期新到舊
      mapped.sort(
        (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
      );

      setRows(mapped);
      setTotal(newTotal);
      setLimit(newLimit);
    } catch (err) {
      console.error("載入失敗:", err);
    } finally {
      setLoading(false);
    }
  };

  // 初次載入（讀 URL 參數）
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const init = {
      memberName: qs.get("memberName") || "",
      mobile: qs.get("mobile") || "",
      createdAt: qs.get("createdAt") || "",
      repaymentMethod: qs.get("repaymentMethod") || "all",
    };
    setMemberName(init.memberName);
    setMobile(init.mobile);
    setCreatedAt(init.createdAt);
    setRepaymentMethod(init.repaymentMethod);

    setPage(1);
    fetchRecords(init, 1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 搜尋條件變更 → 自動查詢 + URL 同步（debounce 350ms）
  useEffect(() => {
    const query = {
      memberName,
      mobile,
      createdAt,
      repaymentMethod,
    };

    const qs = new URLSearchParams({
      ...(query.memberName ? { memberName: query.memberName } : {}),
      ...(query.mobile ? { mobile: query.mobile } : {}),
      ...(query.createdAt ? { createdAt: query.createdAt } : {}),
      ...(query.repaymentMethod ? { repaymentMethod: query.repaymentMethod } : {}),
    }).toString();
    window.history.pushState({}, "", `?${qs}`);

    setPage(1);
    const t = setTimeout(() => fetchRecords(query, 1, limit), 350);
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [memberName, mobile, createdAt, repaymentMethod]);

  // 分頁
  const goPage = (p) => {
    const safe = Math.min(Math.max(1, p), totalPages);
    setPage(safe);
    fetchRecords(
      {
        memberName,
        mobile,
        createdAt,
        repaymentMethod,
      },
      safe,
      limit
    );
  };

  const handleChangePageSize = (e) => {
    const newLimit = Number(e.target.value) || 20;
    setLimit(newLimit);
    setPage(1);
    fetchRecords(
      {
        memberName,
        mobile,
        createdAt,
        repaymentMethod,
      },
      1,
      newLimit
    );
  };

  return (
    <>
      {/* 搜尋列（即時、無按鈕） */}
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded align-items-center">
        <SearchField
          label="會員姓名"
          type="text"
          value={memberName}
          onChange={(e) => setMemberName(e.target.value)}
        />
        <SearchField
          label="電話"
          type="text"
          value={mobile}
          onChange={(e) => setMobile(e.target.value)}
        />
        <SearchField
          label="建立日期"
          type="date"
          value={createdAt}
          onChange={(e) => setCreatedAt(e.target.value)}
        />
        <SearchField
          label="付款方式"
          type="select"
          value={repaymentMethod}
          onChange={(e) => setRepaymentMethod(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "0", label: "銀行轉帳" },
            { value: "1", label: "ATM" },
          ]}
        />

        {/* 右側：清除 */}
        <div className="d-flex align-items-center ms-auto">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setMemberName("");
              setMobile("");
              setCreatedAt("");
              setRepaymentMethod("all");
              setPage(1);
              setTotal(0);
              window.history.pushState({}, "", window.location.pathname);
              fetchRecords(
                { memberName: "", mobile: "", createdAt: "", repaymentMethod: "all" },
                1,
                limit
              );
            }}
          >
            清除搜尋
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div
        className="table-container"
        style={{ maxHeight: "73vh", overflowY: "auto" }}
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
                borderTop: "1px solid #c5c6c7",
                position: "sticky",
                top: 0,
                background: "#d1ecf1",
                zIndex: 1,
              }}
            >
              <tr>
                <th>會員</th>
                <th>電話</th>
                <th>建立日期</th>
                <th>付款方式</th>
                <th>還款金額</th>
                <th>結清金額</th>
                <th>餘額</th>
                <th>匯款後5碼</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {rows.length > 0 ? (
                rows.map((it) => (
                  <tr key={it.id}>
                    <td>{it.memberName}</td>
                    <td>{it.mobile}</td>
                    <td>{it.createdAt ? String(it.createdAt).split("T")[0] : "—"}</td>
                    <td>{payToLabel(it.repaymentMethod)}</td>
                    <td>{Number(it.repaymentAmount).toLocaleString()}</td>
                    <td>{Number(it.settledAmount).toLocaleString()}</td>
                    <td>{Number(it.remainingBalance).toLocaleString()}</td>
                    <td>{last5(it.repaymentAccount)}</td>
                    <td>
                      <button
                        className="check-button me-2"
                        onClick={() => {
                          const src = buildImgSrc(it.repaymentImage);
                          if (!src) return;
                          setPreviewSrc(src);
                        }}
                        disabled={!it.repaymentImage}
                        title={!it.repaymentImage ? "無影像" : "查看影像"}
                      >
                        圖片
                      </button>
                      <button
                        className="delete-button"
                        onClick={() => {
                          // 這裡保留刪除流程（尚未定 API），之後再接：
                          // axios.delete(`${API_BASE}/t_RepaymentRecord/${it.id}`)
                          alert("刪除功能尚未串接 API。");
                        }}
                      >
                        刪除
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

      {/* 底部：每頁筆數 + 分頁器 */}
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

      {/* 圖片預覽 Modal */}
      <Modal show={!!previewSrc} onHide={() => setPreviewSrc(null)} centered size="lg">
        <Modal.Header closeButton>
          <Modal.Title>匯款影像</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          {previewSrc ? (
            <img
              src={previewSrc}
              alt="repayment"
              style={{ maxWidth: "100%", maxHeight: "70vh", objectFit: "contain" }}
            />
          ) : (
            <div>無影像</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setPreviewSrc(null)}>
            關閉
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
