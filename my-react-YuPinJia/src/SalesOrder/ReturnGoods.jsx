import { useState, useEffect, useMemo } from "react";
import "../components/Search.css";
import SearchField from "../components/SearchField";
import { Modal, Button, Pagination } from "react-bootstrap";
import { FaChevronLeft, FaChevronRight } from "react-icons/fa";
import Swal from "sweetalert2";
import axios from "axios";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

export default function ReturnGoods() {
  // ===== 搜尋欄位 =====
  const [orderId, setOrderId] = useState("");            // orderNumber

  const [invoiceNumber, setInvoiceNumber] = useState(""); // invoiceNumber
  const [returnDate, setReturnDate] = useState("");       // returnDate (YYYY-MM-DD)
  const [returnMethod, setReturnMethod] = useState("all");// returnMethod

  // ===== 清單資料 & 載入狀態 =====
  const [tableData, setTableData] = useState([]);
  const [loading, setLoading] = useState(false);

  // ===== 明細 =====
  const [selectedOrder, setSelectedOrder] = useState(null);
  const [showModal, setShowModal] = useState(false);

  // ===== 圖片預覽（保留原功能）=====
  const [showImage, setShowImage] = useState(false);
  const [showFullImage, setShowFullImage] = useState(false);
  const images = [
    { src: "/low.png", remark: "內裡包裝破損" },
    { src: "/low1.jpg", remark: "商品表面劃痕" },
    { src: "/low2.jpg", remark: "包裝箱損壞" },
  ];
  const [currentIndex, setCurrentIndex] = useState(0);
  const handleNext = () => setCurrentIndex((p) => (p + 1) % images.length);
  const handlePrev = () => setCurrentIndex((p) => (p === 0 ? images.length - 1 : p - 1));

  // ===== 分頁狀態 =====
  const [total, setTotal] = useState(0);
  const [limit, setLimit] = useState(20);
  const [page, setPage] = useState(1); // 1-based
  const totalPages = Math.max(1, Math.ceil(total / Math.max(1, limit)));

  // 記住最後一次查詢參數（翻頁共用）
  const lastQueryRef = useMemo(() => ({ current: {} }), []);
  const setLastQuery = (obj) => (lastQueryRef.current = obj);
  const getLastQuery = () => lastQueryRef.current || {};

  // ===== 後端搜尋 =====
  const fetchReturns = async (query, _page = 1, _limit = limit) => {
    setLoading(true);
    try {
      const offset = (_page - 1) * _limit;
      const raw = {
        orderNumber: query.orderNumber || undefined,
        invoiceNumber: query.invoiceNumber || undefined,
        returnDate: query.returnDate || undefined,
        returnMethod:
          query.returnMethod && query.returnMethod !== "all"
            ? query.returnMethod
            : undefined,
        offset,
        limit: _limit,
      };
      const params = Object.fromEntries(
        Object.entries(raw).filter(([, v]) => v !== undefined && v !== "")
      );

      const res = await axios.get(`${API_BASE}/t_ReturnOrder`, { params });

      // 相容處理：可能是 array 或 { total, limit, items }
      let list = [];
      let newTotal = 0;
      let newLimit = _limit;

      if (Array.isArray(res.data)) {
        list = res.data;
        // 舊格式沒有 total，只能用目前長度估
        newTotal = list.length;
      } else if (res.data && typeof res.data === "object") {
        const { total: t, limit: l, items } = res.data;
        newTotal = typeof t === "number" ? t : 0;
        newLimit = typeof l === "number" && l > 0 ? l : _limit;

        if (Array.isArray(items)) {
          list = items;
        } else if (Array.isArray(items?.[0])) {
          list = items[0];
        } else {
          list = [];
        }
      }

      // 映射到表格欄位
      const mapped = list.map((order) => ({
        id: order.id,
        orderId: order.orderNumber,
        store: order.storeName || order.store || "林園門市",
        invoice: order.invoiceNumber || "無",
        endDate: order.returnTime
          ? String(order.returnTime).split("T")[0]
          : order.returnDate || "無",
        pay: order.returnMethod || "無",
        reason: order.reason || "無",
      }));

      setTableData(mapped);
      setTotal(newTotal);
      setLimit(newLimit);
    } catch (error) {
      console.error("載入退貨清單失敗:", error);
      Swal.fire("錯誤", "資料載入失敗，請稍後再試", "error");
    } finally {
      setLoading(false);
    }
  };

  // ===== 初次載入：帶 URL 初值 =====
  useEffect(() => {
    const qs = new URLSearchParams(window.location.search);
    const init = {
      orderNumber: qs.get("orderNumber") || "",
      invoiceNumber: qs.get("invoiceNumber") || "",
      returnDate: qs.get("returnDate") || "",
      returnMethod: qs.get("returnMethod") || "all",
    };
    setOrderId(init.orderNumber);
    setInvoiceNumber(init.invoiceNumber);
    setReturnDate(init.returnDate);
    setReturnMethod(init.returnMethod || "all");

    setLastQuery(init);
    setPage(1);
    fetchReturns(init, 1, limit);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ===== 條件變動 -> 自動搜尋（debounce 350ms）=====
  useEffect(() => {
    const query = {
      orderNumber: orderId || "",
      invoiceNumber: invoiceNumber || "",
      returnDate: returnDate || "",
      returnMethod: returnMethod || "all",
    };

    // 同步到 URL
    const qs = new URLSearchParams({
      ...(query.orderNumber ? { orderNumber: query.orderNumber } : {}),
      ...(query.invoiceNumber ? { invoiceNumber: query.invoiceNumber } : {}),
      ...(query.returnDate ? { returnDate: query.returnDate } : {}),
      ...(query.returnMethod ? { returnMethod: query.returnMethod } : {}),
    }).toString();
    window.history.pushState({}, "", `?${qs}`);

    setLastQuery(query);
    setPage(1);

    const t = setTimeout(() => fetchReturns(query, 1, limit), 350);
    return () => clearTimeout(t);
  }, [orderId, invoiceNumber, returnDate, returnMethod]); // 不含 page/limit

  // ===== 分頁動作 =====
  const goPage = (p) => {
    const safe = Math.min(Math.max(1, p), totalPages);
    setPage(safe);
    fetchReturns(getLastQuery(), safe, limit);
  };

  const handleChangePageSize = (e) => {
    const newLimit = Number(e.target.value) || 20;
    setLimit(newLimit);
    setPage(1);
    fetchReturns(getLastQuery(), 1, newLimit);
  };

  // ===== 明細 =====
  const handleView = async (row) => {
    try {
      const res = await axios.get(`${API_BASE}/t_ReturnOrder/${row.id}`);
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

  return (
    <>
      {/* 搜尋列（無「搜尋」按鈕，輸入即自動送出） */}
      <div className="search-container d-flex flex-wrap gap-3 px-4 py-3 rounded">
        <SearchField
          label="訂單編號"
          type="text"
          value={orderId}
          onChange={(e) => setOrderId(e.target.value)}
        />
        <SearchField
          label="發票號碼"
          type="text"
          value={invoiceNumber}
          onChange={(e) => setInvoiceNumber(e.target.value)}
        />
        <SearchField
          label="退貨日期"
          type="date"
          value={returnDate}
          onChange={(e) => setReturnDate(e.target.value)}
        />
        <SearchField
          label="退貨方式"
          type="select"
          value={returnMethod}
          onChange={(e) => setReturnMethod(e.target.value)}
          options={[
            { value: "all", label: "全部" },
            { value: "現金", label: "現金" },
            { value: "匯款", label: "匯款" },
            { value: "原卡退刷", label: "原卡退刷" },
            { value: "其它", label: "其它" },
          ]}
        />

        {/* 清除搜尋 */}
        <button
          className="btn btn-outline-secondary"
          onClick={() => {
            setOrderId("");
            setInvoiceNumber("");
            setReturnDate("");
            setReturnMethod("all");
            setPage(1);
            setTotal(0);
            window.history.pushState({}, "", window.location.pathname);
            const empty = {};
            setLastQuery(empty);
            fetchReturns(empty, 1, limit);
          }}
        >
          清除搜尋
        </button>
      </div>

      {/* 表格 */}
      <div className="table-container position-relative" style={{ maxHeight: "73vh", overflowY: "auto" }}>
        {loading && (
          <div
            className="loading-message"
            style={{ position: "absolute", top: "50%", left: "50%", transform: "translate(-50%, -50%)", fontSize: "1.2rem", color: "#28a745" }}
          >
            資料載入中...
          </div>
        )}

        <table className="table text-center" style={{ fontSize: "1.2rem" }}>
          <thead
            className="table-light"
            style={{ borderTop: "1px solid #c5c6c7", position: "sticky", top: 0, background: "#d1ecf1", zIndex: 1 }}
          >
            <tr>
              <th scope="col">訂單編號</th>
              <th scope="col">門市</th>
              <th scope="col">發票</th>
              <th scope="col">退貨日期</th>
              <th scope="col">退貨方式</th>
              <th scope="col">退貨明細</th>
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
                    <button className="check-button" onClick={() => handleView(item)}>檢視</button>
                  </td>
                  <td>
                    <button
                      className="edit-button"
                      onClick={() => {
                        // 這裡保留未來擴充（例如編輯退貨單）
                        Swal.fire("提示", "此功能可在未來擴充：例如編輯退貨單。", "info");
                      }}
                    >
                      修改
                    </button>
                  </td>
                </tr>
              ))
            ) : (
              <tr><td colSpan="12">無資料</td></tr>
            )}
          </tbody>
        </table>
      </div>

      {/* 表格底部：每頁筆數 + 分頁器 */}
      <div className="d-flex align-items-center justify-content-end mt-2 ps-3 pe-3 mb-3" >
        <div className="d-flex align-items-center flex-wrap gap-2 justify-content-end">
          {/* 每頁筆數（下方） */}
          <div className="d-flex align-items-center">
            <span className="me-2">每頁</span>
            <select
              className="form-select form-select-sm"
              style={{ width: 100 }}
              value={limit}
              onChange={handleChangePageSize}
            >
              {[10, 20, 30, 50, 100].map((n) => (
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
            <span className="ms-2">筆</span>
          </div>

          {/* 分頁器 */}
          <span className="ms-3 me-2">
            共 <strong>{total}</strong> 筆，第 <strong>{page}</strong> / {totalPages} 頁
          </span>
          <Pagination className="mb-0">
            <Pagination.First disabled={page <= 1} onClick={() => goPage(1)} />
            <Pagination.Prev disabled={page <= 1} onClick={() => goPage(page - 1)} />
            {(() => {
              const pages = [];
              const start = Math.max(1, page - 2);
              const end = Math.min(totalPages, start + 4);
              for (let p = start; p <= end; p++) {
                pages.push(
                  <Pagination.Item key={p} active={p === page} onClick={() => goPage(p)}>
                    {p}
                  </Pagination.Item>
                );
              }
              return pages;
            })()}
            <Pagination.Next disabled={page >= totalPages} onClick={() => goPage(page + 1)} />
            <Pagination.Last disabled={page >= totalPages} onClick={() => goPage(totalPages)} />
          </Pagination>
        </div>
      </div>

      {/* 退貨明細 Modal */}
      <Modal show={showModal} onHide={closeModal} dialogClassName="w-auto-modal" size="lg" centered>
        <Modal.Header closeButton><Modal.Title>退貨明細</Modal.Title></Modal.Header>
        <Modal.Body>
          {selectedOrder ? (
            <>
              <table className="table text-center" style={{ fontSize: "1.2rem" }}>
                <thead className="table-light" style={{ position: "sticky", top: 0, background: "#d1ecf1" }}>
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
                  {selectedOrder.orderItem?.length > 0 ? (
                    selectedOrder.orderItem.map((item, idx) => (
                      <tr key={idx}>
                        <td>{item.productName}</td>
                        <td>{item.quantity}</td>
                        <td>{item.unitPrice}</td>
                        <td>{item.totalPrice}</td>
                        <td>{item.discountedPrice}</td>
                        <td style={{ color: "#CD0000" }}>{item.returnQuantity}</td>
                      </tr>
                    ))
                  ) : (
                    <tr><td colSpan="6">無資料</td></tr>
                  )}
                </tbody>
              </table>

              <div className="mt-3 p-3 bg-light border rounded" style={{ fontSize: "1rem", lineHeight: 1.7 }}>
                <div className="d-flex">
                  <div>共計：<strong>{selectedOrder.quantitySum}</strong> 項</div>
                  <div className="mx-5">總計：<strong>{selectedOrder.returnSum}</strong> 元</div>
                  <div>退款方式：<strong>{selectedOrder.refundMethod}</strong></div>
                </div>
                <div className="d-flex mt-1">
                  <div>發票寄出方式：<strong>{selectedOrder.invoiceSendMethod}</strong></div>
                  <div className="ms-5">郵寄地址：<strong>{selectedOrder.mailingAddress}</strong></div>
                </div>
                <div className="d-flex mt-1">
                  <div>取貨：<strong>{selectedOrder.pickupTime?.split("T")[0]}</strong></div>
                  <div className="ms-5">退貨：<strong>{selectedOrder.returnTime?.split("T")[0]}</strong></div>
                </div>
                <div className="d-flex align-items-center mt-2" style={{ color: "#E20000" }}>
                  <div>退貨原因：<strong>{selectedOrder.reason}</strong></div>
                </div>
              </div>
            </>
          ) : (
            <div>載入中...</div>
          )}
        </Modal.Body>
        <Modal.Footer>
          <Button className="modalButton" variant="secondary" onClick={closeModal}>關閉</Button>
        </Modal.Footer>
      </Modal>

      {/* 圖片預覽（保留） */}
      <Modal show={showImage} onHide={() => setShowImage(false)} centered size="lg">
        <Modal.Header closeButton><Modal.Title>圖片預覽</Modal.Title></Modal.Header>
        <Modal.Body className="text-center position-relative">
          <button
            className="btn btn-light position-absolute top-50 start-0 translate-middle-y"
            style={{ zIndex: 2, width: 50, height: 50, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", color: "white" }}
            onClick={handlePrev}
          >
            <FaChevronLeft size={24} />
          </button>
          <button
            className="btn btn-light position-absolute top-50 end-0 translate-middle-y"
            style={{ zIndex: 2, width: 50, height: 50, borderRadius: "50%", backgroundColor: "rgba(0,0,0,0.5)", color: "white" }}
            onClick={handleNext}
          >
            <FaChevronRight size={24} />
          </button>

          <div style={{ width: 700, height: 400, overflow: "hidden", margin: "0 auto" }}>
            <img
              src={images[currentIndex].src}
              alt="退貨商品圖片"
              style={{ width: "100%", height: "100%", objectFit: "contain", borderRadius: 8, cursor: "pointer" }}
              onClick={() => setShowFullImage(true)}
            />
          </div>

          {showFullImage && (
            <div
              style={{ position: "fixed", inset: 0, backgroundColor: "rgba(0,0,0,0.8)", zIndex: 1000, display: "flex", justifyContent: "center", alignItems: "center" }}
              onClick={() => setShowFullImage(false)}
            >
              <img src={images[currentIndex].src} alt="放大圖片" style={{ maxWidth: "90%", maxHeight: "90%", borderRadius: 8, cursor: "zoom-out" }} />
            </div>
          )}

          <div className="mt-3 fs-5"><strong>備註：</strong> {images[currentIndex].remark}</div>
          <div className="mt-3 d-flex justify-content-center">
            {images.map((_, index) => (
              <span
                key={index}
                style={{
                  width: 10, height: 10, margin: "0 5px", borderRadius: "50%",
                  backgroundColor: currentIndex === index ? "#007bff" : "#ccc", cursor: "pointer",
                }}
                onClick={() => setCurrentIndex(index)}
              />
            ))}
          </div>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={() => setShowImage(false)}>關閉</Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
