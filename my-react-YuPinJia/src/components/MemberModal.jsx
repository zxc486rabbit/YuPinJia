import { useState } from "react";
import { Modal, Button, Form } from "react-bootstrap";

export default function MemberModal({ show, onHide, members, onSelect }) {
  const [input, setInput] = useState("");

  const submit = () => {
    const keyword = input.trim();
    const found = members.find(
      (m) => m.account === keyword || m.phone === keyword
    );
    if (found) {
      onSelect(found);
      setInput("");
      onHide();
    } else {
      alert("查無此會員帳號 / 手機");
    }
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>切換會員</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          placeholder="輸入帳號或手機號碼"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && submit()}
        />
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          取消
        </Button>
        <Button variant="primary" onClick={submit}>
          確認
        </Button>
      </Modal.Footer>
    </Modal>
  );
}