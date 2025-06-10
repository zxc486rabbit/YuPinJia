import { useState, useEffect } from "react";
import "../components/Search.css"; // 引入 搜尋框 的 CSS 來調整樣式
import SearchField from "../components/SearchField"; // 引入 搜尋框 模組
import { Modal, Button } from "react-bootstrap"; // 使用彈出框套件
import { BiImage } from "react-icons/bi";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa"; // 引入 FontAwesome 箭頭

export default function ReturnGoods() {
  const [orderId, setOrderId] = useState("");
  const [pickupTime, setPickupTime] = useState("");

  const [tableData, setTableData] = useState([]); // 存放表格資料
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [showImage, setShowImage] = useState(false); //顯示照片
  const [showFullImage, setShowFullImage] = useState(false); // 用來控制是否顯示放大圖片
  
// 測試圖片與備註
const images = [
  { src: "/low.png", remark: "內裡包裝破損" },
  { src: "/low1.jpg", remark: "商品表面劃痕" },
  { src: "/low2.jpg", remark: "包裝箱損壞" }
];
 // 當前顯示的圖片索引
const [currentIndex, setCurrentIndex] = useState(0);

// 切換至下一張圖片
  const handleNext = () => {
    setCurrentIndex((prev) => (prev + 1) % images.length);
  };

  const handlePrev = () => {
    setCurrentIndex((prev) =>
      prev === 0 ? images.length - 1 : prev - 1
    );
  };
  const openFullScreen = () => {
    setShowFullImage(true); // 顯示放大圖片
  };
  
  const closeFullScreen = () => {
    setShowFullImage(false); // 關閉放大圖片
  };
  // const openFullScreen = (src) => {
  //   const newWindow = window.open(src, "_blank");
  //   newWindow.focus();
  // };

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId, pickupTime });
  };

  useEffect(() => {
    fetch("/SalesTable.json") // 從 public 目錄讀取 JSON
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  const handleView = (order) => {
    setSelectedOrder(order);
    setShowModal(true);
    console.log(selectedOrder);
  };

  const closeModal = () => {
    setShowModal(false);
    setSelectedOrder(null);
  };

  return (
    <>
      <div className="search-container d-flex flex-wrap gap-3 px-4 pt-4 pb-3 rounded">
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

        {/* 搜尋按鈕 */}
        <button onClick={handleSearch} className="search-button">
          搜尋
        </button>
      </div>
      {/* 表格 */}
      <div
        className="table-container"
        style={{
          maxHeight: "82vh", // 根據你想要的高度調整
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
              <th scope="col">取貨時間</th>
              <th scope="col">退貨時間</th>
              <th scope="col">退貨方式</th>
              <th scope="col">退款原因</th>
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
                  <td>{item.startDate}</td>
                  <td>{item.endDate}</td>
                  <td>{item.pay}</td>
                  <td>
                    <button className="check-button">檢視</button>
                  </td>
                  <td>
                    <button
                      className="check-button"
                      onClick={() => handleView(item)}
                    >
                      檢視
                    </button>
                  </td>
                  <td>
                    <button className="check-button">檢視</button>
                  </td>
                  <td>
                    <button className="edit-button">修改</button>
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

      <Modal
        show={showModal}
        onHide={closeModal}
        dialogClassName="w-auto-modal"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>退貨明細</Modal.Title>
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
                <th scope="col" style={{ color: "#CD0000" }}>
                  退貨數量
                </th>
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
                  <td style={{ color: "#CD0000" }}>1</td>
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

              return (
                <div
                  className="mt-3 p-3  bg-light border rounded "
                  style={{ fontSize: "1.2rem" }}
                >
                  <div className="d-flex">
                    <div>
                      共計：<strong>1</strong> 項
                    </div>
                    <div className="mx-5">
                      總計：<strong>{total.toLocaleString()}</strong> 元
                    </div>
                    <div>
                      支付方式：<strong>{selectedOrder.pay}</strong>
                    </div>
                  </div>
                  <div className="d-flex mt-1">
                    <div>
                      發票寄出方式：<strong>郵寄</strong>
                    </div>
                    <div className="ms-5">
                      郵寄地址：<strong>高雄市鳳山區瑞隆路7巷27號</strong>
                    </div>
                  </div>
                  <div className="d-flex mt-1">
                    <div>
                      取貨：<strong>{selectedOrder.startDate}</strong>
                    </div>
                    <div className="ms-5">
                      退貨：
                      <strong>
                        {selectedOrder.endDate}
                        <span className="ms-1" style={{ color: "#E20000" }}>
                          (3天 1時 5分)
                        </span>
                      </strong>
                    </div>
                  </div>
                  {/* 紅字 */}
                  <div
                    className="d-flex align-items-center mt-2"
                    style={{ color: "#E20000" }}
                  >
                    <div>
                      退貨共計：<strong>1</strong> 項
                    </div>
                    <div className="mx-5">
                      退款方式：<strong>現金</strong>
                    </div>
                    <div>
                      退貨原因：<strong>內裡包裝破損</strong>
                      <BiImage
                        size={26}
                        style={{
                          color: "#666",
                          marginLeft: "10px",
                          cursor: "pointer",
                        }}
                        onClick={() => setShowImage(true)}
                      />
                    </div>
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

      {/* 照片預覽 */}
      <Modal show={showImage} onHide={() => setShowImage(false)} centered size="lg">
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
        color: "white"
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
        color: "white"
      }}
      onClick={handleNext}
    >
      <FaChevronRight size={24} />
    </button>

     {/* 固定大小的圖片 */}
     <div style={{ width: "700px", height: "400px", overflow: "hidden", margin: "0 auto" }}>
      <img
        src={images[currentIndex].src}
        alt="退貨商品圖片"
        style={{
          width: "100%",
          height: "100%",
          objectFit: "contain",  // 確保圖片按比例顯示，並在容器內居中
          borderRadius: "8px",
          cursor: "pointer"
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
          alignItems: "center"
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
            cursor: "zoom-out"
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
            cursor: "pointer"
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
    </>
  );
}
