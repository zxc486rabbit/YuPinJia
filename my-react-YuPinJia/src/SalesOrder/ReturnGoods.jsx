import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組
import { Modal, Button } from "react-bootstrap"; // 使用彈出框套件
import { BiImage } from "react-icons/bi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa"; // 引入 FontAwesome 箭頭
import Swal from "sweetalert2";
import axios from "axios";

export default function ReturnGoods() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");
  const [tableData, setTableData] = useState([]); // 存放表格資料
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImage, setShowImage] = useState(false); //顯示照片
  const [showFullImage, setShowFullImage] = useState(false); // 用來控制是否顯示放大圖片
  const [showProcessModal, setShowProcessModal] = useState(false); // 處理流程彈出框
  const [showEditModal, setShowEditModal] = useState(false);
  const [editedOrder, setEditedOrder] = useState({});

  // 測試圖片與備註
  const images = [
    { src: "/low.png", remark: "內裡包裝破損" },
    { src: "/low1.jpg", remark: "商品表面劃痕" },
    { src: "/low2.jpg", remark: "包裝箱損壞" },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);

  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const openFullScreen = () => {
    setShowFullImage(true); // 顯示放大圖片
  };

  const closeFullScreen = () => {
    setShowFullImage(false); // 關閉放大圖片
  };

  const handleProcessView = (order) => {
    setSelectedOrder(order);
    setShowProcessModal(true);
  };

  const handleEdit = (order) => {
    setEditedOrder({ ...order }); // 建立一份可編輯的副本
    setShowEditModal(true);
  };

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, pickupTime });
  };

  useEffect(() => {
    // 替換為真實的 API 請求
    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_ReturnOrder", {
        params: { orderNumber: orderId, returnDate: pickupTime },
      })
      .then((res) => {
        const raw = res.data;

        // 印出獲取到的資料
        console.log("API 返回的資料：", raw);

        // 假設 API 回傳的資料是以 orderId 為唯一標識
        const mapped = raw.map((order) => ({
          id: order.id,
          orderId: order.orderNumber,
          store: order.store || "林園門市",
          invoice: order.invoiceNumber || "無",
          startDate: order.pickupTime ? order.pickupTime.split("T")[0] : "無",
          endDate: order.returnTime ? order.returnTime.split("T")[0] : "無",
          pay: order.returnMethod || "無",
          reason: order.reason || "無",
        }));

        setTableData(mapped); // 設定資料
      })
      .catch((error) => {
        console.error("載入失敗:", error);
        Swal.fire("錯誤", "資料載入失敗，請稍後再試", "error");
      });
  }, [orderId, pickupTime]); // 依據搜尋條件觸發更新

  const handleView = async (order) => {
    try {
      const res = await axios.get(
        `https://yupinjia.hyjr.com.tw/api/api/t_ReturnOrder/${order.id}`
      );
      setSelectedOrder(res.data);
      setShowModal(true);
    } catch (error) {
      console.error("載入退貨明細失敗:", error);
      Swal.fire("錯誤", "載入退貨明細失敗", "error");
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  const handleReturn = async () => {
    if (!selectedOrder) return;

    // 確認訂單是否已作廢
    if (selectedOrder.status === 0) {
      Swal.fire("錯誤", "已作廢的訂單不能退貨", "error");
      return;
    }

    // 顯示退貨確認框
    const result = await Swal.fire({
      title: `確定要將訂單「${selectedOrder.orderId}」轉為退貨嗎？`,
      text: "此操作會將該訂單資料轉移到退貨系統並從銷售訂單中移除。",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "確認退貨",
      cancelButtonText: "取消",
    });

    if (result.isConfirmed) {
      // 準備退貨資料
      const returnData = {
        OrderNumber: selectedOrder.orderId,
        storeId: selectedOrder.storeId || 1, // 預設為 1
        invoiceNumber: selectedOrder.invoice || "無",
        pickupTime: isNaN(Date.parse(selectedOrder.pickupTime))
          ? new Date().toISOString()
          : new Date(selectedOrder.pickupTime).toISOString(),
        returnTime: new Date().toISOString(),
        returnMethod: "退貨方式",
        refundMethod: "現金",
        reason: "客戶退貨",
        processStatus: "處理中",
        applicant: "王小明",
        refunder: "李小明",
        refundStatus: "待退款",
        invoiceSendMethod: "郵寄",
        mailingAddress: "高雄市鳳山區瑞隆路7巷27號",
        mailer: "小張",
        mailingStatus: "待寄送",
        t_SalesOrder: selectedOrder.orderId,
      };

      try {
        const response = await axios.post(
          "https://yupinjia.hyjr.com.tw/api/api/t_ReturnOrder",
          returnData,
          {
            headers: {
              "Content-Type": "application/json",
            },
          }
        );

        if (response.status === 201) {
          Swal.fire("成功", "退貨處理成功", "success");

          // 更新訂單狀態為 "已退貨" (6)
          const updatedOrder = {
            ...selectedOrder,
            status: 6, // 設置為 "已退貨" 狀態
          };

          // 發送 PUT 請求更新訂單狀態
          await axios.put(
            `https://yupinjia.hyjr.com.tw/api/api/t_SalesOrder/${selectedOrder.id}`,
            updatedOrder
          );

          // 從表格中移除該訂單
          setTableData((prevData) =>
            prevData.filter((order) => order.orderId !== selectedOrder.orderId)
          );
        } else {
          Swal.fire("錯誤", "退貨處理失敗，請稍後再試", "error");
        }
      } catch (error) {
        console.error("退貨請求錯誤", error);
        Swal.fire("錯誤", "退貨處理失敗，請稍後再試", "error");
      }
    }
  };

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
          label="退貨日期"
          type="date"
          value={pickupTime}
          onChange={(e) => setPickupTime(e.target.value)}
        />
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>

      <div
        className="table-container"
        style={{
          maxHeight: "80vh",
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
              <th scope="col">訂單編號</th>
              <th scope="col">門市</th>
              <th scope="col">發票</th>
              <th scope="col">退貨時間</th>
              <th scope="col">退貨方式</th>
              <th scope="col">退貨明細</th>
              <th scope="col">處理流程</th>
              <th scope="col">操作</th>
            </tr>
          </thead>
          <tbody>
            {tableData.length > 0 ? (
              tableData.map((item, index) => (
                <tr key={index}>
                  <td>{item.orderId}</td>
                  <td>{item.store}</td>
                  <td>{item.invoice}</td>
                  <td>{item.endDate}</td>
                  <td>{item.pay}</td>
                  <td>
                    <button
                      className="check-button"
                      onClick={() => handleView(item)}
                    >
                      檢視
                    </button>
                  </td>
                  <td>
                    <button
                      className="check-button"
                      onClick={() => handleProcessView(item)}
                    >
                      檢視
                    </button>
                  </td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={() => handleEdit(item)}
                    >
                      修改
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

      {/* 退貨明細 Modal */}
      <Modal
        show={showModal}
        onHide={closeModal}
        dialogClassName="w-auto-modal"
        size="lg"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>退貨明細</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          {selectedOrder ? (
            <>
              <table
                className="table text-center"
                style={{ fontSize: "1.2rem" }}
              >
                <thead
                  className="table-light"
                  style={{ position: "sticky", top: 0, background: "#d1ecf1" }}
                >
                  <tr>
                    <th>商品名稱</th>
                    <th>數量</th>
                    <th>單價</th>
                    <th>金額</th>
                    <th>折扣後</th>
                    <th style={{ color: "#CD0000" }}>退貨數量</th>
                  </tr>
                </thead>
                <tbody>
                  {selectedOrder.orderItem.length > 0 ? (
                    selectedOrder.orderItem.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unitPrice}</td>
                        <td>{item.totalPrice}</td>
                        <td>{item.discountedPrice}</td>
                        <td style={{ color: "#CD0000" }}>
                          {item.returnQuantity}
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="6">無資料</td>
                    </tr>
                  )}
                </tbody>
              </table>

              {/* 明細資訊 */}
              <div
                className="mt-3 p-3 bg-light border rounded"
                style={{ fontSize: "1rem", lineHeight: "1.7" }}
              >
                <div className="d-flex">
                  <div>
                    共計：<strong>{selectedOrder.quantitySum}</strong> 項
                  </div>
                  <div className="mx-5">
                    總計：<strong>{selectedOrder.returnSum}</strong> 元
                  </div>
                  <div>
                    退款方式：<strong>{selectedOrder.refundMethod}</strong>
                  </div>
                </div>
                <div className="d-flex mt-1">
                  <div>
                    發票寄出方式：
                    <strong>{selectedOrder.invoiceSendMethod}</strong>
                  </div>
                  <div className="ms-5">
                    郵寄地址：<strong>{selectedOrder.mailingAddress}</strong>
                  </div>
                </div>
                <div className="d-flex mt-1">
                  <div>
                    取貨：
                    <strong>{selectedOrder.pickupTime?.split("T")[0]}</strong>
                  </div>
                  <div className="ms-5">
                    退貨：
                    <strong>{selectedOrder.returnTime?.split("T")[0]}</strong>
                  </div>
                </div>
                <div
                  className="d-flex align-items-center mt-2"
                  style={{ color: "#E20000" }}
                >
                  <div>
                    退貨原因：<strong>{selectedOrder.reason}</strong>
                  </div>
                </div>
              </div>
            </>
          ) : (
            <div>載入中...</div>
          )}
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

      {/* 照片預覽 */}
      <Modal
        show={showImage}
        onHide={() => setShowImage(false)}
        centered
        size="lg"
      >
        <Modal.Header closeButton>
          <Modal.Title>圖片預覽</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center position-relative">
          {/* 左右切換按鈕 */}
          <button
            className="btn btn-light position-absolute top-50 start-0 translate-middle-y"
            style={{
              zIndex: 2,
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.5)",
              color: "white",
            }}
            onClick={handlePrev}
          >
            <FaChevronLeft size={24} />
          </button>
          <button
            className="btn btn-light position-absolute top-50 end-0 translate-middle-y"
            style={{
              zIndex: 2,
              width: "50px",
              height: "50px",
              borderRadius: "50%",
              backgroundColor: "rgba(0,0,0,0.5)",
              color: "white",
            }}
            onClick={handleNext}
          >
            <FaChevronRight size={24} />
          </button>

          {/* 固定大小的圖片 */}
          <div
            style={{
              width: "700px",
              height: "400px",
              overflow: "hidden",
              margin: "0 auto",
            }}
          >
            <img
              src={images[currentIndex].src}
              alt="退貨商品圖片"
              style={{
                width: "100%",
                height: "100%",
                objectFit: "contain", // 確保圖片按比例顯示，並在容器內居中
                borderRadius: "8px",
                cursor: "pointer",
              }}
              onClick={openFullScreen} // 點擊圖片放大
            />
          </div>
          {/* 放大圖片顯示 */}
          {showFullImage && (
            <div
              style={{
                position: "fixed",
                top: "0",
                left: "0",
                right: "0",
                bottom: "0",
                backgroundColor: "rgba(0,0,0,0.8)",
                zIndex: "1000",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
              }}
              onClick={closeFullScreen} // 點擊放大區域關閉
            >
              <img
                src={images[currentIndex].src}
                alt="放大圖片"
                style={{
                  maxWidth: "90%",
                  maxHeight: "90%",
                  borderRadius: "8px",
                  cursor: "zoom-out",
                }}
              />
            </div>
          )}
          {/* 備註 */}
          <div className="mt-3 fs-5">
            <strong>備註：</strong> {images[currentIndex].remark}
          </div>
          {/* 圓點指示器 */}
          <div className="mt-3 d-flex justify-content-center">
            {images.map((_, index) => (
              <span
                key={index}
                style={{
                  width: "10px",
                  height: "10px",
                  margin: "0 5px",
                  borderRadius: "50%",
                  backgroundColor: currentIndex === index ? "#007bff" : "#ccc",
                  cursor: "pointer",
                }}
                onClick={() => setCurrentIndex(index)}
              ></span>
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImage(false)}>
            關閉
          </Button>
        </Modal.Footer>
      </Modal>
      {/* 處理流程彈出框 */}
      <Modal
        show={showProcessModal}
        onHide={() => setShowProcessModal(false)}
        centered
      >
        <Modal.Body className="text-center">
          <div
            style={{
              display: "inline-block",
              padding: "4px 12px",
              backgroundColor: "#f7e9c7",
              color: "#333",
              borderRadius: "8px",
              fontWeight: "bold",
              fontSize: "1.3rem",
              marginBottom: "1rem",
            }}
          >
            處理中
          </div>
          <div className="fs-5" style={{ lineHeight: "1.8" }}>
            <div>
              申請人：<strong>{selectedOrder?.applicant || "王大陸"}</strong>
            </div>
            <div>
              退款方式：<strong>{selectedOrder?.refundType || "匯款"}</strong>
            </div>
            <div>
              退款人員：
              <strong>
                {selectedOrder?.handler || "台北市役男入營新訓中心"}
              </strong>
            </div>
            <div>
              退款狀態：
              <strong>{selectedOrder?.refundStatus || "待匯款"}</strong>
            </div>
            <div>
              發票寄出方式：
              <strong>{selectedOrder?.invoiceType || "郵寄"}</strong>
            </div>
            <div>
              郵寄人員：<strong>{selectedOrder?.postStaff || "柯震東"}</strong>
            </div>
            <div>
              寄出狀態：
              <strong style={{ color: "#CD0000" }}>
                {selectedOrder?.postStatus || "未寄出"}
              </strong>
            </div>
          </div>
        </Modal.Body>
      </Modal>
      {/* 修改 */}
      <Modal
        show={showEditModal}
        onHide={() => setShowEditModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>修改退貨資料</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <form className="fs-5">
            <div className="mb-3">
              <label className="form-label">退款方式：</label>
              <select
                className="form-select"
                value={editedOrder.refundType || ""}
                onChange={(e) =>
                  setEditedOrder({ ...editedOrder, refundType: e.target.value })
                }
              >
                <option value="匯款">匯款</option>
                <option value="現金">現金</option>
                <option value="原卡退刷">原卡退刷</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">退款狀態：</label>
              <select
                className="form-select"
                value={editedOrder.refundStatus || ""}
                onChange={(e) =>
                  setEditedOrder({
                    ...editedOrder,
                    refundStatus: e.target.value,
                  })
                }
              >
                <option value="待匯款">待匯款</option>
                <option value="已匯款">已匯款</option>
              </select>
            </div>
            <div className="mb-3">
              <label className="form-label">寄出狀態：</label>
              <select
                className="form-select"
                value={editedOrder.postStatus || ""}
                onChange={(e) =>
                  setEditedOrder({ ...editedOrder, postStatus: e.target.value })
                }
              >
                <option value="未寄出">未寄出</option>
                <option value="已寄出">已寄出</option>
              </select>
            </div>
          </form>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowEditModal(false)}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={() => {
              console.log("已儲存：", editedOrder); // ✅ 實際上你可以呼叫 API 或更新 state
              setShowEditModal(false);
            }}
          >
            儲存
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
