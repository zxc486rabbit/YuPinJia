import { useState, useEffect, useCallback } from "react";
import "../components/Search.css";
import SearchField from "../components/SearchField";
import Swal from "sweetalert2";
import { Modal, Button, Form } from "react-bootstrap";
import axios from "axios";
import CreditSettleModal from "./CreditSettleModal";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

export default function CreditLog() {
  const [orderId, setOrderId] = useState("");
  const [status, setStatus] = useState("all");
  const [pickupTime, setPickupTime] = useState("");
  const [tableData, setTableData] = useState([]);
  const [checkedOrders, setCheckedOrders] = useState([]);
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showSettleModal, setShowSettleModal] = useState(false);
  const [remindingId, setRemindingId] = useState(null);

  const [settleAmount, setSettleAmount] = useState(0);
  const [paymentMethod, setPaymentMethod] = useState("現金");

  // 付款相關額外欄位
  const [bankName, setBankName] = useState("");
  const [accountLast5, setAccountLast5] = useState("");
  const [remitDate, setRemitDate] = useState("");
  const [chequeNumber, setChequeNumber] = useState("");
  const [chequeDate, setChequeDate] = useState("");

  // 取得賒帳資料並更新 tableData → 抽成函式，方便重用
  const fetchCreditRecords = useCallback(() => {
    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_CreditRecord")
      .then((response) => {
        const updatedData = response.data.map((item) => ({
          // 列表顯示用
          id: item.id,
          memberId: item.memberId,
          memberNo: item.memberNo || "-",
          fullName: item.fullName || "-",
          billingDate: item.billingDate?.split("T")[0] || "-",
          creditAmount: item.creditAmount ?? 0,
          reminderCount: item.reminderCount ?? 0,
          repaymentDate: item.lastRepaymentDate
            ? item.lastRepaymentDate.split("T")[0]
            : "-",
          status: (item.reminderCount ?? 0) > 0 ? "未還款" : "已還款",

          // PUT 用的原始欄位（避免後端要求完整物件）
          billingDateIso: item.billingDate || null,
          lastRepaymentDateIso: item.lastRepaymentDate || null,
          raw: item,
        }));
        setTableData(updatedData);
      })
      .catch((error) => {
        console.error("載入資料失敗:", error);
        Swal.fire("資料載入失敗", "", "error");
      });
  }, []);

  useEffect(() => {
    fetchCreditRecords();
  }, [fetchCreditRecords]);

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
  const closeSettleModal = () => {
    setShowSettleModal(false);
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

  const handleRemind = async (row) => {
  if (remindingId) return; // 防二次點擊
  setRemindingId(row.id);

  try {
    // ★ 正確端點：PUT /t_CreditRecord/CreditReminder/{id}
    // 大多後端可接受 null/{} 空 body，若 415/400 可把 null 改成 {}
    const res = await axios.put(
      `${API_BASE}/t_CreditRecord/CreditReminder/${row.id}`,
      null
    );

    // 若後端有回最新 reminderCount，用它；否則前端自行 +1
    const nextCount =
      typeof res?.data?.reminderCount === "number"
        ? res.data.reminderCount
        : (row.reminderCount ?? 0) + 1;

    setTableData((prev) =>
      prev.map((it) => (it.id === row.id ? { ...it, reminderCount: nextCount } : it))
    );

    Swal.fire("已發送提醒 (+1)", "", "success");
  } catch (err) {
    console.error("更新提醒次數失敗:", err);
    Swal.fire("提醒失敗", "", "error");
  } finally {
    setRemindingId(null);
  }
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
                      disabled={remindingId === item.id}
                    >
                      {remindingId === item.id ? "送出中…" : "提醒"}
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
        onClose={closeSettleModal}
        creditRecordId={selectedOrder?.id}
        onSettled={fetchCreditRecords} // ★ 結清成功後，重抓主表
      />
    </>
  );
}
