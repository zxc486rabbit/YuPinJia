import { useState, useEffect, useMemo } from "react";
import "../../components/Search.css";
import SearchField from "../../components/SearchField";
import MemberDetailModal from "./MemberDetailModal";
import DistributorInfoModal from "./DistributorInfoModal";
import MemberEditModal from "./MemberEditModal";
import WithdrawModal from "./WithdrawModal";
import axios from "axios";
import { Pagination, Form } from "react-bootstrap";

// 顯示會員類型
const displayMemberType = (mt) => {
  if (mt === 1 || mt === "1" || mt === "一般會員") return "一般會員";
  if (mt === 2 || mt === "2" || mt === "導遊") return "導遊";
  if (mt === 3 || mt === "3" || mt === "廠商" || mt === "經銷商") return "廠商";
  return String(mt ?? "");
};

// 折扣率顯示：0.9 => 90%，2 => 2%，null => "-"
const formatDiscount = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const num = Number(v);
  if (Number.isNaN(num)) return "-";
  return num <= 1 ? `${Math.round(num * 100)}%` : `${num}%`;
};

// 將 API 回傳統一成表格用的形狀與型別
const normalizeMember = (m) => {
  const toNum = (v) =>
    v === null || v === undefined || v === "" ? 0 : Number(v);
  return {
    ...m,
    id: Number(m?.id ?? m?.memberId ?? 0),
    memberNo: String(m?.memberNo ?? ""),
    fullName: String(m?.fullName ?? ""),
    contactPhone: String(m?.contactPhone ?? ""),
    contactAddress: String(m?.contactAddress ?? ""),
    createdAt: m?.createdAt ?? null,
    memberLevel: toNum(m?.memberLevel),
    accountBalance: toNum(m?.accountBalance),
    cashbackPoint: toNum(m?.cashbackPoint),
    referredBy: String(m?.referredBy ?? ""),
    memberType: m?.memberType ?? "",
    isDistributor: Boolean(m?.isDistributor),
    discountRate:
      m?.discountRate === null ||
      m?.discountRate === undefined ||
      m?.discountRate === ""
        ? null
        : Number(m.discountRate),
  };
};

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

export default function MemberOverview() {
  // ── 搜尋條件 ──────────────────────────────────────────
  const [orderId, setOrderId] = useState(""); // 會員編號
  const [contactPhone, setContactPhone] = useState(""); // 聯絡電話
  const [status, setStatus] = useState("all"); // 會員類型
  const [selectedMonth, setSelectedMonth] = useState("2025-08"); // 消費情形用

  // ── 清單資料/狀態 ─────────────────────────────────────
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  // 高亮那一列（1.8s 自動清除）
  const [highlightId, setHighlightId] = useState(null);
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(t);
  }, [highlightId]);

  // ── 分頁狀態（新 API）─────────────────────────────────
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1); // 1-based
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  // 記住最後一次查詢（翻頁沿用）
  const lastQueryRef = useMemo(() => ({ current: {} }), []);
  const setLastQuery = (obj) => (lastQueryRef.current = obj);
  const getLastQuery = () => lastQueryRef.current || {};

  // ── Modal 狀態 ────────────────────────────────────────
  const [showModal, setShowModal] = useState(false); // 消費情形
  const [selectedDetail, setSelectedDetail] = useState(null);
  const [memberId, setMemberId] = useState(null);

  const [showDistributorModal, setShowDistributorModal] = useState(false);
  const [selectedDistributor, setSelectedDistributor] = useState(null);

  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedMember, setSelectedMember] = useState(null);

  const [showWithdrawModal, setShowWithdrawModal] = useState(false);
  const [withdrawMember, setWithdrawMember] = useState(null);

  // 只顯示 YYYY/MM/DD
  const formatDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return String(iso);
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, "0");
    const day = String(d.getDate()).padStart(2, "0");
    return `${y}/${m}/${day}`;
  };

  // 相容舊/新分頁格式的抓取
  const fetchMembers = async (query, _page = 1, _limit = limit) => {
    setLoading(true);
    try {
      const offset = (_page - 1) * _limit;
      const params = {
        memberNo: query?.memberNo,
        contactPhone: query?.contactPhone,
        memberType: query?.memberType,
        offset,
        limit: _limit,
      };
      Object.keys(params).forEach(
        (k) => params[k] === undefined && delete params[k]
      );

      const { data } = await axios.get(`${API_BASE}/t_Member`, { params });

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

        if (Array.isArray(items)) {
          list = Array.isArray(items[0]) ? items[0] : items;
        }
      }

      list.sort(
        (a, b) => new Date(b.createdAt ?? 0) - new Date(a.createdAt ?? 0)
      );
      const mapped = list.map(normalizeMember);

      setTableData(mapped);
      setTotal(newTotal);
      setLimit(newLimit);
      setLoading(false);
    } catch (err) {
      console.error("載入會員資料失敗", err);
      setLoading(false);
    }
  };

  // 初次載入（可讀 URL 參數：memberNo/contactPhone/memberType）
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const initParams = {
      memberNo: qs.get("memberNo") || undefined,
      contactPhone: qs.get("contactPhone") || undefined,
      memberType: (() => {
        const v = qs.get("memberType");
        if (!v || v === "all") return undefined;
        return /^\d+$/.test(v) ? Number(v) : undefined;
      })(),
    };
    setOrderId(initParams.memberNo || "");
    setContactPhone(initParams.contactPhone || "");
    setStatus(qs.get("memberType") || "all");

    setLastQuery(initParams);
    setPage(1);
    fetchMembers(initParams, 1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 搜尋條件變更 → 自動（debounce）查詢 + 同步 URL
  useEffect(() => {
    const raw = {
      memberNo: orderId || undefined,
      contactPhone: contactPhone || undefined,
      memberType: status !== "all" ? Number(status) : undefined,
    };
    const params = Object.fromEntries(
      Object.entries(raw).filter(([, v]) => v !== undefined)
    );

    // URL 同步
    const queryString = new URLSearchParams({
      ...(params.memberNo ? { memberNo: params.memberNo } : {}),
      ...(params.contactPhone ? { contactPhone: params.contactPhone } : {}),
      ...(status ? { memberType: status } : {}),
    }).toString();
    window.history.pushState({}, "", `?${queryString}`);

    // 記住條件、回第 1 頁
    setLastQuery(params);
    setPage(1);

    const t = setTimeout(() => {
      fetchMembers(params, 1, limit);
    }, 350); // debounce
    return () => clearTimeout(t);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [orderId, contactPhone, status]);

  // 分頁跳轉
  const goPage = (p) => {
    const safe = Math.min(Math.max(1, p), totalPages);
    setPage(safe);
    fetchMembers(getLastQuery(), safe, limit);
  };

  // 每頁筆數（已移到下方分頁器）
  const handleChangePageSize = (e) => {
    const newLimit = Number(e.target.value) || 20;
    setLimit(newLimit);
    setPage(1);
    fetchMembers(getLastQuery(), 1, newLimit);
  };

  // 消費情形
  const handleViewConsumption = (memberId) => {
    const apiUrl = `${API_BASE}/t_SalesOrder/GetSalesOrderByMember?memberId=${memberId}&filterMonth=${selectedMonth}`;
    axios
      .get(apiUrl)
      .then((response) => {
        setSelectedDetail(response.data);
        setMemberId(memberId);
        setShowModal(true);
      })
      .catch((error) => {
        console.error("載入消費情形失敗：", error);
      });
  };

  // 月份變更時，若視窗開啟則重抓
  useEffect(() => {
    if (selectedDetail && memberId && selectedMonth) {
      const apiUrl = `${API_BASE}/t_SalesOrder/GetSalesOrderByMember?memberId=${memberId}&filterMonth=${selectedMonth}`;
      axios
        .get(apiUrl)
        .then((response) => setSelectedDetail(response.data))
        .catch((error) => console.error("載入消費情形失敗：", error));
    }
  }, [selectedMonth, selectedDetail, memberId]);

  // 編輯
  const handleEditMember = (member) => {
    setSelectedMember({ id: member.id, memberType: member.memberType });
    setShowEditModal(true);
  };

  const refreshMemberRow = async (id) => {
    try {
      const { data } = await axios.get(`${API_BASE}/t_Member/${id}`, {
        params: { _t: Date.now() },
        headers: { "Cache-Control": "no-cache" },
      });
      const next = normalizeMember(data);
      setTableData((prev) => {
        const hasRow = prev.some((m) => Number(m.id) === Number(id));
        if (!hasRow) return prev;
        return prev.map((m) =>
          Number(m.id) === Number(id) ? { ...m, ...next } : m
        );
      });
      setHighlightId(Number(id));
    } catch (err) {
      console.error("單列刷新失敗：", err);
    }
  };

  const handleUpdateMember = (updatedMember) => {
    axios
      .put(`${API_BASE}/t_Member/${updatedMember.id}`, updatedMember)
      .then(() => {
        setShowEditModal(false);
        refreshMemberRow(updatedMember.id);
      })
      .catch((error) => {
        console.error("更新失敗", error);
      });
  };

  // 提現成功：樂觀更新 + 重抓
  const handleWithdrawSuccess = async (updatedMember) => {
    const patched = normalizeMember(updatedMember);
    setTableData((prev) =>
      prev.map((m) => (Number(m.id) === Number(patched.id) ? patched : m))
    );
    setHighlightId(Number(patched.id));
    setShowWithdrawModal(false);
    setWithdrawMember(null);
    await fetchMembers(getLastQuery(), page, limit);
    setHighlightId(Number(patched.id));
  };

  return (
    <>
      {/* 高亮動畫 */}
      <style>{`
        @keyframes rowFlash {
          0%   { background-color: #fff6bf; }
          50%  { background-color: #fff0a6; }
          100% { background-color: transparent; }
        }
        .row-highlight td { animation: rowFlash 1.8s ease-out 0s 1 both; }
      `}</style>

      {/* 搜尋列（即時搜尋，無按鈕） */}
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded align-items-center">
        <SearchField
          label="會員編號"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="聯絡電話"
          type="text"
          value={contactPhone}
          onChange={(e) => setContactPhone(e.target.value)}
        />
        <SearchField
          label="會員類型"
          type="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "1", label: "一般會員" },
            { value: "2", label: "導遊" },
            { value: "3", label: "廠商" },
          ]}
        />

        {/* 右側：清除（頁數選擇已移至下方） */}
        <div className="d-flex align-items-center ms-auto gap-2">
          <button
            className="btn btn-outline-secondary"
            onClick={() => {
              setOrderId("");
              setContactPhone("");
              setStatus("all");
              setPage(1);
              setTotal(0);
              window.history.pushState({}, "", window.location.pathname);
              const empty = {};
              setLastQuery(empty);
              fetchMembers(empty, 1, limit);
            }}
          >
            清除搜尋
          </button>
        </div>
      </div>

      {/* 表格 */}
      <div
        className="table-container position-relative"
        style={{ maxHeight: "79vh", overflowY: "auto" }}
      >
        {loading ? (
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "50%",
              transform: "translate(-50%, -50%)",
              fontSize: "1.2rem",
              color: "#28a745",
            }}
          >
            加載中...
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
                <th>會員編號</th>
                <th>會員名稱</th>
                <th>聯絡電話</th>
                <th>建立日期</th>
                <th>等級</th>
                <th>餘額</th>
                <th>點數</th>
                <th>會員類型</th>
                <th>折扣率</th>
                <th>消費情形</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length > 0 ? (
                tableData.map((item) => (
                  <tr
                    key={item.id}
                    className={item.id === highlightId ? "row-highlight" : ""}
                  >
                    <td>{item.memberNo}</td>
                    <td>{item.fullName}</td>
                    <td>{item.contactPhone}</td>
                    <td>{formatDate(item.createdAt)}</td>
                    <td>{item.memberLevel}</td>
                    <td>{Number(item.accountBalance).toLocaleString()}</td>
                    <td>{Number(item.cashbackPoint).toLocaleString()}</td>
                    <td>{displayMemberType(item.memberType)}</td>
                    <td>{formatDiscount(item.discountRate)}</td>
                    <td>
                      <button
                        className="check-button"
                        onClick={() => handleViewConsumption(item.id)}
                      >
                        檢視
                      </button>
                    </td>
                    <td>
                      <button
                        className="edit-button"
                        onClick={() => {
                          setShowEditModal(true);
                          handleEditMember(item);
                        }}
                      >
                        編輯
                      </button>
                      <button
                        className="check-button ms-2"
                        style={{
                          backgroundColor: "#E02900",
                          borderColor: "#E02900",
                          color: "#fff",
                          padding: "6px 12px",
                          borderRadius: "8px",
                        }}
                        onClick={() => {
                          setWithdrawMember(item);
                          setShowWithdrawModal(true);
                        }}
                      >
                        提現
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

      {/* 底部：每頁筆數 + 分頁器（已把「每頁」移到這裡） */}
      <div
        className="d-flex align-items-center justify-content-end pe-3"
        style={{
          marginTop: "-6px",
          background: "#f5f6f7",
          borderTop: "1px solid #e5e7eb",
          paddingTop: "12px",
          paddingBottom: "10px",
          gap: "12px",
          flexWrap: "wrap",
        }}
      >
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
        <span className="ms-2 me-2">
          共 <strong>{total}</strong> 筆，第 <strong>{page}</strong> / {totalPages} 頁
        </span>
        <Pagination className="mb-0">
          <Pagination.First disabled={page <= 1} onClick={() => goPage(1)} />
          <Pagination.Prev
            disabled={page <= 1}
            onClick={() => goPage(page - 1)}
          />
          {(() => {
            const pages = [];
            const start = Math.max(1, page - 2);
            const end = Math.min(totalPages, start + 4);
            for (let p = start; p <= end; p++) {
              pages.push(
                <Pagination.Item
                  key={p}
                  active={p === page}
                  onClick={() => goPage(p)}
                >
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

      {/* 消費情形 */}
      <MemberDetailModal
        show={showModal}
        onHide={() => setShowModal(false)}
        detailData={selectedDetail}
        selectedMonth={selectedMonth}
        setSelectedMonth={setSelectedMonth}
        memberId={memberId}
      />
      {/* 經銷 */}
      <DistributorInfoModal
        show={showDistributorModal}
        onHide={() => setShowDistributorModal(false)}
        info={selectedDistributor}
      />
      {/* 編輯 */}
      <MemberEditModal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        member={selectedMember}
        onSave={handleUpdateMember}
      />
      {/* 提現 */}
      <WithdrawModal
        show={showWithdrawModal}
        onHide={() => {
          setShowWithdrawModal(false);
          setWithdrawMember(null);
        }}
        member={withdrawMember}
        onSuccess={handleWithdrawSuccess}
      />
    </>
  );
}
