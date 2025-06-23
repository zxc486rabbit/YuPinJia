import { Modal, Table, Button } from "react-bootstrap";

export default function ReservedModal({ show, onHide, orders, onRestore }) {
  return (
    <Modal show={show} onHide={onHide} size="lg" centered backdrop="static">
      <Modal.Header closeButton>
        <Modal.Title>已保留訂單</Modal.Title>
      </Modal.Header>
      <Modal.Body style={{ maxHeight: 400, overflowY: "auto" }}>
        {orders.length === 0 ? (
          <p className="text-center my-4">目前沒有暫存的訂單</p>
        ) : (
          <Table striped hover>
            <thead>
              <tr>
                <th>#</th>
                <th>會員</th>
                <th>項目數</th>
                <th>建立時間</th>
                <th></th>
              </tr>
            </thead>
            <tbody>
              {orders.map((o, idx) => (
                <tr key={o.key}>
                  <td>{idx + 1}</td>
                  <td>{o.memberName}</td>
                  <td>{o.items.length}</td>
                  <td>{new Date(o.savedAt).toLocaleString()}</td>
                  <td>
                    <Button size="sm" onClick={() => onRestore(o)}>
                      取回
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </Table>
        )}
      </Modal.Body>
    </Modal>
  );
}