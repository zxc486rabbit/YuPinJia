// MemberModal.jsx
import { useEffect, useRef, useState, useCallback } from "react";
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
const PAGE_SIZE = 20; // 無限卷軸每次抓取筆數

// 兼容舊/新回傳格式：取 items 與 total/offset/limit（若沒有分頁欄位也能運作）
function extractMembersAndPageMeta(data) {
  if (!data) return { items: [], total: null, offset: 0, limit: 0 };

  if (Array.isArray(data)) {
    const items = data.filter((x) => x && typeof x === "object");
    // total=null 代表後端沒給，之後用「本次拿到的數量 < PAGE_SIZE」推斷 hasMore
    return { items, total: null, offset: 0, limit: items.length };
  }

  const rawItems = Array.isArray(data.items) ? data.items.flat(Infinity) : [];
  const items = rawItems.filter((x) => x && typeof x === "object");
  const total =
    Number.isFinite(Number(data.total)) ? Number(data.total) : null;
  const offset =
    Number.isFinite(Number(data.offset)) ? Number(data.offset) : 0;
  const limit =
    Number.isFinite(Number(data.limit)) ? Number(data.limit) : items.length;

  return { items, total, offset, limit };
}

// 轉一維陣列去重（以 id 或 memberId）
function dedupeById(arr) {
  const map = new Map();
  for (const m of arr) {
    const k = m?.id ?? m?.memberId ?? JSON.stringify(m);
    if (!map.has(k)) map.set(k, m);
  }
  return Array.from(map.values());
}

export default function MemberModal({ show, onHide, onSelect, onLogout  }) {
  // 查詢條件
  const [nameInput, setNameInput] = useState("");   // fullName
  const [phoneInput, setPhoneInput] = useState(""); // contactPhone
  const [memberType, setMemberType] = useState(""); // "", 0, 1, 2

  // 列表與載入狀態
  const [items, setItems] = useState([]);     // 累積結果
  const [selected, setSelected] = useState(null);

  // 分批抓取控制
  const [loading, setLoading] = useState(false);
  const [hasMore, setHasMore] = useState(false); // 是否還有下一批
  const [page, setPage] = useState(0);           // 0-based
  const [total, setTotal] = useState(null);      // 若後端有 total 就顯示

  // 觀測器與 debounce 控制
  const observerRef = useRef(null);
  const sentinelRef = useRef(null);
  const debounceRef = useRef(null);
  const abortRef = useRef(null);

  // 關閉時重置
  useEffect(() => {
    if (!show) {
      setNameInput("");
      setPhoneInput("");
      setMemberType("");
      setItems([]);
      setSelected(null);
      setLoading(false);
      setHasMore(false);
      setTotal(null);
      setPage(0);
    }
  }, [show]);

  // 任一條件改變 → 重置並重新開啟第一次抓取（首批）
  useEffect(() => {
    if (!show) return;

    // debounce 條件輸入（姓名/電話）
    clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => {
      // 若完全無條件（姓名空、電話空、memberType 未選），清空並停止
      const shouldQuery =
        memberType !== "" ||
        nameInput.trim().length > 0 ||
        phoneInput.trim().length > 0;

      if (!shouldQuery) {
        // 清空
        abortRef.current?.abort?.();
        setItems([]);
        setSelected(null);
        setHasMore(false);
        setTotal(null);
        setPage(0);
        return;
      }

      // 重新開始：清空、從 page 0 起抓
      abortRef.current?.abort?.();
      setItems([]);
      setSelected(null);
      setHasMore(true); // 先假設有下一頁，實際抓完再決定
      setTotal(null);
      setPage(0);
      // 立刻拉首批
      loadPage(0, true);
    }, 250);

    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [show, nameInput, phoneInput, memberType]);

  // 實際打 API 抓某一頁（offset=page*PAGE_SIZE）
  const loadPage = useCallback(
    async (targetPage, isFirst = false) => {
      if (loading) return;
      // 如果不是第一次且已經判定沒有更多，就不再打
      if (!isFirst && !hasMore) return;

      const params = {
        offset: Math.max(0, targetPage * PAGE_SIZE),
        limit: PAGE_SIZE,
      };

      const nameKw = String(nameInput || "").trim();
      const phoneKw = String(phoneInput || "").trim();

      if (nameKw) params.fullName = nameKw;
      if (phoneKw) params.contactPhone = phoneKw;

      // 只選身份也要丟 API
      if (memberType !== "" && memberType !== null && memberType !== undefined) {
        params.memberType = memberType; // 0/1/2
      }

      // 完全無條件（理論上在上游已擋）
      if (!params.fullName && !params.contactPhone && params.memberType === undefined) {
        setHasMore(false);
        return;
      }

      abortRef.current?.abort?.();
      abortRef.current = new AbortController();

      try {
        setLoading(true);
        const { data } = await axios.get(`${API_BASE}/t_Member`, {
          params,
          signal: abortRef.current.signal,
        });

        const { items: newItemsRaw, total: apiTotal } = extractMembersAndPageMeta(data);
        const newItems = dedupeById(newItemsRaw);

        // 累加內容並去重
        setItems((prev) => dedupeById([...prev, ...newItems]));

        // 決定 hasMore：
        if (apiTotal !== null && Number.isFinite(apiTotal)) {
          // 後端有 total：依 total 與目前累計數量推斷
          const nextAccumulated = (prevCount => prevCount + newItems.length)(
            items.length
          );
          setTotal(apiTotal);
          setHasMore(nextAccumulated < apiTotal);
        } else {
          // 後端沒 total：用「本次拿到的數量 < PAGE_SIZE」推斷
          setTotal(null);
          setHasMore(newItems.length === PAGE_SIZE);
        }

        // 更新目前頁碼（只有當本次真的抓到資料才前進；若為首次載入也同理）
        setPage(targetPage);
      } catch (err) {
        if (err.name !== "CanceledError" && err.name !== "AbortError") {
          console.error("載入會員清單失敗", err);
        }
      } finally {
        setLoading(false);
      }
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [nameInput, phoneInput, memberType, hasMore, loading, items.length]
  );

  // IntersectionObserver：監看 sentinel 以自動載入下一批
  useEffect(() => {
    if (!show) return;

    // 清掉舊觀測器
    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    // 沒有 sentinel 或目前不該再載，就不設
    if (!sentinelRef.current) return;

    observerRef.current = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry || !entry.isIntersecting) return;

        // sentinel 出現於視窗中 → 嘗試載入下一頁
        if (!loading && hasMore) {
          // 下一頁索引
          const nextPage = page + 1;
          loadPage(nextPage);
        }
      },
      {
        root: null,
        rootMargin: "120px", // 預抓：還沒到底就先請求
        threshold: 0.01,
      }
    );

    observerRef.current.observe(sentinelRef.current);

    return () => {
      observerRef.current?.disconnect();
      observerRef.current = null;
    };
  }, [show, page, hasMore, loading, loadPage]);

  function handleSelectRow(m) {
    setSelected(m);
  }

  async function fetchDistributorByMemberId(memberId) {
    try {
      const { data } = await axios.get(`${API_BASE}/t_Distributor`, {
        params: { memberId },
      });
      if (Array.isArray(data))
        return data.find((d) => d.memberId === memberId) || null;
      return data?.memberId === memberId ? data : null;
    } catch {
      return null;
    }
  }

  function normalizeMember(base, dist) {
    const id = base?.id ?? base?.memberId;

    const buyerType =
      dist?.buyerType != null
        ? Number(dist.buyerType)
        : base?.memberType === "導遊"
        ? 1
        : base?.memberType === "經銷商" || base?.memberType === "廠商"
        ? 2
        : 0;

    const isDistributor = !!dist;

    const subType =
      buyerType === 1
        ? "導遊"
        : buyerType === 2
        ? "廠商"
        : base?.memberType === "導遊"
        ? "導遊"
        : base?.memberType === "經銷商" || base?.memberType === "廠商"
        ? "廠商"
        : base?.memberType === "一般會員"
        ? "一般"
        : "";

    const discountRate = isDistributor
      ? Number(dist?.discountRate ?? 1)
      : Number(base?.discountRate ?? 1);

    const point = Number(
      base?.cashbackPoint ?? base?.rewardPoints ?? base?.points ?? 0
    );

    const levelName = isDistributor
      ? dist?.levelName ?? dist?.LevelName ?? base?.levelName ?? base?.LevelName ?? ""
      : base?.levelName ?? base?.LevelName ?? base?.levelCode ?? base?.LevelCode ?? "";

    const levelCode = isDistributor
      ? dist?.levelCode ?? dist?.LevelCode ?? base?.levelCode ?? base?.LevelCode ?? ""
      : base?.levelCode ?? base?.LevelCode ?? base?.levelName ?? base?.LevelName ?? "";

    return {
      ...base,
      id,
      memberId: id,
      fullName: base?.fullName ?? base?.name ?? "未命名會員",
      contactPhone: base?.contactPhone ?? base?.phone ?? base?.mobile ?? "",
      memberLevel: base?.memberLevel ?? 0,

      cashbackPoint: point,
      rewardPoints: point,

      isDistributor,
      buyerType,
      subType,
      discountRate: Number(discountRate || 1),

      levelName,
      levelCode,

      type: isDistributor ? "VIP" : subType || "一般",
      level: `LV${base?.memberLevel ?? 0}`,
    };
  }

   // ✅ 登出會員：關閉 modal、清空內部狀態、回呼 onLogout
  const handleLogout = () => {
    onHide?.();
    setTimeout(() => {
      onLogout?.();
      // 清空內部 UI 狀態
      setSelected(null);
      setNameInput("");
      setPhoneInput("");
      setMemberType("");
      setItems([]);
      setHasMore(false);
      setTotal(null);
      setPage(0);
    }, 150);
  };

  async function handleSubmit() {
    if (!selected) {
      alert("請先選取會員");
      return;
    }
    const memberId = selected?.id ?? selected?.memberId;
    const dist = await fetchDistributorByMemberId(memberId);
    const normalized = normalizeMember(selected, dist);

    onHide();
    setTimeout(() => {
      onSelect(normalized);
      setSelected(null);
      setNameInput("");
      setPhoneInput("");
      setMemberType("");
      setItems([]);
      setHasMore(false);
      setTotal(null);
      setPage(0);
    }, 150);
  }

  const totalText =
    total !== null
      ? `共 ${total.toLocaleString()} 筆`
      : items.length > 0
      ? `已載入 ${items.length.toLocaleString()} 筆`
      : "";

  return (
    <Modal show={show} onHide={onHide} centered>
      <Modal.Header closeButton>
        <Modal.Title>切換會員</Modal.Title>
      </Modal.Header>

      <Modal.Body>
        {/* 查詢條件列 */}
        <Row className="g-2 align-items-end">
          <Col md>
            <Form.Label className="mb-1 small text-muted">會員姓名</Form.Label>
            <Form.Control
              placeholder="輸入會員姓名"
              value={nameInput}
              onChange={(e) => {
                setSelected(null);
                setNameInput(e.target.value);
              }}
              disabled={loading}
            />
          </Col>
          <Col md>
            <Form.Label className="mb-1 small text-muted">電話</Form.Label>
            <Form.Control
              placeholder="輸入電話"
              value={phoneInput}
              onChange={(e) => {
                setSelected(null);
                setPhoneInput(e.target.value);
              }}
              disabled={loading}
            />
          </Col>
          <Col xs="auto">
            <Form.Label className="mb-1 small text-muted">身份</Form.Label>
            <Form.Select
              value={memberType}
              onChange={(e) =>
                setMemberType(e.target.value === "" ? "" : Number(e.target.value))
              }
              disabled={loading}
              style={{ minWidth: 108 }}
            >
              <option value="">全部</option>
              <option value={0}>一般</option>
              <option value={1}>導遊</option>
              <option value={2}>廠商</option>
            </Form.Select>
          </Col>
        </Row>

        {/* 顯示數量/狀態 */}
        <div className="small text-muted mt-2">{totalText}</div>

        {/* 清單 */}
        {items.length > 0 && (
          <ListGroup className="mt-2" style={{ maxHeight: 360, overflowY: "auto" }}>
            {items.map((m) => {
              const isActive =
                (selected?.id ?? selected?.memberId) === (m.id ?? m.memberId);
              const phone = m.contactPhone ?? m.phone ?? m.mobile ?? "無電話";
              const name = m.fullName ?? m.name ?? "未命名";
              const level =
                m.levelName ?? m.LevelName ?? m.levelCode ?? m.LevelCode ?? "";
              const points = Number(
                m.cashbackPoint ?? m.rewardPoints ?? m.points ?? 0
              );

              return (
                <ListGroup.Item
                  key={m.id ?? m.memberId}
                  action
                  active={isActive}
                  onClick={() => handleSelectRow(m)}
                >
                  <div className="d-flex align-items-start justify-content-between">
                    <div className="me-2">
                      <div className="fw-bold">
                        {name}（{phone}）
                      </div>
                      <div className="text-muted small">
                        會員編號：{m.memberNo ?? m.MemberNo ?? "—"}
                      </div>
                    </div>

                    <div className="text-end" style={{ minWidth: 160 }}>
                      <div className="mb-1">
                        <span
                          className="badge me-1"
                          style={{
                            background: "#eef5ff",
                            color: "#2a5fb9",
                            border: "1px solid #d6e6ff",
                          }}
                        >
                          {m.memberType ?? "一般會員"}
                        </span>
                        {level && (
                          <span
                            className="badge"
                            style={{
                              background: "#fff3f8",
                              color: "#d63384",
                              border: "1px solid #ffd6e9",
                            }}
                          >
                            {level}
                          </span>
                        )}
                      </div>
                      <div className="small">點數 {points.toLocaleString()}</div>
                    </div>
                  </div>
                </ListGroup.Item>
              );
            })}
          </ListGroup>
        )}

        {/* 空狀態 */}
        {!loading &&
          items.length === 0 &&
          (memberType !== "" || nameInput.trim() || phoneInput.trim()) && (
            <div className="text-muted mt-3">找不到符合的會員</div>
          )}

        {/* 無限卷軸：sentinel（放在列表底部，下方再加 loading 狀態） */}
        <div ref={sentinelRef} />

        {loading && (
          <div className="text-center mt-2">
            <Spinner animation="border" size="sm" />
          </div>
        )}
      </Modal.Body>

      <Modal.Footer className="d-flex w-100">
        {/* ⬅️ 左側：登出會員 */}
        <div className="me-auto">
          <Button variant="outline-danger" onClick={handleLogout}>
            登出會員
          </Button>
        </div>

        {/* 右側：取消 / 確認 */}
        <div>
          <Button variant="secondary" onClick={onHide} className="me-2">
            取消
          </Button>
          <Button variant="primary" onClick={handleSubmit} disabled={!selected}>
            確認
          </Button>
        </div>
      </Modal.Footer>
    </Modal>
  );
}
