// MemberModal.jsx
import { useEffect, useRef, useState, useMemo } from "react";
import {
  Modal,
  Button,
  Form,
  ListGroup,
  Spinner,
  Row,
  Col,
} from "react-bootstrap";
import axios from "axios";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";
const MAX_SUGGESTIONS = 10;

const MEMBER_TYPES = [
  { label: "全部", value: "" }, // 不帶參數
  { label: "一般", value: 0 }, // 0=一般
  { label: "導遊", value: 1 }, // 1=導遊
  { label: "廠商", value: 2 }, // 2=廠商
];

export default function MemberModal({ show, onHide, onSelect }) {
  const [input, setInput] = useState("");
  const [memberType, setMemberType] = useState(""); // "", 0, 1, 2
  const [suggestions, setSuggestions] = useState([]);
  const [selected, setSelected] = useState(null);
  const [loading, setLoading] = useState(false);

  const abortRef = useRef(null);
  const debounceRef = useRef(null);

  // 關閉時重置
  useEffect(() => {
    if (!show) {
      setInput("");
      setSuggestions([]);
      setSelected(null);
      setLoading(false);
      setMemberType("");
    }
  }, [show]);

  // 是否像電話（純數字且長度>=2）
  const looksLikePhone = useMemo(() => /^\d{2,}$/.test(input.trim()), [input]);
  // 是否像會員編號（含字母或以 MB 等字母開頭）
  const looksLikeMemberNo = useMemo(
    () => /^[A-Za-z].*|.*[A-Za-z].*/.test(input.trim()),
    [input]
  );

  // 後端查會員（支援同時以 memberNo、contactPhone 各打一輪，再合併）
  async function searchMembersBackend(keyword, typeValue, signal) {
    const paramsCommon = {};
    if (typeValue !== "" && typeValue !== null && typeValue !== undefined) {
      paramsCommon.memberType = typeValue; // 0/1/2
    }

    // 決定要打哪些請求
    const tasks = [];
    const kw = keyword.trim();

    if (kw.length < 2) return [];

    // 如果像電話
    if (looksLikePhone) {
      tasks.push(
        axios.get(`${API_BASE}/t_Member`, {
          params: { ...paramsCommon, contactPhone: kw },
          signal,
        })
      );
    }

    // 如果像會員編號（或不是純數字，就也嘗試 memberNo 查）
    if (looksLikeMemberNo || !looksLikePhone) {
      tasks.push(
        axios.get(`${API_BASE}/t_Member`, {
          params: { ...paramsCommon, fullName: kw },
          signal,
        })
      );
    }

    // 若兩者都沒被命中（極端情況），保險同時各打一個
    if (tasks.length === 0) {
      tasks.push(
        axios.get(`${API_BASE}/t_Member`, {
          params: { ...paramsCommon, contactPhone: kw },
          signal,
        })
      );
      tasks.push(
        axios.get(`${API_BASE}/t_Member`, {
          params: { ...paramsCommon, fullName: kw },
          signal,
        })
      );
    }

    const settled = await Promise.allSettled(tasks);
    const list = [];
    for (const r of settled) {
      if (r.status === "fulfilled") {
        const d = r.value?.data;
        if (Array.isArray(d)) list.push(...d);
        else if (d && typeof d === "object") list.push(d);
      }
    }

    // 去重（以 id 或 memberId 去重）
    const map = new Map();
    for (const m of list) {
      const k = m?.id ?? m?.memberId ?? JSON.stringify(m);
      if (!map.has(k)) map.set(k, m);
    }
    return Array.from(map.values());
  }

  // 依輸入字串做搜尋（debounce + 取消上一請求）
  useEffect(() => {
    if (!show) return;

    const kw = input.trim();

    if (kw.length < 2) {
      setSuggestions([]);
      return;
    }

    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(async () => {
      abortRef.current?.abort?.();
      abortRef.current = new AbortController();

      try {
        setLoading(true);
        const rows = await searchMembersBackend(
          kw,
          memberType,
          abortRef.current.signal
        );
        setSuggestions(rows.slice(0, MAX_SUGGESTIONS));
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          console.error("查詢會員失敗", err);
        }
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, input, memberType]);

  function handleSelectRow(m) {
    setSelected(m);
    setInput(
      `${m.fullName ?? m.name ?? ""} (${
        m.contactPhone ?? m.phone ?? m.mobile ?? ""
      })`
    );
    setSuggestions([]);
  }

  async function fetchDistributorByMemberId(memberId) {
    try {
      const { data } = await axios.get(`${API_BASE}/t_Distributor`, {
        params: { memberId },
      });
      if (Array.isArray(data))
        return data.find((d) => d.memberId === memberId) || null;
      return data?.memberId === memberId ? data : null;
    } catch (e) {
      return null;
    }
  }

  function normalizeMember(base, dist) {
    const id = base?.id ?? base?.memberId;
    const buyerType = dist?.buyerType ?? null; // 1=導遊, 2=廠商
    const isDistributor = !!dist;

    const subType =
      buyerType === 1
        ? "導遊"
        : buyerType === 2
        ? "廠商"
        : base?.memberType === 1
        ? "導遊"
        : base?.memberType === 2
        ? "廠商"
        : base?.memberType === 0
        ? "一般"
        : "";

    const discountRate = isDistributor
      ? Number(dist?.discountRate ?? 1)
      : Number(base?.discountRate ?? 1);

    // ⚠ 你說後端點數欄位用 cashbackPoint（若有就優先）
    const point = Number(
      base?.cashbackPoint ?? base?.rewardPoints ?? base?.points ?? 0
    );

    return {
      ...base,
      id,
      memberId: id,
      fullName: base?.fullName ?? base?.name ?? "未命名會員",
      contactPhone: base?.contactPhone ?? base?.phone ?? base?.mobile ?? "",
      memberLevel: base?.memberLevel ?? 0,

      cashbackPoint: point,
      rewardPoints: point, // 相容舊程式

      isDistributor,
      buyerType,
      subType,
      discountRate: Number(discountRate || 1),

      type: isDistributor ? "VIP" : subType || "一般",
      level: `LV${base?.memberLevel ?? 0}`,
    };
  }

  async function handleSubmit() {
    if (!selected) {
      alert("請先選取會員");
      return;
    }
    const memberId = selected?.id ?? selected?.memberId;
    const dist = await fetchDistributorByMemberId(memberId);
    const normalized = normalizeMember(selected, dist);

    onHide(); // 先關
    setTimeout(() => {
      // 等背板收掉再回傳
      onSelect(normalized);
      setSelected(null);
      setInput("");
    }, 150);
  }

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>切換會員</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        <Row className="g-2 align-items-center">
          <Col>
            <Form.Control
              autoFocus
              placeholder="輸入手機或會員編號（至少 2 個字）"
              value={input}
              onChange={(e) => {
                setSelected(null);
                setInput(e.target.value);
              }}
              disabled={loading}
            />
          </Col>
          <Col xs="auto">
            <Form.Select
              value={memberType}
              onChange={(e) =>
                setMemberType(
                  e.target.value === "" ? "" : Number(e.target.value)
                )
              }
              disabled={loading}
            >
              {MEMBER_TYPES.map((t) => (
                <option key={String(t.value)} value={t.value}>
                  {t.label}
                </option>
              ))}
            </Form.Select>
          </Col>
        </Row>

        {loading && (
          <div className="text-center mt-2">
            <Spinner animation="border" size="sm" />
          </div>
        )}

        {suggestions.length > 0 && (
          <ListGroup
            className="mt-2"
            style={{ maxHeight: 240, overflowY: "auto" }}
          >
            {suggestions.map((m) => (
              <ListGroup.Item
                key={m.id ?? m.memberId}
                action
                active={
                  (selected?.id ?? selected?.memberId) === (m.id ?? m.memberId)
                }
                onClick={() => handleSelectRow(m)}
              >
                {(m.fullName ?? m.name) || "未命名"}（
                {m.contactPhone ?? m.phone ?? m.mobile ?? "無電話"}）
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
