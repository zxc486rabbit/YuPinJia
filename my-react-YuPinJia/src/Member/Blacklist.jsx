import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

export default function Blacklist() {
  const [memberNo, setMemberNo] = useState("");
  const [memberName, setMemberName] = useState("");
  const [allData, setAllData] = useState([]);   // 原始資料
  const [tableData, setTableData] = useState([]); // 顯示用資料

  const handleSearch = () => {
    const no = memberNo.trim();
    const name = memberName.trim();
    const filtered = allData.filter((it) => {
      const matchNo =
        !no ||
        String(it.memberNo ?? "")
          .toLowerCase()
          .includes(no.toLowerCase());
      const matchName =
        !name ||
        String(it.memberName ?? "")
          .toLowerCase()
          .includes(name.toLowerCase());
      return matchNo && matchName;
    });
    setTableData(filtered);
  };

  useEffect(() => {
    fetch(`${API_BASE}/t_BlackList`)
      .then((res) => res.json())
      .then((data) => {
        // 正規化，避免 null 直接顯示成字串
        const normalized = (Array.isArray(data) ? data : []).map((x) => ({
          id: x.id,
          memberNo: x.memberNo ?? "-", // 可能為 null
          memberName: x.memberName ?? "-",
          contactPerson: x.contactPerson ?? "-",
          contactPhone: x.contactPhone ?? "-",
          lastRepaymentDate: x.lastRepaymentDate ?? null,
          creditLimit: x.creditLimit ?? 0,
          creditAmount: x.creditAmount ?? 0,
          reminderCount: x.reminderCount ?? 0,
        }));
        setAllData(normalized);
        setTableData(normalized); // 初次顯示全部
      })
      .catch((error) => {
        console.error("載入失敗:", error);
        alert("黑名單資料載入失敗");
      });
  }, []);

  const fmtDate = (iso) => {
    if (!iso) return "-";
    const d = new Date(iso);
    if (isNaN(d)) return "-";
    const yyyy = d.getFullYear();
    const mm = String(d.getMonth() + 1).padStart(2, "0");
    const dd = String(d.getDate()).padStart(2, "0");
    return `${yyyy}-${mm}-${dd}`;
  };

  const handleRemove = (row) => {
    // 尚未提供移除 API，先給提示避免誤點
    alert(`尚未串接「移出黑名單」API（id=${row.id}）。`);
  };

  return (
    <>
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

        {/* 搜尋按鈕 */}
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>

      {/* 表格 */}
      <div
        className="table-container"
        style={{
          maxHeight: "79vh",
          overflowY: "auto",
          overflowX: "auto", // 避免邊框被剪掉
        }}
      >
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
                <input type="checkbox" className="w-5 h-5 text-gray-600" />
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
            {tableData.length > 0 ? (
              tableData.map((item) => (
                <tr key={item.id}>
                  <td>
                    <input type="checkbox" className="w-5 h-5 text-gray-600" />
                  </td>
                  <td>{item.memberNo}</td>
                  <td>{item.memberName}</td>
                  <td>{item.contactPerson}</td>
                  <td>{item.contactPhone}</td>
                  <td>{fmtDate(item.lastRepaymentDate)}</td>
                  <td>{item.creditLimit}</td>
                  <td>{item.creditAmount}</td>
                  <td>{item.reminderCount}</td>
                  <td>-</td>
                  <td>
                    <button className="edit-button" onClick={() => handleRemove(item)}>
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
      </div>
    </>
  );
}
