import { Modal, Table, Button } from "react-bootstrap";
import { useState } from "react";

export default function ReceiveRecordModal({ show, onHide, data }) {
  const [selectedRecord, setSelectedRecord] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  const sampleData = [
    {
      orderId: "R100001",
      branch: "馬公門市",
      date: "2024-12-12",
      operator: "汪汪助理",
      detail: [
        { product: "干貝醬", quantity: 20 },
        { product: "花枝丸", quantity: 50 }
      ]
    },
    ...data
  ];

  const calcTotal = () => {
    if (!selectedRecord) return { count: 0, total: 0 };
    const total = selectedRecord.detail.reduce((sum, item) => sum + item.quantity, 0);
    return { count: selectedRecord.detail.length, total };
  };

  return (
    <>
      <Modal show={show} onHide={onHide} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>領貨紀錄</Modal.Title>
        </Modal.Header>
        <Modal.Body>
          <Table bordered responsive>
            <thead className="table-light">
              <tr>
                <th>領貨單號</th>
                <th>門市</th>
                <th>領貨日期</th>
                <th>操作員</th>
                <th>明細</th>
              </tr>
            </thead>
            <tbody>
              {sampleData.map((item, index) => (
                <tr key={index}>
                  <td>{item.orderId}</td>
                  <td>{item.branch}</td>
                  <td>{item.date}</td>
                  <td>{item.operator}</td>
                  <td>
                    <button
                      className="check-button"
                      onClick={() => {
                        setSelectedRecord(item);
                        setShowDetailModal(true);
                      }}
                    >
                      檢視
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        </Modal.Body>
        <Modal.Footer>
          <Button variant="secondary" onClick={onHide}>關閉</Button>
        </Modal.Footer>
      </Modal>

      <Modal show={showDetailModal} onHide={() => setShowDetailModal(false)} size="lg" centered>
        <Modal.Header closeButton>
          <Modal.Title>領貨明細</Modal.Title>
        </Modal.Header>
        <Modal.Body className="bg-light">
          {selectedRecord && (
            <div className="mb-3 p-3 bg-white border rounded">
              <div className="fw-bold mb-2">領貨單號：{selectedRecord.orderId}</div>
              <div className="row mx-1">
                <div className="col-md-4">門市：{selectedRecord.branch}</div>
                <div className="col-md-4">領貨日期：{selectedRecord.date}</div>
                <div className="col-md-4">操作員：{selectedRecord.operator}</div>
              </div>
            </div>
          )}
          <div className="table-responsive bg-white p-3 border rounded">
            <Table bordered className="text-center align-middle">
              <thead className="table-info">
                <tr>
                  <th>商品名稱</th>
                  <th>數量</th>
                </tr>
              </thead>
              <tbody>
                {selectedRecord?.detail.map((item, idx) => (
                  <tr key={idx}>
                    <td>{item.product}</td>
                    <td>{item.quantity}</td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <div className="text-end fw-bold mt-2">
              共計 {calcTotal().count} 項，總數量：{calcTotal().total} 件
            </div>
          </div>
        </Modal.Body>
      </Modal>
    </>
  );
}
