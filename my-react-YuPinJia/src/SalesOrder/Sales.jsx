import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組
import { Modal, Button } from "react-bootstrap"; // 使用彈出框套件
import Swal from "sweetalert2";

export default function OrderSearch() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [pickupMethod, setPickupMethod] = useState("all");
  const [status, setStatus] = useState("all");

  const [tableData, setTableData] = useState([]); // 存放表格資料
  const [selectedOrder, setSelectedOrder] = useState(null); //記錄選到哪筆
  const [showModal, setShowModal] = useState(false); //檢視按鈕彈出框
  const [showEditModal, setShowEditModal] = useState(false); //編輯按鈕彈出框

  const STATUS_FLOW = ["待付款", "已付款", "已出貨", "配送中", "已完成"];

  const renderStatusBadge = (status) => {
    switch (status) {
      case "已完成":
        return <span className="badge bg-success fs-6">已完成</span>;
      case "配送中":
        return <span className="badge bg-warning text-dark fs-6">配送中</span>;
      case "已出貨":
        return <span className="badge bg-primary fs-6">已出貨</span>;
      case "待付款":
        return <span className="badge bg-info text-dark fs-6">待付款</span>;
      case "已付款":
        return <span className="badge bg-secondary text-light fs-6">已付款</span>;
      case "已作廢":
        return <span className="badge bg-danger fs-6">已作廢</span>;
      default:
        return <span className="badge bg-secondary fs-6">未知</span>;
    }
  };

  const getNextStatus = (status) => {
    const index = STATUS_FLOW.indexOf(status);
    if (index >= 0 && index < STATUS_FLOW.length - 1) {
      return STATUS_FLOW[index + 1];
    }
    return status; 
  };

  const getNextStepLabel = (status) => {
    switch (status) {
      case "待付款":
        return "確認付款";
      case "已付款":
        return "確認出貨";
      case "已出貨":
        return "確認配送";
      case "配送中":
        return "完成訂單";
      case "已完成":
        return "已完成";
      case "已作廢":
        return "復原訂單";
      default:
        return "下一步";
    }
  };

  const handleSearch = () => {
    const filtered = tableData.filter((item) => {
      if (orderId && !item.orderId.includes(orderId)) return false;
      if (pickupTime && item.pickupTime !== pickupTime) return false;
      if (pickupMethod !== "all" && item.pickupMethod !== pickupMethod) return false;
      if (status !== "all" && item.status !== status) return false;
      return true;
    });
    setTableData(filtered);
  };

  const handleView = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
  };

  const handleEdit = (order) => {
    setSelectedOrder(order);
    setShowEditModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedOrder(null);
  };

  const handleCompleteOrder = () => {
    const isCancelled = selectedOrder?.status === "已作廢";
    const nextStatus = isCancelled
      ? selectedOrder.prevStatus || "待付款"
      : getNextStatus(selectedOrder?.status);

    Swal.fire({
      title: isCancelled
        ? `確定要復原訂單狀態為「${nextStatus}」嗎？`
        : `確定要將訂單狀態更新為「${nextStatus}」嗎？`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "是的，確認",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        setTableData((prev) =>
          prev.map((order) => {
            if (order.orderId === selectedOrder.orderId) {
              if (isCancelled) {
                return { ...order, status: order.prevStatus, prevStatus: null };
              } else {
                return { ...order, status: nextStatus };
              }
            }
            return order;
          })
        );
        setShowEditModal(false);
        setSelectedOrder(null);

        Swal.fire({
          title: `訂單已更新為「${nextStatus}」`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  const handleCancelOrder = () => {
    Swal.fire({
      title: `確定要將訂單狀態更新為「已作廢」嗎？`,
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "是的，作廢",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        setTableData((prev) =>
          prev.map((order) => {
            if (order.orderId === selectedOrder.orderId) {
              return { ...order, prevStatus: order.status, status: "已作廢" };
            }
            return order;
          })
        );
        setShowEditModal(false);
        setSelectedOrder(null);

        Swal.fire({
          title: `訂單已更新為「已作廢」`,
          icon: "success",
          timer: 1500,
          showConfirmButton: false,
        });
      }
    });
  };

  useEffect(() => {
    fetch("/SalesTable.json")
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
      <div
        className="table-container"
        style={{
          maxHeight: "73vh", // 根據你想要的高度調整
          overflowY: "auto",
        }}
      >
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
              <th scope="col">
                {" "}
                <input type="checkbox" className="w-5 h-5 text-gray-600" />
              </th>
              <th scope="col">訂單編號</th>
              <th scope="col">門市</th>
              <th scope="col">會員</th>
              <th scope="col">商品明細</th>
              <th scope="col">商品總金額</th>
              {/* <th scope="col">商品總數</th> */}
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
                  <td>
                    {" "}
                    <input type="checkbox" className="w-5 h-5 text-gray-600" />
                  </td>
                  <td>{item.orderId}</td>
                  <td>{item.store}</td>
                  <td>{item.member}</td>
                  <td>
                    <button
                      className="check-button"
                      onClick={() => handleView(item)}
                    >
                      檢視
                    </button>
                  </td>
                  <td>{item.totalAmount}</td>
                  {/* <td>{item.totalCount}</td> */}
                  <td>{renderStatusBadge(item.status)}</td>
                  <td>{item.taxId}</td>
                  <td>{item.invoice}</td>
                  <td>{item.remarks}</td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(item)}
                    >
                      操作
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
        {/* <input type="checkbox" className="w-5 h-5 text-gray-600 me-2" /> */}
        {/* <h5 className="fw-bold mb-0 me-3">全選</h5> */}
        <button className="pink-button me-3" style={{ fontSize: "1.2rem" }}>
          列印清單
        </button>
        <button className="pink-button" style={{ fontSize: "1.2rem" }}>
          列印明細
        </button>
      </div>

      <Modal
        show={showModal}
        onHide={closeModal}
        dialogClassName="w-auto-modal"
        size="xl"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>商品明細</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
                <th scope="col">商品名稱</th>
                <th scope="col">數量</th>
                <th scope="col">單價</th>
                <th scope="col">金額</th>
                <th scope="col">折扣後</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder ? (
                <tr>
                  <td>{selectedOrder.product}</td>
                  <td>{selectedOrder.totalCount}</td>
                  <td>{selectedOrder.totalAmount}</td>
                  <td>
                    {(() => {
                      const count = Number(selectedOrder.totalCount);
                      const amount = Number(
                        selectedOrder.totalAmount.replace(/,/g, "")
                      );
                      const total = count * amount;
                      return total.toLocaleString(); // 千分位格式
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const count = Number(selectedOrder.totalCount);
                      const amount = Number(
                        selectedOrder.totalAmount.replace(/,/g, "")
                      );
                      const discounted = Math.round(count * amount * 0.9); // 四捨五入
                      return discounted.toLocaleString();
                    })()}
                  </td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="12">無資料</td>
                </tr>
              )}
            </tbody>
          </table>
          {selectedOrder &&
            (() => {
              const count = Number(selectedOrder.totalCount);
              const amount = Number(
                selectedOrder.totalAmount.replace(/,/g, "")
              );
              const total = count * amount;
              const discounted1 = Math.round(total * 0.1);
              const discounted = Math.round(total * 0.9);

              return (
                <div
                  className="mt-3 p-3 d-flex justify-content-start bg-light border rounded"
                  style={{ fontSize: "1.1rem" }}
                >
                  <div>
                    共計商品：<strong>1</strong> 項
                  </div>
                  <div className="mx-4">
                    總金額：<strong>{total.toLocaleString()}</strong> 元
                  </div>
                  <div className="me-4">
                    折扣：<strong>{discounted1.toLocaleString()}</strong> 元
                  </div>
                  <div>
                    總計：<strong>{discounted.toLocaleString()}</strong> 元
                  </div>
                </div>
              );
            })()}
        </Modal.Body>
        <Modal.Footer>
          <Button
            className="modalButton"
            variant="secondary"
            onClick={closeModal}
          >
            關閉
          </Button>
        </Modal.Footer>
      </Modal>

      {/* 編輯按鈕的彈出框 */}
      <Modal
        show={showEditModal}
        onHide={closeEditModal}
        size="xl"
        dialogClassName="w-auto-modal"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>編輯訂單</Modal.Title>
        </Modal.Header>
        <Modal.Body>
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
                <th scope="col">商品名稱</th>
                <th scope="col">出貨點</th>
                <th scope="col">數量</th>
                <th scope="col">單價</th>
                <th scope="col">金額</th>
                <th scope="col">折扣後</th>
                <th scope="col">狀態</th>
              </tr>
            </thead>
            <tbody>
              {selectedOrder ? (
                <tr>
                  <td>{selectedOrder.product}</td>
                  <td>{selectedOrder.store}</td>
                  <td>{selectedOrder.totalCount}</td>
                  <td>{selectedOrder.totalAmount}</td>
                  <td>
                    {(() => {
                      const count = Number(selectedOrder.totalCount);
                      const amount = Number(
                        selectedOrder.totalAmount.replace(/,/g, "")
                      );
                      const total = count * amount;
                      return total.toLocaleString(); // 千分位格式
                    })()}
                  </td>
                  <td>
                    {(() => {
                      const count = Number(selectedOrder.totalCount);
                      const amount = Number(
                        selectedOrder.totalAmount.replace(/,/g, "")
                      );
                      const discounted = Math.round(count * amount * 0.9); // 四捨五入
                      return discounted.toLocaleString();
                    })()}
                  </td>
                  <td>{selectedOrder.status}</td>
                </tr>
              ) : (
                <tr>
                  <td colSpan="12">無資料</td>
                </tr>
              )}
            </tbody>
          </table>
          {selectedOrder &&
            (() => {
              const count = Number(selectedOrder.totalCount);
              const amount = Number(
                selectedOrder.totalAmount.replace(/,/g, "")
              );
              const total = count * amount;
              const discounted = Math.round(total * 0.9);

              return (
                <div
                  className="mt-3 p-3 d-flex justify-content-between bg-light border rounded"
                  style={{ fontSize: "1rem", lineHeight: "1.7" }}
                >
                  <div>
                    <div className="d-flex">
                      <div>
                        共計商品：<strong>1</strong> 項
                      </div>
                      <div className="ms-5">
                        總計：<strong>{discounted.toLocaleString()}</strong> 元
                      </div>
                      <div className="ms-5">
                        配送方式：<strong>機場提貨</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        經銷會員：<strong>{selectedOrder.member}</strong>
                      </div>
                      <div className="ms-5">
                        手機：<strong>{selectedOrder.phone}</strong>
                      </div>
                      <div className="ms-5">
                        折扣方式：<strong>{selectedOrder.pay}</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        發票號碼：<strong>{selectedOrder.invoice}</strong>
                      </div>
                      <div className="ms-5">
                        載具編號：<strong>/RAM72C4</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        郵寄地址：<strong>台北市松山區文化路166號</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        訂單成立：
                        <strong>
                          {selectedOrder.startDate}
                          <span className="ms-1">(馬公門市)</span>
                        </strong>
                      </div>
                      <div className="ms-5">
                        操作員：<strong>{selectedOrder.name}</strong>
                      </div>
                    </div>
                    <div className="d-flex mt-1">
                      <div>
                        取貨資訊：
                        <strong>
                          {selectedOrder.endDate}
                          <span className="ms-1">(機場提貨櫃台)</span>
                        </strong>
                      </div>
                    </div>
                    <div className="mt-3">
                      <button className="check-button fw-bold">退貨</button>
                      <button className="delete-button mx-4 fw-bold" onClick={handleCancelOrder}>
  作廢
</button>
                      <button
                        className="pink-button"
                        style={{ fontSize: "1rem" }}
                      >
                        列印明細
                      </button>
                      <Button
                        variant="success"
                        className="fw-bold ms-4"
                        onClick={handleCompleteOrder}
                        disabled={selectedOrder?.status === "已完成"}
                      >
                        {getNextStepLabel(selectedOrder?.status)}
                      </Button>
                    </div>
                  </div>
                  {/* 簽名紀錄 */}
                  <div className="signature-container p-3 border rounded d-flex align-items-center">
                    <span className="me-2">簽名紀錄：</span>
                    <div className="signature-box border rounded overflow-hidden">
                      <img
                        src="/sign.png"
                        alt="簽名圖片"
                        style={{
                          width: "100%",
                          height: "100%",
                          objectFit: "contain",
                        }}
                      />
                    </div>
                  </div>
                </div>
              );
            })()}
        </Modal.Body>
        <Modal.Footer>
          {/* <Button variant="primary" onClick={closeEditModal}>
            儲存變更
          </Button>
          <Button variant="secondary" onClick={closeEditModal}>
            取消
          </Button> */}
        </Modal.Footer>
      </Modal>
    </>
  );
}
