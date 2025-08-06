import { useState, useEffect } from "react";
import "../../components/Search.css"; // 引入搜尋框的 CSS 來調整樣式
import SearchField from "../../components/SearchField"; // 引入搜尋框模組
import MemberDetailModal from "./MemberDetailModal"; // 消費情形
import DistributorInfoModal from "./DistributorInfoModal"; // 經銷
import MemberEditModal from "./MemberEditModal"; // 編輯
import axios from "axios";

export default function MemberOverview() {
  const [orderId, setOrderId] = useState(""); // 會員編號搜尋條件
  const [contactPhone, setContactPhone] = useState(""); // 聯絡電話搜尋條件
  const [status, setStatus] = useState("all"); // 會員類型搜尋條件
  const [selectedMonth, setSelectedMonth] = useState("2025-08"); // 默認月份設定為 2025-08

  const [tableData, setTableData] = useState([]); // 存放表格資料
  const [showModal, setShowModal] = useState(false); // 消費情形
  const [selectedDetail, setSelectedDetail] = useState(null); // 消費情形
  const [showDistributorModal, setShowDistributorModal] = useState(false); // 經銷
  const [selectedDistributor, setSelectedDistributor] = useState(null); // 經銷
  const [showEditModal, setShowEditModal] = useState(false); // 編輯
  const [editMember, setEditMember] = useState(null); // 編輯
  const [loading, setLoading] = useState(false); // 加載狀態
  const [selectedMember, setSelectedMember] = useState(null); // 存放選中的會員資料

  const [memberId, setMemberId] = useState(null); // 新增 state 用來保存 memberId

  // 檢查搜尋功能
  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, contactPhone, status });

    let apiUrl = "https://yupinjia.hyjr.com.tw/api/api/t_Member";
    const params = [];

    if (orderId) params.push(`memberNo=${orderId}`);
    if (contactPhone) params.push(`contactPhone=${contactPhone}`);
    if (status !== "all") params.push(`status=${status}`);

    if (params.length > 0) {
      apiUrl += "?" + params.join("&");
    }

    setLoading(true);

    axios
      .get(apiUrl)
      .then((response) => {
        const members = response.data;
        console.log("API 回傳的會員資料：", members); // 印出 API 回傳的資料
        setTableData(members);
        setLoading(false);
      })
      .catch((error) => {
        console.error("API 請求失敗：", error);
        setLoading(false);
      });
  };

  // 初始化載入所有會員資料
  useEffect(() => {
    setLoading(true);
    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_Member")
      .then((response) => {
        setTableData(response.data);
        setLoading(false); // 加載完成
      })
      .catch((error) => {
        console.error("載入失敗:", error);
        setLoading(false); // 加載完成
      });
  }, []);

  // 當選擇檢視消費情形時，從 API 拉取資料
  const handleViewConsumption = (memberId) => {
    console.log("檢視會員消費情形，會員ID：", memberId);
    console.log("當前月份：", selectedMonth); // 確保 selectedMonth 正確

    // 確保 API 請求 URL 正確
    const apiUrl = `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/GetSalesOrderByMember?memberId=${memberId}&filterMonth=${selectedMonth}`;
    console.log("發送的 API 請求 URL：", apiUrl); // 打印請求 URL

    axios
      .get(apiUrl)
      .then((response) => {
        console.log("消費情形資料：", response.data); // 印出消費情形的資料
        setSelectedDetail(response.data);
        setMemberId(memberId); // 保存 memberId
        setShowModal(true); // 顯示消費情形的 modal
      })
      .catch((error) => {
        console.error("載入消費情形失敗：", error);
      });
  };

  // 在 MemberOverview.jsx 中添加 useEffect
  useEffect(() => {
    if (selectedMonth) {
      console.log("月份已更新，重新加載消費資料：", selectedMonth);
      // 此處可以選擇重新呼叫 API 或根據已選月份更新視圖
      if (selectedDetail && memberId) {
        const apiUrl = `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/GetSalesOrderByMember?memberId=${memberId}&filterMonth=${selectedMonth}`;
        console.log("發送的 API 請求 URL：", apiUrl);
        axios
          .get(apiUrl)
          .then((response) => {
            console.log("消費情形資料：", response.data); // 印出消費情形的資料
            setSelectedDetail(response.data);
          })
          .catch((error) => {
            console.error("載入消費情形失敗：", error);
          });
      }
    }
  }, [selectedMonth]); // 監聽 selectedMonth 變動

  // 初始化載入會員資料
  useEffect(() => {
    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_Member")
      .then((response) => {
        setTableData(response.data);
      })
      .catch((error) => {
        console.error("載入會員資料失敗", error);
      });
  }, []);

  // 當用戶點擊編輯按鈕時
const handleEditMember = (member) => {
  // 直接傳基本資訊，詳細資料由 MemberEditModal 自己抓
  setSelectedMember({
    id: member.id,
    memberType: member.memberType
  });
  setShowEditModal(true);
};

  // 更新會員資料
  const handleUpdateMember = (updatedMember) => {
    // 發送 PUT 請求更新會員資料
    axios
      .put(
        `https://yupinjia.hyjr.com.tw/api/api/t_Member/${updatedMember.id}`,
        updatedMember
      )
      .then((response) => {
        console.log("更新成功", response);
        // 更新本地表格資料
        setTableData((prevData) =>
          prevData.map((member) =>
            member.id === updatedMember.id ? updatedMember : member
          )
        );
        setShowEditModal(false); // 關閉編輯彈出框
      })
      .catch((error) => {
        console.error("更新失敗", error);
      });
  };

  return (
    <>
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
            { value: "0", label: "一般會員" },
            { value: "1", label: "經銷商" },
          ]}
        />
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>

      <div
        className="table-container"
        style={{ maxHeight: "79vh", overflowY: "auto" }}
      >
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
                <th>地址</th>
                <th>建立日期</th>
                <th>等級</th>
                <th>點數</th>
                <th>消費情形</th>
                <th>會員類型</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {tableData.length > 0 ? (
                tableData.map((item, index) => (
                  <tr key={index}>
                    <td>{item.memberNo}</td>
                    <td>{item.fullName}</td>
                    <td>{item.contactPhone}</td>
                    <td>{item.contactAddress}</td>
                    <td>{new Date(item.createdAt).toLocaleDateString()}</td>
                    <td>{item.memberLevel}</td>
                    <td>{item.rewardPoints}</td>
                    <td>
                      <button
                        className="check-button"
                        onClick={() => {
                          console.log("點擊檢視，會員 ID:", item.id); // 確認 ID 是否正確
                          handleViewConsumption(item.id);
                        }}
                      >
                        檢視
                      </button>
                    </td>
                    <td>
                      {item.memberType === "一般會員"
                        ? "一般會員"
                        : item.memberType === "導遊"
                        ? "導遊"
                        : "廠商"}
                    </td>
                    <td>
                      <button
                        className="edit-button"
                        onClick={() => {
                          setEditMember(item);
                          setShowEditModal(true);
                          handleEditMember(item);
                        }}
                      >
                        編輯
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="12">無資料</td>
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
        selectedMonth={selectedMonth} // 傳遞 selectedMonth
        setSelectedMonth={setSelectedMonth} // 傳遞 setSelectedMonth
        memberId={memberId} // 傳遞 memberId
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
        onSave={handleUpdateMember} // 將資料更新的處理傳給彈出框
      />
    </>
  );
}
