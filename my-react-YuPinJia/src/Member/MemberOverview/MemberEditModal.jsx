import { Modal, Button, Form, Tab, Nav, Row, Col } from "react-bootstrap";
import { useState } from "react";
import { FaSave, FaTimes } from "react-icons/fa";
import "./MemberEditModal.css"; // 可自訂美化樣式

export default function MemberEditModal({ show, onHide, member }) {
  const [memberInfo, setMemberInfo] = useState(() => ({
  ...member,
  distributorInfo: member?.distributorInfo || {
    company: "",
    phone: "",
    contact: "",
    taxId: "",
    bankCode: "",
    bankName: "",
    bankAccount: "",
    allowSMS: false,
    smsTime: "",
  },
}));
  const [activeTab, setActiveTab] = useState("basic");

  const handleChange = (field, value) => {
    setMemberInfo((prev) => ({ ...prev, [field]: value }));
  };

  const handleDistributorChange = (field, value) => {
    setMemberInfo((prev) => ({
      ...prev,
      distributorInfo: {
        ...prev.distributorInfo,
        [field]: value,
      },
    }));
  };

  const handleSave = () => {
    console.log("儲存資料：", memberInfo);
    onHide();
  };

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>編輯會員資料</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
          <Nav variant="tabs">
            <Nav.Item>
              <Nav.Link eventKey="basic">基本資料</Nav.Link>
            </Nav.Item>
            <Nav.Item>
              <Nav.Link eventKey="distributor">經銷資料</Nav.Link>
            </Nav.Item>
          </Nav>
          <Tab.Content className="pt-4">
            <Tab.Pane eventKey="basic">
              <div className="section-box">
                <Form>
                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>姓名</Form.Label>
                        <Form.Control
                          type="text"
                          value={memberInfo.member || ""}
                          onChange={(e) => handleChange("member", e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>聯絡電話</Form.Label>
                        <Form.Control
                          type="text"
                          value={memberInfo.phone || ""}
                          onChange={(e) => handleChange("phone", e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                  </Row>

                  <Row>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>生日</Form.Label>
                        <Form.Control
                          type="date"
                          value={memberInfo.birthday || ""}
                          onChange={(e) => handleChange("birthday", e.target.value)}
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>性別</Form.Label>
                        <Form.Select
                          value={memberInfo.gender || ""}
                          onChange={(e) => handleChange("gender", e.target.value)}
                        >
                          <option value="">請選擇</option>
                          <option value="male">男</option>
                          <option value="female">女</option>
                          <option value="other">其他</option>
                        </Form.Select>
                      </Form.Group>
                    </Col>
                  </Row>

                  <Form.Group className="mb-3">
                    <Form.Label>電子郵件</Form.Label>
                    <Form.Control
                      type="email"
                      value={memberInfo.email || ""}
                      onChange={(e) => handleChange("email", e.target.value)}
                    />
                  </Form.Group>

                  <Form.Group className="mb-3">
                    <Form.Label>地址</Form.Label>
                    <Form.Control
                      type="text"
                      value={memberInfo.address || ""}
                      onChange={(e) => handleChange("address", e.target.value)}
                    />
                  </Form.Group>
                </Form>
              </div>
            </Tab.Pane>

            <Tab.Pane eventKey="distributor">
  <div className="section-box">
    <Form>
      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>公司名稱</Form.Label>
            <Form.Control
              type="text"
              value={memberInfo.distributorInfo.company || ""}
              onChange={(e) =>
                handleDistributorChange("company", e.target.value)
              }
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>聯絡電話</Form.Label>
            <Form.Control
              type="text"
              value={memberInfo.distributorInfo.phone || ""}
              onChange={(e) =>
                handleDistributorChange("phone", e.target.value)
              }
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>聯絡人</Form.Label>
            <Form.Control
              type="text"
              value={memberInfo.distributorInfo.contact || ""}
              onChange={(e) =>
                handleDistributorChange("contact", e.target.value)
              }
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>統一編號</Form.Label>
            <Form.Control
              type="text"
              value={memberInfo.distributorInfo.taxId || ""}
              onChange={(e) =>
                handleDistributorChange("taxId", e.target.value)
              }
            />
          </Form.Group>
        </Col>
      </Row>

      <Row>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>銀行代碼</Form.Label>
            <Form.Control
              type="text"
              value={memberInfo.distributorInfo.bankCode || ""}
              onChange={(e) =>
                handleDistributorChange("bankCode", e.target.value)
              }
            />
          </Form.Group>
        </Col>
        <Col md={6}>
          <Form.Group className="mb-3">
            <Form.Label>銀行名稱</Form.Label>
            <Form.Control
              type="text"
              value={memberInfo.distributorInfo.bankName || ""}
              onChange={(e) =>
                handleDistributorChange("bankName", e.target.value)
              }
            />
          </Form.Group>
        </Col>
      </Row>

      <Form.Group className="mb-3">
        <Form.Label>銀行帳號</Form.Label>
        <Form.Control
          type="text"
          value={memberInfo.distributorInfo.bankAccount || ""}
          onChange={(e) =>
            handleDistributorChange("bankAccount", e.target.value)
          }
        />
      </Form.Group>

      {/* ✅ 簡訊選擇（與 checkbox 同行） */}
      <Form.Group className="mb-3 d-flex align-items-center gap-3">
        <Form.Check
          type="checkbox"
          label="允許發送簡訊"
          checked={memberInfo.distributorInfo.allowSMS || false}
          onChange={(e) =>
            handleDistributorChange("allowSMS", e.target.checked)
          }
        />
        {memberInfo.distributorInfo.allowSMS && (
          <Form.Select
            style={{ maxWidth: "160px" }}
            value={memberInfo.distributorInfo.smsTime || ""}
            onChange={(e) =>
              handleDistributorChange("smsTime", e.target.value)
            }
          >
            <option value="">選擇時間</option>
            <option value="09:00">09:00</option>
            <option value="12:00">12:00</option>
            <option value="18:00">18:00</option>
          </Form.Select>
        )}
      </Form.Group>
    </Form>
  </div>
</Tab.Pane>
          </Tab.Content>
        </Tab.Container>
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onHide}>
          <FaTimes className="me-1" /> 取消
        </Button>
        <Button variant="primary" onClick={handleSave}>
          <FaSave className="me-1" /> 儲存
        </Button>
      </Modal.Footer>
    </Modal>
  );
}
