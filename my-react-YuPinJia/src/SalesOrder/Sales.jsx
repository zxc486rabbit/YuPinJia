import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組

export default function OrderSearch() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupMethod, setPickupMethod] = useState("all");
  const [status, setStatus] = useState("all");

  const [tableData, setTableData] = useState([]); // 存放表格資料

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, pickupTime, pickupMethod, status });
  };

  useEffect(() => {
    fetch("/SalesTable.json") // 從 public 目錄讀取 JSON
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  return (
    <>
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
        <SearchField
          label="訂單編號"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="取貨時間"
          type="date"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
        />
        <SearchField
          label="取貨方式"
          type="select"
          value={pickupMethod}
          onChange={(e) => setPickupMethod(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "store", label: "門市取貨" },
            { value: "delivery", label: "宅配" },
          ]}
        />
        <SearchField
          label="狀態"
          type="select"
          value={status}
          onChange={(e) => setStatus(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "pending", label: "待處理" },
            { value: "completed", label: "已完成" },
            { value: "cancelled", label: "已取消" },
          ]}
        />

        {/* 搜尋按鈕 */}
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>
      {/* 表格 */}
      <table className="table my-2 text-center" style={{ fontSize: "1.2rem" }}>
      <thead className="table-light" style={{ borderTop: "1px solid #c5c6c7" }}>
        <tr>
          <th scope="col">口</th>
          <th scope="col">訂單編號</th>
          <th scope="col">門市</th>
          <th scope="col">會員</th>
          <th scope="col">商品明細</th>
          <th scope="col">商品總金額</th>
          <th scope="col">商品總數</th>
          <th scope="col">狀態</th>
          <th scope="col">統一編號</th>
          <th scope="col">發票</th>
          <th scope="col">備註</th>
          <th scope="col">操作</th>
        </tr>
      </thead>
      <tbody>
        {tableData.length > 0 ? (
            tableData.map((item, index) => (
            <tr key={index}>
              <td>口</td>
              <td>{item.orderId}</td>
              <td>{item.store}</td>
              <td>{item.member}</td>
              <td>{item.details}</td>
              <td>{item.totalAmount}</td>
              <td>{item.totalCount}</td>
              <td>{item.status}</td>
              <td>{item.taxId}</td>
              <td>{item.invoice}</td>
              <td>{item.remarks}</td>
              <td>{item.actions}</td>
            </tr>
          ))
        ) : (
          <tr>
            <td colSpan="12">無資料</td>
          </tr>
        )}
      </tbody>
    </table>
    </>
  );
}
