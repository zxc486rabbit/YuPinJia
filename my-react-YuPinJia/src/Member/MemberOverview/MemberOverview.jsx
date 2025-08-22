import { useState, useEffect, useCallback } from "react";
import "../../components/Search.css"; // 引入搜尋框的 CSS 來調整樣式
import SearchField from "../../components/SearchField"; // 引入搜尋框模組
import MemberDetailModal from "./MemberDetailModal"; // 消費情形
import DistributorInfoModal from "./DistributorInfoModal"; // 經銷
import MemberEditModal from "./MemberEditModal"; // 編輯
import WithdrawModal from "./WithdrawModal"; // ⬅️ 提現
import axios from "axios";

const displayMemberType = (mt) => {
  if (mt === 1 || mt === "1" || mt === "一般會員") return "一般會員";
  if (mt === 2 || mt === "2" || mt === "導遊") return "導遊";
  if (mt === 3 || mt === "3" || mt === "廠商" || mt === "經銷商") return "廠商";
  return String(mt ?? "");
};

// 折扣率顯示：0.9 => 90%，2 => 2%，null/undefined => "-"
const formatDiscount = (v) => {
  if (v === null || v === undefined || v === "") return "-";
  const num = Number(v);
  if (Number.isNaN(num)) return "-";
  return num <= 1 ? `${Math.round(num * 100)}%` : `${num}%`;
};

// 將 API 回傳統一成表格用的形狀與型別
const normalizeMember = (m) => {
  const toNum = (v) => (v === null || v === undefined || v === "" ? 0 : Number(v));
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
    cashbackPoint: toNum(m?.cashbackPoint), // ← 重點：只讀 cashbackPoint
    referredBy: String(m?.referredBy ?? ""),
    memberType: m?.memberType ?? "",
    isDistributor: Boolean(m?.isDistributor),
    discountRate:
      m?.discountRate === null || m?.discountRate === undefined || m?.discountRate === ""
        ? null
        : Number(m.discountRate),
  };
};

export default function MemberOverview() {
  const [orderId, setOrderId] = useState(""); // 會員編號搜尋條件
  const [contactPhone, setContactPhone] = useState(""); // 聯絡電話搜尋條件
  const [status, setStatus] = useState("all"); // 會員類型搜尋條件
  const [selectedMonth, setSelectedMonth] = useState("2025-08"); // 默認月份

  const [tableData, setTableData] = useState([]); // 表格資料
  const [loading, setLoading] = useState(false); // 加載狀態

  const [showModal, setShowModal] = useState(false); // 消費情形
  const [selectedDetail, setSelectedDetail] = useState(null); // 消費情形
  const [memberId, setMemberId] = useState(null); // 消費情形 MemberId

  const [showDistributorModal, setShowDistributorModal] = useState(false); // 經銷
  const [selectedDistributor, setSelectedDistributor] = useState(null); // 經銷

  const [showEditModal, setShowEditModal] = useState(false); // 編輯
  const [selectedMember, setSelectedMember] = useState(null); // 編輯

  const [showWithdrawModal, setShowWithdrawModal] = useState(false); // 提現 Modal
  const [withdrawMember, setWithdrawMember] = useState(null); // 提現對象

  // 高亮那一列的 id（1.8s 自動清除）
  const [highlightId, setHighlightId] = useState(null);
  useEffect(() => {
    if (!highlightId) return;
    const t = setTimeout(() => setHighlightId(null), 1800);
    return () => clearTimeout(t);
  }, [highlightId]);

  // ✅ 統一抓會員清單（會帶目前搜尋條件）
  const fetchMembers = useCallback(async () => {
    const apiUrl = "https://yupinjia.hyjr.com.tw/api/api/t_Member";
    const params = {
      memberNo: orderId || undefined,
      contactPhone: contactPhone || undefined,
      memberType: status !== "all" ? Number(status) : undefined, // 若後端改用字串也能相容（Number("1")=1）
    };
    try {
      setLoading(true);
      const { data } = await axios.get(apiUrl, { params });
    const list = Array.isArray(data) ? data.map(normalizeMember) : [];
    setTableData(list);
    return list; // ← 讓外面可以 await
    } catch (err) {
      console.error("載入會員資料失敗", err);
    } finally {
      setLoading(false);
    }
  }, [orderId, contactPhone, status]);

  // 只刷新某一位會員資料（避免整表重抓）
  const refreshMemberRow = useCallback(async (id) => {
    try {
      const { data } = await axios.get(
        `https://yupinjia.hyjr.com.tw/api/api/t_Member/${id}`,
        {
          params: { _t: Date.now() }, // 避免快取
          headers: { "Cache-Control": "no-cache" },
        }
      );
      const next = normalizeMember(data);
      setTableData((prev) => {
        const hasRow = prev.some((m) => Number(m.id) === Number(id));
        if (!hasRow) return prev;
        return prev.map((m) => (Number(m.id) === Number(id) ? { ...m, ...next } : m));
      });
      setHighlightId(Number(id));
    } catch (err) {
      console.error("單列刷新失敗：", err);
    }
  }, []);

  // 🔎 搜尋按鈕 → 直接呼叫 fetchMembers
  const handleSearch = () => {
    fetchMembers();
  };

  // ⏯️ 初始化載入
  useEffect(() => {
    fetchMembers();
  }, [fetchMembers]);

  // 當選擇檢視消費情形時，從 API 拉取資料
  const handleViewConsumption = (memberId) => {
    const apiUrl = `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/GetSalesOrderByMember?memberId=${memberId}&filterMonth=${selectedMonth}`;
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

  // 月份變更時（若視窗有開啟且有 memberId）就重抓消費情形
  useEffect(() => {
    if (selectedDetail && memberId && selectedMonth) {
      const apiUrl = `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/GetSalesOrderByMember?memberId=${memberId}&filterMonth=${selectedMonth}`;
      axios
        .get(apiUrl)
        .then((response) => setSelectedDetail(response.data))
        .catch((error) => console.error("載入消費情形失敗：", error));
    }
  }, [selectedMonth, selectedDetail, memberId]);

  // 當用戶點擊編輯
  const handleEditMember = (member) => {
    setSelectedMember({ id: member.id, memberType: member.memberType });
    setShowEditModal(true);
  };

  // 編輯成功
  const handleUpdateMember = (updatedMember) => {
    axios
      .put(
        `https://yupinjia.hyjr.com.tw/api/api/t_Member/${updatedMember.id}`,
        updatedMember
      )
      .then(() => {
        setShowEditModal(false);
        // 再打 API 以確保最新
        refreshMemberRow(updatedMember.id);
        
      })
      .catch((error) => {
        console.error("更新失敗", error);
      });
  };

  // 提現成功：樂觀更新 → 高亮 → 重抓
  const handleWithdrawSuccess = async (updatedMember) => {
    const patched = normalizeMember(updatedMember);
    setTableData((prev) =>
      prev.map((m) => (Number(m.id) === Number(patched.id) ? patched : m))
    );
    setHighlightId(Number(patched.id));
    setShowWithdrawModal(false);
    setWithdrawMember(null);
    // ✅ 與賒帳結清一樣：整表重抓（依當前搜尋條件）
  await fetchMembers();
  // 重抓後再高亮該列（若存在）
  setHighlightId(Number(patched.id));
  };

  const formatDate = (iso) => {
    if (!iso) return "-";
    try {
      return new Date(iso).toLocaleString("zh-TW", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return String(iso);
    }
  };

  return (
    <>
      {/* 高亮動畫樣式：讓該列在 1.8 秒內淡出 */}
      <style>{`
        @keyframes rowFlash {
          0%   { background-color: #fff6bf; }
          50%  { background-color: #fff0a6; }
          100% { background-color: transparent; }
        }
        .row-highlight td { animation: rowFlash 1.8s ease-out 0s 1 both; }
      `}</style>

      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
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
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>

      <div className="table-container" style={{ maxHeight: "79vh", overflowY: "auto" }}>
        {loading ? (
          <div>加載中...</div>
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
                  <td colSpan="14">無資料</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
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
