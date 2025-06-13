import { Modal, Button } from "react-bootstrap";
import {
  FaUserShield,
  FaCreditCard,
  FaPercentage,
  FaMoneyBillWave
} from "react-icons/fa";

export default function DistributorInfoModal({ show, onHide, info }) {
  if (!info) return null;

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>
          經銷會員資訊
        </Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <div className="p-3 bg-light rounded shadow-sm">
          <div className="d-flex align-items-center mb-3">
            <FaUserShield className="me-3 fs-4 text-primary" />
            <div>
              <strong>經銷等級：</strong> {info.level}
            </div>
          </div>

          <div className="d-flex align-items-center mb-3">
            <FaCreditCard className="me-3 fs-4 text-success" />
            <div>
              <strong>信用額度：</strong> NT$ {info.creditLimit.toLocaleString()}
            </div>
          </div>

          <div className="d-flex align-items-center mb-3">
            <FaPercentage className="me-3 fs-4 text-info" />
            <div>
              <strong>傭金：</strong> {info.commission}
            </div>
          </div>

          <div className="d-flex align-items-center">
            <FaMoneyBillWave className="me-3 fs-4 text-danger" />
            <div>
              <strong>賒帳金額：</strong> NT$ {info.arrears.toLocaleString()}
            </div>
          </div>
        </div>
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          關閉
        </Button>
      </Modal.Footer>
    </Modal>
  );
}