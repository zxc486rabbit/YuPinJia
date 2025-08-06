import { Modal, Button, Form, Tab, Nav, Col, Spinner } from "react-bootstrap";
import { useState, useEffect } from "react";
import Swal from "sweetalert2";
import { FaSave, FaTimes } from "react-icons/fa";
import axios from "axios";
import "./MemberEditModal.css";

export default function MemberEditModal({ show, onHide, member, onSave }) {
  const [memberInfo, setMemberInfo] = useState(null); // 初始為 null
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("basic");

  // 在 Modal 開啟時抓資料
  useEffect(() => {
    if (show && member?.id) {
      setLoading(true);

      // 抓會員詳細資料
      axios
        .get(`https://yupinjia.hyjr.com.tw/api/api/t_Member/${member.id}`)
        .then(async (res) => {
          let memberData = res.data;

           console.log("取得會員詳細資料：", memberData);
    console.log("會員類型（memberType）：", memberData.memberType); // 印出 memberType

          // 處理生日格式
          if (memberData.birthday) {
            memberData.birthday = memberData.birthday.split("T")[0];
          }

          let distributorInfo = {
            company: "",
            phone: "",
            contact: "",
            taxId: "",
            bankCode: "",
            bankName: "",
            bankAccount: "",
            allowSMS: false,
            smsTime: "",
          };

          // 如果是導遊或廠商 → 抓經銷資料
if (memberData.memberType === 1 || memberData.memberType === 2) {
  try {
    const distRes = await axios.get(
      `https://yupinjia.hyjr.com.tw/api/api/t_Distributor/${member.id}`
    );
    const distData = distRes.data;

    distributorInfo = {
      id: distData.id || null, // 這裡加上 ID
      company: distData.companyName || "",
      phone: distData.contactPhone || "",
      contact: distData.contactPerson || "",
      taxId: distData.taxID || "",
      bankCode: "",
      bankName: distData.bankName || "",
      bankAccount: distData.bankAccount || "",
      allowSMS: distData.allowSMS || false,
      smsTime: "",
      allowCredit: distData.allowCredit || false,
      autoUpgrade: distData.autoUpgrade || false,
      issueInvoice: distData.issueInvoice || false,
      freeShipping: distData.freeShipping || false,
      notificationDay: distData.notificationDay || 0,
      repaymentDay: distData.repaymentDay || 0,
      paymentMethod: distData.paymentMethod || "",
      store: distData.store || ""
    };
  } catch (err) {
    console.error("載入經銷資料失敗", err);
  }
}

          setMemberInfo({
            ...memberData,
            distributorInfo,
          });
        })
        .catch((err) => {
          console.error("載入會員詳細資料失敗", err);
          Swal.fire("錯誤", "載入會員詳細資料失敗", "error");
        })
        .finally(() => setLoading(false));
    }
  }, [show, member]);

  // 更新基本資料
  const handleChange = (field, value) => {
    setMemberInfo((prev) => ({ ...prev, [field]: value }));
  };

  // 更新經銷資料
  const handleDistributorChange = (field, value) => {
    setMemberInfo((prev) => ({
      ...prev,
      distributorInfo: {
        ...prev.distributorInfo,
        [field]: value,
      },
    }));
  };

  // 儲存資料
  const handleSave = async () => {
  if (!memberInfo) return;

  try {
    // 1. 更新會員資料
    const t_Member = {
      id: memberInfo.id,
      fullName: memberInfo.fullName || "",
      birthday: memberInfo.birthday || null,
      email: memberInfo.email || "",
      contactPhone: memberInfo.contactPhone || "",
      carrier: memberInfo.carrier || "",
      contactAddress: memberInfo.contactAddress || "",
      referredBy: memberInfo.referredBy || "",
      memberType: memberInfo.memberType,
      status: memberInfo.status ? 1 : 0
    };

    await axios.put(
      `https://yupinjia.hyjr.com.tw/api/api/t_Member/${memberInfo.id}`,
      t_Member
    );

    // 2. 如果是導遊或廠商 → 更新經銷商資料
    if (memberInfo.memberType === 1 || memberInfo.memberType === 2) {
      const t_Distributor = {
        store: memberInfo.distributorInfo.store || "馬公門市",
        buyerType: memberInfo.memberType,
        allowCredit: memberInfo.distributorInfo.allowCredit ? 1 : 0,
        autoUpgrade: memberInfo.distributorInfo.autoUpgrade ? 1 : 0,
        issueInvoice: memberInfo.distributorInfo.issueInvoice ? 1 : 0,
        freeShipping: memberInfo.distributorInfo.freeShipping ? 1 : 0,
        notificationDay: Number(memberInfo.distributorInfo.notificationDay) || 0,
        repaymentDay: Number(memberInfo.distributorInfo.repaymentDay) || 0,
        allowSMS: memberInfo.distributorInfo.allowSMS ? 1 : 0,
        paymentMethod: memberInfo.distributorInfo.paymentMethod || "現金付款",
        companyName: memberInfo.distributorInfo.company || "",
        contactPerson: memberInfo.distributorInfo.contact || "",
        contactPhone: memberInfo.distributorInfo.phone || "",
        taxID: memberInfo.distributorInfo.taxId || "",
        bankName: memberInfo.distributorInfo.bankName || "",
        bankAccount: memberInfo.distributorInfo.bankAccount || "",
        status: 1
      };

      // 這裡用經銷商 ID 來更新
      await axios.put(
        `https://yupinjia.hyjr.com.tw/api/api/t_Distributor/${memberInfo.distributorInfo.id}`,
        t_Distributor
      );
    }

    Swal.fire({ icon: "success", title: "成功", text: "會員資料已成功更新！" });
    onHide();
    onSave(memberInfo);

  } catch (err) {
    console.error("更新會員或經銷商資料錯誤", err);
    Swal.fire({ icon: "error", title: "錯誤", text: "更新資料時發生錯誤，請稍後再試！" });
  }
};

  return (
    <Modal show={show} onHide={onHide} centered size="lg">
      <Modal.Header closeButton>
        <Modal.Title>編輯會員資料</Modal.Title>
      </Modal.Header>
      <Modal.Body>
        {loading || !memberInfo ? (
          <div className="text-center p-4">
            <Spinner animation="border" variant="primary" />
            <div className="mt-2">載入中...</div>
          </div>
        ) : (
          <Tab.Container activeKey={activeTab} onSelect={setActiveTab}>
            <Nav variant="tabs">
              <Nav.Item>
                <Nav.Link eventKey="basic">基本資料</Nav.Link>
              </Nav.Item>
              {(memberInfo.memberType === 1 || memberInfo.memberType === 2) && (
                <Nav.Item>
                  <Nav.Link eventKey="distributor">經銷資料</Nav.Link>
                </Nav.Item>
              )}
            </Nav>

            <Tab.Content className="pt-4">
              {/* 基本資料 */}
              <Tab.Pane eventKey="basic">
                <Form>
                  <div className="d-flex">
                    <Col md={6}>
                      <Form.Group className="mb-3 me-3">
                        <Form.Label>姓名</Form.Label>
                        <Form.Control
                          type="text"
                          value={memberInfo.fullName || ""}
                          onChange={(e) =>
                            handleChange("fullName", e.target.value)
                          }
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>聯絡電話</Form.Label>
                        <Form.Control
                          type="text"
                          value={memberInfo.contactPhone || ""}
                          onChange={(e) =>
                            handleChange("contactPhone", e.target.value)
                          }
                        />
                      </Form.Group>
                    </Col>
                  </div>

                  <div className="d-flex">
                    <Col md={6}>
                      <Form.Group className="mb-3 me-3">
                        <Form.Label>生日</Form.Label>
                        <Form.Control
                          type="date"
                          value={memberInfo.birthday || ""}
                          onChange={(e) =>
                            handleChange("birthday", e.target.value)
                          }
                        />
                      </Form.Group>
                    </Col>
                    <Col md={6}>
                      <Form.Group className="mb-3">
                        <Form.Label>載具</Form.Label>
                        <Form.Control
                          type="text"
                          value={memberInfo.carrier || ""}
                          onChange={(e) =>
                            handleChange("carrier", e.target.value)
                          }
                        />
                      </Form.Group>
                    </Col>
                  </div>

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
                      value={memberInfo.contactAddress || ""}
                      onChange={(e) =>
                        handleChange("contactAddress", e.target.value)
                      }
                    />
                  </Form.Group>
                </Form>
              </Tab.Pane>

              {/* 經銷資料 */}
              {(memberInfo.memberType === 1 || memberInfo.memberType === 2) && (
                <Tab.Pane eventKey="distributor">
                  <Form>
                    <div className="d-flex">
                      <Col md={6}>
                        <Form.Group className="mb-3 me-3">
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
                    </div>

                    <div className="d-flex">
                      <Col md={6}>
                        <Form.Group className="mb-3 me-3">
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
                    </div>

                    <div className="d-flex">
                      <Col md={6}>
                        <Form.Group className="mb-3 me-3">
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
                    </div>

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
                </Tab.Pane>
              )}
            </Tab.Content>
          </Tab.Container>
        )}
      </Modal.Body>
      <Modal.Footer className="d-flex justify-content-end gap-2">
        <Button variant="secondary" onClick={onHide}>
          <FaTimes className="me-1" /> 取消
        </Button>
        <Button variant="primary" onClick={handleSave} disabled={!memberInfo}>
          <FaSave className="me-1" /> 儲存
        </Button>
      </Modal.Footer>
    </Modal>
  );
}