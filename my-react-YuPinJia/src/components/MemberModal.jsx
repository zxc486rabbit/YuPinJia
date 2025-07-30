import { useState, useEffect } from "react";
import { Modal, Button, Form, ListGroup, Spinner } from "react-bootstrap";
import axios from "axios";

export default function MemberModal({ show, onHide, onSelect }) {
  const [input, setInput] = useState("");
  const [members, setMembers] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!show) return;
    setLoading(true);
    axios
      .get("https://yupinjia.hyjr.com.tw/api/api/t_Member")
      .then((res) => setMembers(res.data))
      .catch((err) => {
        alert("無法載入會員資料");
        console.error(err);
      })
      .finally(() => setLoading(false));
  }, [show]);

  const handleInputChange = (e) => {
    const keyword = e.target.value.trim();
    setInput(keyword);
    setSelected(null);

    if (keyword.length === 0) {
      setSuggestions([]);
      return;
    }

    const lower = keyword.toLowerCase();
    const filtered = members.filter(
      (m) =>
        m.contactPhone?.toLowerCase().includes(lower) ||
        m.fullName?.toLowerCase().includes(lower)
    );
    setSuggestions(filtered.slice(0, 10));
  };

  const handleSelect = (member) => {
    setInput(`${member.fullName} (${member.contactPhone})`);
    setSelected(member);
    setSuggestions([]);
  };

  const handleSubmit = () => {
    if (!selected) {
      alert("請先選取會員");
      return;
    }

    const normalized = {
      ...selected, // ✅ 保留所有 API 欄位
      type: selected.isDistributor ? "VIP" : "一般",
      level: `LV${selected.memberLevel ?? 0}`,
      discountRate: selected.isDistributor ? 0.9 : 1,
      subType: selected.isDistributor ? "廠商" : "",
    };

    onSelect(normalized);
    setInput("");
    setSelected(null);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>切換會員</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Form.Control
          placeholder="輸入手機號碼或姓名"
          value={input}
          onChange={handleInputChange}
          disabled={loading}
        />
        {loading && (
          <div className="text-center mt-2">
            <Spinner animation="border" size="sm" />
          </div>
        )}
        {suggestions.length > 0 && (
          <ListGroup className="mt-2" style={{ maxHeight: "200px", overflowY: "auto" }}>
            {suggestions.map((m) => (
              <ListGroup.Item
                key={m.id}
                action
                active={selected?.id === m.id}
                onClick={() => handleSelect(m)}
              >
                {m.fullName} ({m.contactPhone})
              </ListGroup.Item>
            ))}
          </ListGroup>
        )}
      </Modal.Body>
      <Modal.Footer>
        <Button variant="secondary" onClick={onHide}>
          取消
        </Button>
        <Button variant="primary" onClick={handleSubmit}>
          確認
        </Button>
      </Modal.Footer>
    </Modal>
  );
}