import { useState, useEffect, useRef } from "react";
import * as XLSX from "xlsx";
import { FaSearch, FaTimes } from "react-icons/fa";
import SearchField from "../components/SearchField";
import RestockRecordModal from "./RestockRecordModal";
import Swal from "sweetalert2";

export default function Restock() {
  const [orderId, setOrderId] = useState("");
  const [tableData, setTableData] = useState([]);
  const [inputValues, setInputValues] = useState({});
  const [restockList, setRestockList] = useState([]);
  const fileInputRef = useRef(null);
  const [showModal, setShowModal] = useState(false);
  const [restockRecords, setRestockRecords] = useState([]);

  const handleSearch = () => {
    console.log("搜尋條件：", { orderId });
  };

  const handleAdd = (item) => {
    const quantity = parseInt(inputValues[item.product], 10);
    if (isNaN(quantity) || quantity <= 0) return;

    setRestockList((prev) => {
      const existing = prev.find((p) => p.product === item.product);
      if (existing) {
        return prev.map((p) =>
          p.product === item.product
            ? { ...p, quantity: p.quantity + quantity }
            : p
        );
      }
      return [
        ...prev,
        {
          product: item.product,
          date: new Date().toISOString().split("T")[0],
          quantity,
          supplier: "汪汪集團",
          branch: "馬公門市",
          image: "檢視",
          detail: "檢視",
          operator: "汪寶寶",
          manager: "大胖熊",
        },
      ];
    });

    setInputValues((prev) => ({ ...prev, [item.product]: "" }));
  };

  const handleDelete = (product) => {
    const confirmDelete = window.confirm(
      `確定要刪除「${product}」這筆商品嗎？`
    );
    if (confirmDelete) {
      setRestockList((prev) => prev.filter((item) => item.product !== product));
    }
  };

  const handleFileUpload = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const data = new Uint8Array(event.target.result);
      const workbook = XLSX.read(data, { type: "array" });
      const sheetName = workbook.SheetNames[0];
      const worksheet = workbook.Sheets[sheetName];
      const jsonData = XLSX.utils.sheet_to_json(worksheet);

      const parsed = jsonData
        .filter((row) => row["商品名稱"] && row["進貨日期"] && row["數量"])
        .map((row) => ({
          product: row["商品名稱"],
          date: row["進貨日期"],
          quantity: parseInt(row["數量"], 10) || 0,
          supplier: row["供應商名稱"] || "-",
          branch: row["進貨門市"] || "-",
          image: "檢視",
          detail: "檢視",
          operator: row["操作員"] || "-",
          manager: row["主管簽核"] || "-",
        }));

      setRestockList((prev) => [...prev, ...parsed]);
    };
    reader.readAsArrayBuffer(file);
  };

  useEffect(() => {
    fetch("/SalesTable.json")
      .then((response) => response.json())
      .then((data) => setTableData(data))
      .catch((error) => console.error("載入失敗:", error));
  }, []);

  return (
    <div className="container-fluid">
      <div className="row">
        <div
          className="col-4 d-flex flex-column"
          style={{ background: "#fff", height: "89vh" }}
        >
          <div className="flex-grow-1">
            <div className="d-flex justify-content-between align-items-center my-3 mx-4">
              <h4 className="fw-bold m-0">進貨明細</h4>
              <div>
                <input
                  type="file"
                  accept=".xlsx,.xls"
                  ref={fileInputRef}
                  onChange={handleFileUpload}
                  style={{ display: "none" }}
                />
                <button
                  className="add-button me-2"
                  onClick={() => fileInputRef.current.click()}
                >
                  上傳進貨單
                </button>
                <button
                  className="add-button"
                  style={{ background: "#D68E08" }}
                  onClick={() => setShowModal(true)}
                >
                  進貨紀錄
                </button>
              </div>
            </div>
            <table className="table mb-2" style={{ fontSize: "1.2rem" }}>
              <thead
                className="table-light"
                style={{ borderTop: "1px solid #c5c6c7" }}
              >
                <tr>
                  <th className="text-center">商品名稱</th>
                  <th className="text-center">進貨日期</th>
                  <th className="text-center">數量</th>
                  <th className="text-center">操作</th>
                </tr>
              </thead>
              <tbody>
                {restockList.map((item, index) => (
                  <tr key={index}>
                    <td className="text-center">{item.product}</td>
                    <td className="text-center">{item.date}</td>
                    <td className="text-center">{item.quantity}</td>
                    <td className="text-center">
                      <FaTimes
                        onClick={() => handleDelete(item.product)}
                        style={{
                          color: "red",
                          cursor: "pointer",
                          fontSize: "1rem",
                        }}
                        title="刪除"
                      />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            <button
              className="clear-button d-flex justify-content-center ms-auto me-2"
              onClick={() => {
                Swal.fire({
                  title: "確定要清空進貨明細？",
                  text: "此操作無法復原！",
                  icon: "warning",
                  showCancelButton: true,
                  confirmButtonText: "確定",
                  cancelButtonText: "取消",
                }).then((result) => {
                  if (result.isConfirmed) {
                    setRestockList([]);
                    Swal.fire("已清空", "所有進貨明細已被清空", "success");
                  }
                });
              }}
            >
              清空
            </button>
          </div>
          <div
            className="d-flex justify-content-between mx-4 align-items-center py-3"
            style={{
              fontSize: "1.3rem",
              fontWeight: "bold",
              lineHeight: "1.8",
              borderTop: "2px solid #E2E2E2",
            }}
          >
            <span>
              商品總數 :{" "}
              {restockList.reduce((sum, item) => sum + item.quantity, 0)} 件
            </span>
            <button
  className="cargo-button"
  onClick={() => {
    if (restockList.length === 0) {
      Swal.fire("無進貨資料", "請先添加進貨明細後再進貨", "info");
      return;
    }

    Swal.fire({
      title: "確認進貨？",
      text: `共 ${restockList.reduce(
        (sum, item) => sum + item.quantity,
        0
      )} 件商品`,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "進貨",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        setRestockRecords((prev) => [...prev, ...restockList]); // 👈 加到紀錄
        setRestockList([]); // 清空購物車
        Swal.fire("進貨完成", "商品進貨已完成", "success");
      }
    });
  }}
>
  進貨
</button>
          </div>
        </div>

        <div className="col-8">
          <div className="search-container d-flex gap-3 px-5 pt-4 pb-3">
            <SearchField
              type="select"
              value={orderId}
              onChange={(e) => setOrderId(e.target.value)}
              options={[
                { value: "none", label: "請選擇商品種類" },
                { value: "all", label: "澎湖特色土產海產類" },
                { value: "store", label: "自製糕餅類" },
                { value: "delivery", label: "澎湖冷凍海鮮產品類" },
                { value: "5", label: "澎湖海產(乾貨)類" },
              ]}
            />
            <div className="search-bar ms-auto">
              <FaSearch className="search-icon" />
              <input type="text" placeholder="搜尋..." />
            </div>
            <button onClick={handleSearch} className="search-button">
              搜尋
            </button>
          </div>

          <div style={{ height: "76vh", overflow: "auto" }}>
            <table
              className="table mx-auto text-center"
              style={{
                fontSize: "1.3rem",
                border: "1px solid #D7D7D7",
                width: "90%",
              }}
            >
              <thead
                className="table-info"
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
                  <th scope="col">操作</th>
                </tr>
              </thead>
              <tbody>
                {tableData.length > 0 ? (
                  tableData.map((item, index) => (
                    <tr key={index}>
                      <td>{item.product}</td>
                      <td>
                        <input
                          className="text-center"
                          type="number"
                          value={inputValues[item.product] || ""}
                          onChange={(e) =>
                            setInputValues((prev) => ({
                              ...prev,
                              [item.product]: e.target.value,
                            }))
                          }
                        />
                      </td>
                      <td>
                        <button
                          className="add-button me-2"
                          onClick={() => handleAdd(item)}
                        >
                          加入
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
        </div>
      </div>

      <RestockRecordModal
  show={showModal}
  onHide={() => setShowModal(false)}
  data={restockRecords}
/>
    </div>
  );
}
