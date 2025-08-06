import { useState, useEffect } from "react";
import "../components/Search.css";
import SearchField from "../components/SearchField";
import Swal from "sweetalert2";
import { Modal, Button, Form } from "react-bootstrap";
import axios from "axios";
import CreditSettleModal from "./CreditSettleModal";

export default function CreditLog() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("all");
  const [pickupTime, setPickupTime] = useState("");
  const [tableData, setTableData] = useState([]);
  const [checkedOrders, setCheckedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);

  const [settleAmount, setSettleAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("現金");

  // 付款相關額外欄位
  const [bankName, setBankName] = useState("");
  const [accountLast5, setAccountLast5] = useState("");
  const [remitDate, setRemitDate] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");

  // 取得賒帳資料並更新 tableData
  useEffect(() => {
    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_CreditRecord")
      .then((response) => {
        const updatedData = response.data.map((item) => ({
          id: item.id, // 賒帳紀錄 ID
          memberId: item.memberId, // 會員 ID
          memberNo: item.memberNo || "-", // 會員編號 (可能為 null)
          fullName: item.fullName || "-", // 會員名稱
          billingDate: item.billingDate?.split("T")[0] || "-", // 帳單日期
          creditAmount: item.creditAmount || 0, // 賒帳金額
          unpaidAmount: item.creditAmount || 0, // 未結清金額 (先等於賒帳金額)
          repaymentDate: item.lastRepaymentDate
            ? item.lastRepaymentDate.split("T")[0]
            : "-", // 最後還款日期
          status: item.reminderCount > 0 ? "未還款" : "已還款", // 狀態
          reminderCount: item.reminderCount || 0, // 提醒次數
        }));
        setTableData(updatedData);
      })
      .catch((error) => {
        console.error("載入資料失敗:", error);
        Swal.fire("資料載入失敗", "", "error");
      });
  }, []);

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, status, pickupTime });
  };

  const toggleCheck = (order) => {
    setCheckedOrders((prev) =>
      prev.includes(order) ? prev.filter((o) => o !== order) : [...prev, order]
    );
  };

  // 打開結清彈窗
  const openSettleModal = (order) => {
    setSelectedOrder(order);
    setShowSettleModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const handleSettle = () => {
    if (settleAmount <= 0 || settleAmount > selectedOrder.unpaidAmount) {
      Swal.fire("輸入金額不正確", "", "warning");
      return;
    }

    const today = new Date().toISOString().split("T")[0];
    setTableData((prev) =>
      prev.map((item) =>
        item.orderId === selectedOrder.orderId
          ? {
              ...item,
              unpaidAmount: item.unpaidAmount - settleAmount,
              repaymentDate: today,
              paymentMethod,
              bankName,
              accountLast5,
              remitDate,
              chequeNumber,
              chequeDate,
              status:
                item.unpaidAmount - settleAmount === 0 ? "已還款" : "未還款",
            }
          : item
      )
    );

    Swal.fire("結清成功", "", "success");
    closeModal();
  };

  const handleRemind = (order) => {
  const newCount = (order.reminderCount || 0) + 1;

  // 更新後端 reminderCount
  axios
    .put(`https://yupinjia.hyjr.com.tw/api/api/t_CreditRecord/${order.id}`, {
      ...order, // 把原本資料帶上（避免後端要求完整物件）
      reminderCount: newCount,
    })
    .then(() => {
      // 前端更新
      setTableData((prev) =>
        prev.map((item) =>
          item.id === order.id
            ? { ...item, reminderCount: newCount }
            : item
        )
      );
      Swal.fire("已發送提醒", "", "success");
    })
    .catch((error) => {
      console.error("更新提醒次數失敗:", error);
      Swal.fire("提醒失敗", "", "error");
    });
};

  const handlePrint = () => {
    if (checkedOrders.length === 0) {
      Swal.fire("請至少勾選一筆資料", "", "warning");
      return;
    }

    const printWindow = window.open("", "_blank");
    const content = `
      <html>
        <head>
          <title>列印結清單</title>
          <style>
            body { font-size: 14px; }
            table { width: 100%; border-collapse: collapse; margin-top: 10px; }
            th, td { border: 1px solid #ccc; padding: 6px; text-align: center; }
          </style>
        </head>
        <body>
          <h3>結清單</h3>
          <table>
            <thead>
              <tr>
                <th>會員編號</th>
                <th>會員名稱</th>
                <th>訂單編號</th>
                <th>結清金額</th>
                <th>付款方式</th>
                <th>未結清金額</th>
              </tr>
            </thead>
            <tbody>
              ${checkedOrders
                .map(
                  (item) => `
                <tr>
                  <td>${item.orderId}</td>
                  <td>${item.member}</td>
                  <td>${item.orderId}</td>
                  <td>${item.totalAmount - item.unpaidAmount}</td>
                  <td>${item.paymentMethod}</td>
                  <td>${item.unpaidAmount}</td>
                </tr>`
                )
                .join("")}
            </tbody>
          </table>
        </body>
      </html>
    `;
    printWindow.document.write(content);
    printWindow.document.close();
    printWindow.print();
  };

  return (
    <>
      <div className="search-container d-flex flex-wrap gap-3 px-4 pt-4 pb-3 rounded">
        <SearchField
          label="會員編號"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="日期"
          type="date"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
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

        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>

      <div
        className="table-container"
        style={{
          maxHeight: "75vh",
          overflowY: "auto",
          overflowX: "auto",
        }}
      >
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
              <th>
                <input type="checkbox" disabled />
              </th>
              <th>會員編號</th>
              <th>會員名稱</th>
              <th>聯絡人</th>
              <th>帳單日期</th>
              <th>賒帳金額</th>
              <th>提醒次數</th>
              <th>操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td>
                    <input
                      type="checkbox"
                      checked={checkedOrders.includes(item)}
                      onChange={() => toggleCheck(item)}
                    />
                  </td>
                  <td>{item.memberNo}</td>
                  <td>{item.fullName}</td>
                  <td>{item.memberId}</td>
                  <td>{item.billingDate}</td>
                  <td>{item.creditAmount}</td>
                  <td>{item.reminderCount}</td>
                  <td>
                    <button
                      className="edit-button me-2"
                      onClick={() => handleRemind(item)}
                    >
                      提醒
                    </button>
                    <button
                      className="edit-button"
                      onClick={() => openSettleModal(item)}
                    >
                      結清
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
      </div>

      <div className="d-flex align-items-center mt-2 ps-3">
        <button
          className="pink-button me-3"
          style={{ fontSize: "1.1rem" }}
          onClick={handlePrint}
        >
          列印結清單
        </button>
      </div>

      {/* 結清 Modal */}
      <CreditSettleModal
        show={showSettleModal}
        onClose={() => setShowSettleModal(false)}
        creditRecordId={selectedOrder?.id}
      />
    </>
  );
}
