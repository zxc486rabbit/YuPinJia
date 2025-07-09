import { Modal, Button, Table, Form } from "react-bootstrap";
import { FaEdit, FaTrash } from "react-icons/fa";
import { useState } from "react";
import Swal from "sweetalert2";

export default function RestockRecordModal({ show, onHide, data }) {
  const [showImageModal, setShowImageModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [isEditing, setIsEditing] = useState(false);
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [editableInfo, setEditableInfo] = useState({});

  const displayData = [
    {
      product: "御品家大禮包",
      branch: "馬公門市",
      supplier: "汪汪集團",
      date: "2024-12-04",
      quantity: 100,
      image: "檢視",
      detail: [
        {
          name: "御品家大禮包",
          category: "禮盒",
          quantity: 50,
          pack: 10,
          unit: "包",
          price: 150,
          cost: 120,
        },
        {
          name: "海苔餅",
          category: "零食",
          quantity: 100,
          pack: 20,
          unit: "包",
          price: 80,
          cost: 65,
        },
      ],
      operator: "汪寶寶",
      manager: "大胖熊",
    },
    ...data.map((item) => ({
      ...item,
      detail: item.detail || [], // 確保 detail 是陣列
    })),
  ];

  const handleShowDetail = (record, editing = false) => {
    setSelectedRecord({
      ...record,
      detail: Array.isArray(record.detail) ? record.detail : [], // 保護
    });
    setIsEditing(editing);
    setEditableInfo({
      branch: record.branch,
      supplier: record.supplier,
      date: record.date,
      operator: record.operator,
    });
    setShowDetailModal(true);
  };

  const handleSave = () => {
    Swal.fire({
      title: "確認儲存變更？",
      text: "儲存後將更新進貨紀錄",
      icon: "question",
      showCancelButton: true,
      confirmButtonText: "儲存",
      cancelButtonText: "取消",
    }).then((result) => {
      if (result.isConfirmed) {
        setIsEditing(false);
        Swal.fire("已儲存", "進貨紀錄已更新", "success").then(() => {
          setShowDetailModal(false);
        });
      }
    });
  };

  const calcTotal = () => {
    if (!selectedRecord) return { count: 0, total: 0 };
    const allItems = selectedRecord.detail || [];
    const totalAmount = allItems.reduce(
      (sum, item) => sum + (item.quantity ?? 0) * (item.cost ?? 0),
      0
    );
    return { count: allItems.length, total: totalAmount };
  };

  return (
    <>
      <Modal
        show={show}
        onHide={onHide}
        size="xl"
        dialogClassName="modal-80w"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>進貨紀錄</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered responsive>
            <thead className="table-light">
              <tr>
                <th>進貨單號</th>
                <th>進貨門市</th>
                <th>供應商名稱</th>
                <th>進貨日期</th>
                <th>總數量</th>
                <th>貨單照片</th>
                <th>進貨明細</th>
                <th>操作員</th>
                <th>主管簽核</th>
                <th>操作</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((item, index) => (
                <tr key={index}>
                  <td>T{1132000 + index}</td>
                  <td>{item.branch}</td>
                  <td>{item.supplier}</td>
                  <td>{item.date}</td>
                  <td>{item.quantity}</td>
                  <td>
                    <button
                      className="check-button"
                      onClick={() => setShowImageModal(true)}
                    >
                      {item.image}
                    </button>
                  </td>
                  <td>
                    <button
                      className="check-button"
                      onClick={() => handleShowDetail(item)}
                    >
                      檢視
                    </button>
                  </td>
                  <td>{item.operator}</td>
                  <td>{item.manager}</td>
                  <td>
                    <button
                      className="btn btn-sm btn-outline-primary me-1"
                      onClick={() => handleShowDetail(item, true)}
                    >
                      <FaEdit />
                    </button>
                    <button className="btn btn-sm btn-outline-danger">
                      <FaTrash />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>
            關閉
          </Button>
        </Modal.Footer>
      </Modal>

      <Modal
        show={showImageModal}
        onHide={() => setShowImageModal(false)}
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>貨單照片</Modal.Title>
        </Modal.Header>
        <Modal.Body className="text-center">
          <img
            src="https://via.placeholder.com/600x400.png?text=Sample+Invoice"
            alt="貨單"
            className="img-fluid"
          />
        </Modal.Body>
      </Modal>

      <Modal
        show={showDetailModal}
        onHide={() => setShowDetailModal(false)}
        size="xl"
        dialogClassName="modal-80w"
        centered
      >
        <Modal.Header closeButton>
          <Modal.Title>進貨明細</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light">
          {selectedRecord && (
            <div className="mb-4 p-3 border rounded bg-white">
              <div className="row g-3">
                {["門市", "供應商", "進貨日期", "操作員"].map((label, i) => (
                  <div className="col-md-3" key={label}>
                    <Form.Label style={{ fontSize: "1rem" }}>
                      {label}
                    </Form.Label>
                    <Form.Control
                      type={label.includes("日期") ? "date" : "text"}
                      value={editableInfo[Object.keys(editableInfo)[i]]}
                      onChange={(e) =>
                        setEditableInfo({
                          ...editableInfo,
                          [Object.keys(editableInfo)[i]]: e.target.value,
                        })
                      }
                      disabled={!isEditing}
                      style={{ fontSize: "1rem" }}
                    />
                  </div>
                ))}
              </div>
            </div>
          )}

          <div className="table-responsive border p-3 rounded shadow-sm bg-white">
            <Table bordered className="align-middle text-center">
              <thead className="table-info">
                <tr>
                  <th>商品名稱</th>
                  <th>分類</th>
                  <th>數量</th>
                  <th>分包裝數量</th>
                  <th>單位</th>
                  <th>單價</th>
                  <th>進貨價</th>
                </tr>
              </thead>
              <tbody>
                {selectedRecord?.detail?.length > 0 ? (
                  selectedRecord.detail.map((item, idx) => (
                    <tr key={idx}>
                      <td>{item.name}</td>
                      <td>{item.category}</td>
                      <td>{item.quantity}</td>
                      <td>{item.pack}</td>
                      <td>{item.unit}</td>
                      <td>{item.price}</td>
                      <td>{item.cost}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="7">此筆紀錄沒有明細資料</td>
                  </tr>
                )}
              </tbody>
            </Table>
            <div className="text-end fw-bold mt-3">
              共計 {calcTotal().count} 項，總計：
              {calcTotal().total.toLocaleString()} 元
            </div>
          </div>

          {isEditing && (
            <div className="text-end mt-3">
              <Button
                style={{
                  backgroundColor: "#D68E08",
                  border: "none",
                  fontSize: "1rem",
                }}
                onClick={handleSave}
              >
                儲存
              </Button>
            </div>
          )}
        </Modal.Body>
      </Modal>
    </>
  );
}
