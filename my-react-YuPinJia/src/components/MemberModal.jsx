import { useState, useEffect } from "react";
import { Modal, Button, Form, ListGroup, Spinner } from "react-bootstrap";
import axios from "axios";

export default function MemberModal({ show, onHide, onSelect }) {
  const [input, setInput] = useState(""); // 用戶輸入
  const [members, setMembers] = useState([]); // 所有會員資料
  const [suggestions, setSuggestions] = useState([]); // 搜尋建議
  const [selected, setSelected] = useState(null); // 當前選擇的會員
  const [loading, setLoading] = useState(false); // 載入狀態

  // 載入會員資料
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
    setSelected(null); // 清空已選擇會員

    if (keyword.length === 0) {
      setSuggestions([]); // 當輸入為空時清空建議
      return;
    }

    const lower = keyword.toLowerCase();
    const filtered = members.filter(
      (m) =>
        m.contactPhone?.toLowerCase().includes(lower) ||
        m.fullName?.toLowerCase().includes(lower)
    );
    setSuggestions(filtered.slice(0, 10)); // 限制顯示最多 10 條建議
  };

  const handleSelect = (member) => {
    setInput(`${member.fullName} (${member.contactPhone})`);
    setSelected(member);
    setSuggestions([]); // 清空建議列表
  };

  const handleSubmit = () => {
    if (!selected) {
      alert("請先選取會員");
      return;
    }

    const normalized = {
      ...selected,
      type: selected.isDistributor ? "VIP" : "一般",
      level: `LV${selected.memberLevel ?? 0}`,
      discountRate: selected.isDistributor ? 0.9 : 1,
      subType: selected.isDistributor ? "廠商" : "",
    };

    onSelect(normalized);
    setInput(""); // 清空輸入框
    setSelected(null); // 清空選擇
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
        <Button variant="primary" onClick={handleSubmit} disabled={!selected}>
          確認
        </Button>
      </Modal.Footer>
    </Modal>
  );
}