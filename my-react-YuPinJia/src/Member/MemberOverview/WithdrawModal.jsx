// WithdrawModal.jsx
import { Modal, Button, Form, Row, Col } from "react-bootstrap";
import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import Swal from "sweetalert2";

/**
 * 提現 Modal
 * props:
 * - show: boolean
 * - onHide: function
 * - member: 會員完整物件（需含 id、rewardPoints 或 cashbackPoint、accountBalance）
 * - onSuccess(updatedMember): 回傳更新後會員物件給父層更新表格
 */
const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";
// 動態讀取最新 Token（避免頁面載入時拿到舊值）
function getHeaders() {
  const authToken =
    localStorage.getItem("authToken") ||
    localStorage.getItem("token") ||
    localStorage.getItem("access_token");
  return {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
  };
}

export default function WithdrawModal({ show, onHide, member, onSuccess }) {
  const currentPoints = useMemo(
    () => Number(member?.rewardPoints ?? member?.cashbackPoint ?? 0),
    [member]
  );
  const currentBalance = useMemo(
    () => Number(member?.accountBalance ?? 0),
    [member]
  );

  const [withdrawPoints, setWithdrawPoints] = useState(0); // 提現點數（整數）
  const [withdrawCash, setWithdrawCash] = useState(0); // 提現金額（NTD）
  const method = "現金"; // 固定現金
  const [note, setNote] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (show) {
      setWithdrawPoints(0);
      setWithdrawCash(0);
      setNote("");
    }
  }, [show]);

  const valid = useMemo(() => {
    // 至少要有一項 > 0
    const wP = Number(withdrawPoints) || 0;
    const wC = Number(withdrawCash) || 0;
    if (wP <= 0 && wC <= 0) return false;

    // 點數需整數且不可超過
    if (!Number.isInteger(wP)) return false;
    if (wP < 0 || wP > currentPoints) return false;

    // 現金不可超過
    if (wC < 0 || wC > currentBalance) return false;

    return true;
  }, [withdrawPoints, withdrawCash, currentPoints, currentBalance]);

  const fetchMember = async (id) => {
    try {
      const res = await axios.get(`${API_BASE}/t_Member/${id}`, {
        headers: getHeaders(),
      });
      return res.data;
    } catch {
      return null;
    }
  };

  const handleSubmit = async () => {
    if (!member?.id) return;

    if (!valid) {
      Swal.fire(
        "提醒",
        "請確認輸入金額/點數是否正確，且不得超過可提金額。",
        "warning"
      );
      return;
    }

    // 轉成安全數字（點數為整數，金額到兩位小數）
    const wP = Math.trunc(Number(withdrawPoints) || 0); // 提現點數
    const wC = Math.round((Number(withdrawCash) || 0) * 100) / 100; // 提現金額（NTD）

    // ✅ 正確的提現 payload（不是整個 member）
    const payload = {
      memberId: Number(member.id),
      cashbackPoint: wP,
      accountBalance: wC,
      remark: (note || "").trim(),
    };

    try {
      setSubmitting(true);

      // 直接呼叫唯一的後端 API：PUT /MemberWithdrawal/{id}
      await axios.put(
        `${API_BASE}/t_Member/MemberWithdrawal/${member.id}`,
        payload,
        { headers: getHeaders() }
      );

      // 成功後重新抓會員，更新父層表格（若抓失敗就用前端推算的值先顯示）
      const updated = (await fetchMember(member.id)) ?? {
        ...member,
        rewardPoints:
          Number(member.rewardPoints ?? member.cashbackPoint ?? 0) - wP,
        cashbackPoint:
          Number(member.rewardPoints ?? member.cashbackPoint ?? 0) - wP,
        accountBalance:
          Math.round((Number(member.accountBalance ?? 0) - wC) * 100) / 100,
      };

      await Swal.fire("成功", "提現作業完成", "success");
      await onSuccess?.(updated); // 等父層重抓主表完成
      onHide?.();
    } catch (err) {
      console.error("提現失敗：", err?.response?.data || err);
      const msg =
        err?.response?.data?.title ||
        err?.response?.data?.message ||
        `HTTP ${err?.response?.status ?? ""}`;
      Swal.fire("錯誤", `提現失敗：${msg}`, "error");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <style>{`
        Form .row > * { padding-left: .75rem; padding-right: .75rem; }
      `}</style>
      <Modal show={show} onHide={onHide} centered>
        <Modal.Header closeButton>
          <Modal.Title>提現</Modal.Title>
        </Modal.Header>

        <Modal.Body>
          <div className="mb-3">
            <div>
              <strong>會員：</strong>
              {member?.fullName ?? "-"}（{member?.memberNo ?? "—"}）
            </div>
            <div className="mt-1">
              <span className="me-3">
                <strong>可提點數：</strong>
                {currentPoints}
              </span>
              <span>
                <strong>可提餘額：</strong>
                {currentBalance}
              </span>
            </div>
          </div>

          <Form>
            <Row className="g-3">
              <Col md={6}>
                <Form.Label className="fw-bold">提現點數</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  step={1}
                  value={withdrawPoints}
                  onChange={(e) => setWithdrawPoints(Number(e.target.value))}
                />
                <div className="form-text">
                  不得超過 {currentPoints}；需為整數。
                </div>
              </Col>

              <Col md={6}>
                <Form.Label className="fw-bold">提現金額（NTD）</Form.Label>
                <Form.Control
                  type="number"
                  min={0}
                  step="0.01"
                  value={withdrawCash}
                  onChange={(e) => setWithdrawCash(Number(e.target.value))}
                />
                <div className="form-text">不得超過 {currentBalance}。</div>
              </Col>

              <Col md={6}>
                <Form.Label className="fw-bold">提現方式</Form.Label>
                <div className="form-control-plaintext fw-bold">現金</div>
              </Col>

              <Col md={12}>
                <Form.Label className="fw-bold">備註</Form.Label>
                <Form.Control
                  as="textarea"
                  rows={3}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="可填寫轉帳帳號、操作員等資訊（會寫到 remark）"
                />
              </Col>
            </Row>
          </Form>
        </Modal.Body>

        <Modal.Footer>
          <Button variant="secondary" onClick={onHide} disabled={submitting}>
            取消
          </Button>
          <Button
            variant="primary"
            onClick={handleSubmit}
            disabled={!valid || submitting}
            // 若你想自訂顏色（覆蓋樣式）↓↓
            style={{ background: "#E02900", borderColor: "#E02900" }}
          >
            {submitting ? "處理中…" : "確認提現"}
          </Button>
        </Modal.Footer>
      </Modal>
    </>
  );
}
