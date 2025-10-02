// Check.jsx — 前台盤點（未建單先列全商品；暫存/送出才建單；含備註/刪除/新增盤點單/紀錄）
import React, { useEffect, useState, useMemo } from "react";
import { FaSearch, FaHistory, FaSave, FaBroom, FaPaperPlane, FaTrash, FaPlus } from "react-icons/fa";
import Swal from "sweetalert2";
import "sweetalert2/dist/sweetalert2.min.css";

import api from "../utils/apiClient";
import { useEmployee } from "../utils/EmployeeContext";

const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";
const ITEMS_PER_PAGE = 24;

const STATUS = {
  0: { text: "暫存", color: "#6c757d" },
  1: { text: "盤點中", color: "#f0ad4e" },
  2: { text: "已結算", color: "#5cb85c" },
};

const isoNow = () => new Date().toISOString();
const getUserName = (user) =>
  user?.name || user?.username || user?.account || user?.displayName || user?.fullName || "";

export default function Check() {
  const { user, hydrating } = useEmployee(); // user.storeId / user.id
  const storeId = user?.storeId;
  const userId = user?.id;
  const inventoryBy = getUserName(user);

  // ====== 查詢條件：分類 + 關鍵字（自動送出）======
  const [categoryId, setCategoryId] = useState("");
  const [categoryOptions, setCategoryOptions] = useState([{ value: "", label: "全部商品種類" }]);
  const [categoryLoading, setCategoryLoading] = useState(false);
  const [keyword, setKeyword] = useState("");
  const [debouncedKeyword, setDebouncedKeyword] = useState("");

  // ====== 分頁 / 主檔 / 明細 ======
  const [currentPage, setCurrentPage] = useState(1);
  const [record, setRecord] = useState(null);
  const [remark, setRemark] = useState("");

  const [pagedItems, setPagedItems] = useState([]);
  const [totalItems, setTotalItems] = useState(0);

  const [edited, setEdited] = useState({}); // { [productId]: { countedQuantity } }

  // Flags
  const [loadingItems, setLoadingItems] = useState(false);
  const [saving, setSaving] = useState(false);
  const [finalizing, setFinalizing] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // 盤點紀錄 Modal
  const [showRecordModal, setShowRecordModal] = useState(false);
  const [records, setRecords] = useState([]);
  const [recTotal, setRecTotal] = useState(0);
  const [recPage, setRecPage] = useState(1);
  const [recKeyword, setRecKeyword] = useState("");
  const [recStatus, setRecStatus] = useState(""); // "", 0,1,2
  const REC_LIMIT = 10;

  const totalPages = Math.max(1, Math.ceil(totalItems / ITEMS_PER_PAGE));
  const isLocked = record?.status === 2;

  // 即時計數（未建單）：有輸入數字(含0)就算已盤
  const localCounted = useMemo(
    () =>
      Object.values(edited).filter(
        (v) =>
          v &&
          v.countedQuantity !== "" &&
          v.countedQuantity !== null &&
          Number.isFinite(Number(v.countedQuantity))
      ).length,
    [edited]
  );

  // ====== 資料映射（/t_Product/StoreProducts）======
  const mapProductToRow = (p) => ({
    id: `p_${p.id}`,
    productId: p.id,
    productNumber: String(p.productNumber ?? p.id),
    productName: p.name,
    unit: p.unit,
    stockQuantity: Number(p.stock ?? p.stockQuantity ?? 0),
    countedQuantity: null,
  });

  // ====== 載入分類清單（保留，但 UI 隱藏）======
  useEffect(() => {
    let alive = true;
    (async () => {
      setCategoryLoading(true);
      try {
        const { data } = await api.get(`${API_BASE}/Dropdown/GetCategoryList`);
        const arr = Array.isArray(data) ? data : [];
        const opts = arr
          .map((x) => ({ value: String(x.value ?? ""), label: String(x.label ?? x.key ?? x.value ?? "") }))
          .filter((o) => o.value !== "");
        if (alive) setCategoryOptions([{ value: "", label: "全部商品種類" }, ...opts]);
      } catch (e) {
        if (alive) setCategoryOptions([{ value: "", label: "全部商品種類" }]);
      } finally {
        if (alive) setCategoryLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  // ====== 未建單：伺服器分頁查商品（支援 keyword / categoryId）======
  const fetchProductPage = async (page = 1) => {
    if (!storeId) return;
    setLoadingItems(true);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const params = {
        storeId,
        offset,
        limit: ITEMS_PER_PAGE,
        keyword: debouncedKeyword || undefined,
        productName: debouncedKeyword || undefined,
        categoryId: categoryId || undefined,
      };
      const { data } = await api.get(`${API_BASE}/t_Product/StoreProducts`, { params });
      const items = (Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : []).map(
        mapProductToRow
      );
      const total = typeof data?.total === "number" ? data.total : items.length;
      setPagedItems(items);
      setTotalItems(total);
    } catch (e) {
      setPagedItems([]);
      setTotalItems(0);
      Swal.fire("讀取失敗", "無法載入商品清單。", "error");
    } finally {
      setLoadingItems(false);
    }
  };

  // ====== 已建單：伺服器分頁查明細（支援 keyword）======
  const fetchRecordItems = async (page = 1, kw = "", inventoryIdParam) => {
    const inventoryId = inventoryIdParam ?? record?.id;
    if (!inventoryId) return;
    setLoadingItems(true);
    try {
      const offset = (page - 1) * ITEMS_PER_PAGE;
      const { data } = await api.get(`${API_BASE}/t_InventoryRecordItem`, {
        params: { inventoryId, keyword: kw || undefined, offset, limit: ITEMS_PER_PAGE },
      });
      const items = (data?.items || []).map((it) => ({
        ...it,
        stockQuantity: Number(it.stockQuantity ?? it.systemQuantity ?? 0),
      }));
      setPagedItems(items);
      setTotalItems(data?.total ?? items.length);
    } catch (e) {
      setPagedItems([]);
      setTotalItems(0);
      Swal.fire("讀取失敗", "無法載入盤點明細。", "error");
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchRecord = async (id) => {
    const { data } = await api.get(`${API_BASE}/t_InventoryRecord/${id}`);
    setRecord(data);
    setRemark(data?.remark ?? "");
  };

  const recomputeCountsFromItems = async (id) => {
    try {
      const { data } = await api.get(`${API_BASE}/t_InventoryRecordItem`, {
        params: { inventoryId: id, offset: 0, limit: 5000 },
      });
      const all = data?.items || [];
      const total = data?.total ?? all.length;
      const counted = all.filter(
        (it) => it.countedQuantity !== null && it.countedQuantity !== undefined
      ).length;
      setRecord((prev) => (prev && prev.id === id ? { ...prev, totalItemCount: total, countedItemCount: counted } : prev));
    } catch {}
  };

  // ====== 初始化 ======
  useEffect(() => {
    if (hydrating) return;
    if (storeId) resetToNewLocal();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hydrating, storeId]);

  // ====== 關鍵字防抖（無搜尋按鈕，輸入即查）======
  useEffect(() => {
    const t = setTimeout(() => setDebouncedKeyword(keyword.trim()), 300);
    return () => clearTimeout(t);
  }, [keyword]);

  // ====== 依狀態載入（換頁 / 條件變更）======
  useEffect(() => {
    if (hydrating) return;
    if (record?.id) {
      fetchRecordItems(currentPage, debouncedKeyword);
    } else {
      fetchProductPage(currentPage);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPage, debouncedKeyword, categoryId]);

  // ====== 編輯（以 productId 為 key）======
  const onChangeCount = (row, val) => {
    const v = val === "" ? "" : Number(val);
    if (v === "" || Number.isFinite(v)) {
      setEdited((prev) => ({
        ...prev,
        [row.productId]: { countedQuantity: val === "" ? "" : Number(val) },
      }));
    }
  };
  const getEditingValue = (row) => {
    const e = edited[row.productId]?.countedQuantity;
    return e === undefined ? (row.countedQuantity ?? "") : e;
  };

  // ====== 建主檔（POST /t_InventoryRecord）======
  const postRecord = async (status = 0) => {
    const payload = {
      id: 0,
      inventoryNumber: "",
      inventoryDate: isoNow(),
      storeId,
      userId,
      inventoryBy,
      status,
      remark: remark || "",
      totalItemCount: 0,
      countedItemCount: 0,
      discrepancyCount: 0,
      createdAt: isoNow(),
      postedAt: isoNow(),
    };
    const { data } = await api.post(`${API_BASE}/t_InventoryRecord`, payload);
    return data;
  };

  // ====== 首次建單：全量明細（以目前「有取回的商品集合」為基準批次 PUT）======
  const putAllItemsArray = async (inventoryId) => {
    const pageSize = 500;
    let offset = 0;
    let total = 0;
    let all = [];
    while (true) {
      const params = {
        storeId,
        offset,
        limit: pageSize,
        keyword: debouncedKeyword || undefined,
        productName: debouncedKeyword || undefined,
        categoryId: categoryId || undefined,
      };
      const { data } = await api.get(`${API_BASE}/t_Product/StoreProducts`, { params });
      const pageItems = (Array.isArray(data?.items) ? data.items : []).map(mapProductToRow);
      if (offset === 0) total = typeof data?.total === "number" ? data.total : pageItems.length;
      all = all.concat(pageItems);
      offset += pageSize;
      if (all.length >= total || pageItems.length === 0) break;
    }

    const putArray = all.map((it) => {
      const e = edited[it.productId];
      const c = e?.countedQuantity;
      return {
        id: 0,
        inventoryId,
        productId: it.productId,
        productNumber: it.productNumber || String(it.productId),
        productName: it.productName,
        unit: it.unit,
        stockQuantity: Number(it.stockQuantity ?? 0),
        countedQuantity: c === undefined || c === "" ? null : Number(c),
        remark: "",
      };
    });

    await api.put(`${API_BASE}/t_InventoryRecordItem/${inventoryId}`, putArray);
  };

  // ====== 已建單：只送異動 ======
  const putChangedItemsArray = async (inventoryId) => {
    const changedIds = Object.keys(edited);
    if (!changedIds.length) return false;

    const getSource = (pid) => pagedItems.find((r) => r.productId === pid) || {};
    const putArray = changedIds.map((pidStr) => {
      const pid = Number(pidStr);
      const src = getSource(pid);
      const e = edited[pid] || {};
      return {
        id: 0,
        inventoryId,
        productId: pid,
        productNumber: src.productNumber || String(pid),
        productName: src.productName || "",
        unit: src.unit || "",
        stockQuantity: Number(src.stockQuantity ?? 0),
        countedQuantity: e.countedQuantity === "" ? null : Number(e.countedQuantity),
        remark: src.remark || "",
      };
    });

    await api.put(`${API_BASE}/t_InventoryRecordItem/${inventoryId}`, putArray);
    return true;
  };

  // ====== 摘要（SweetAlert2）======
  const summarizeForConfirm = async () => {
    if (!record) {
      const { data } = await api.get(`${API_BASE}/t_Product/StoreProducts`, {
        params: {
          storeId,
          offset: 0,
          limit: ITEMS_PER_PAGE,
          keyword: debouncedKeyword || undefined,
          productName: debouncedKeyword || undefined,
          categoryId: categoryId || undefined,
        },
      });
      const total = typeof data?.total === "number" ? data.total : (data?.items?.length ?? 0);
      let filled = 0;
      let diff = 0;
      pagedItems.forEach((it) => {
        const e = edited[it.productId];
        if (e && e.countedQuantity !== "" && e.countedQuantity !== null) {
          filled += 1;
          if (Number(e.countedQuantity) !== Number(it.stockQuantity || 0)) diff += 1;
        }
      });
      return { total, filled, diff };
    } else {
      const { data } = await api.get(`${API_BASE}/t_InventoryRecordItem`, {
        params: { inventoryId: record.id, offset: 0, limit: 5000, keyword: debouncedKeyword || undefined },
      });
      const all = data?.items || [];
      const total = data?.total ?? all.length;
      let filled = 0;
      let diff = 0;
      for (const it of all) {
        const override = edited[it.productId];
        const counted = override?.countedQuantity ?? it.countedQuantity;
        const base = Number(it.stockQuantity ?? it.systemQuantity ?? 0);
        if (counted !== null && counted !== undefined && counted !== "") {
          filled += 1;
          if (Number(counted) !== base) diff += 1;
        }
      }
      return { total, filled, diff };
    }
  };

  const confirmWithSummary = async (actionText) => {
    const { total, filled, diff } = await summarizeForConfirm();
    const html = `
      <div class="text-start" style="line-height:1.6">
        <div><strong>總項數：</strong>${total}</div>
        <div><strong>已輸入：</strong>${filled} / ${total}</div>
        <div><strong>與系統數量不同：</strong>${diff} 項</div>
      </div>
    `;
    const res = await Swal.fire({
      title: actionText === "送出" ? "送出確認" : "暫存確認",
      html,
      icon: "question",
      showCancelButton: true,
      confirmButtonText: `確定${actionText}`,
      cancelButtonText: "取消",
      focusCancel: true,
    });
    return res.isConfirmed;
  };

  // ====== 暫存 / 送出 / 清空 / 刪除（略，維持原本） ======
  const handleSave = async () => {
    if (saving || !storeId || !userId) return;
    const ok = await confirmWithSummary("暫存");
    if (!ok) return;

    setSaving(true);
    try {
      if (!record) {
        const newRec = await postRecord(0);
        await putAllItemsArray(newRec.id);
        await fetchRecord(newRec.id);
        await recomputeCountsFromItems(newRec.id);
        setEdited({});
        await fetchRecordItems(1, "");
        setCurrentPage(1);
        Swal.fire("已暫存", "本次暫存已完成。", "success");
      } else {
        const sent = await putChangedItemsArray(record.id);
        if (!sent) return Swal.fire("沒有變更", "目前沒有需要儲存的變更。", "info");
        setEdited({});
        await Promise.all([fetchRecordItems(currentPage, debouncedKeyword), fetchRecord(record.id), recomputeCountsFromItems(record.id)]);
        Swal.fire("已暫存", "變更已儲存。", "success");
      }
    } catch (e) {
      Swal.fire("儲存失敗", "請稍後再試。", "error");
    } finally {
      setSaving(false);
    }
  };

  const handleFinalize = async () => {
    if (finalizing) return;
    const ok = await confirmWithSummary("送出");
    if (!ok) return;

    setFinalizing(true);
    try {
      if (!record) {
        const newRec = await postRecord(2);
        await putAllItemsArray(newRec.id);
        await fetchRecord(newRec.id);
        await recomputeCountsFromItems(newRec.id);
        setEdited({});
        await fetchRecordItems(1, "");
        setCurrentPage(1);
        Swal.fire("已結算", "盤點單已送出。", "success");
      } else {
        if (Object.keys(edited).length) {
          await putChangedItemsArray(record.id);
          setEdited({});
        }
        await api.put(`${API_BASE}/t_InventoryRecord/${record.id}`, { status: 2 });
        await fetchRecord(record.id);
        await recomputeCountsFromItems(record.id);
        Swal.fire("已結算", "盤點單已送出。", "success");
      }
    } catch (e) {
      Swal.fire("送出失敗", "請稍後再試。", "error");
    } finally {
      setFinalizing(false);
    }
  };

  const handleClear = async () => {
    if (isLocked) return;
    const res = await Swal.fire({
      title: "一鍵清空？",
      text: record ? "將把此盤點單所有盤點數量改為未填（null）。" : "將清除目前畫面上尚未送出的輸入。",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "確認清空",
      cancelButtonText: "取消",
      confirmButtonColor: "#d33",
    });
    if (!res.isConfirmed) return;

    if (!record) {
      setEdited({});
      Swal.fire("已清空", "已清除目前頁面上的輸入。", "success");
    } else {
      setClearing(true);
      try {
        await api.put(`${API_BASE}/t_InventoryRecordItem/Clear/${record.id}`);
        setEdited({});
        await Promise.all([fetchRecordItems(currentPage, debouncedKeyword), fetchRecord(record.id), recomputeCountsFromItems(record.id)]);
        Swal.fire("已清空", "此盤點單的盤點數量已設為未填（null）。", "success");
      } catch {
        Swal.fire("清空失敗", "請稍後再試。", "error");
      } finally {
        setClearing(false);
      }
    }
  };

  const handleDeleteRecord = async () => {
    if (!record || record.status >= 2) return;
    const res = await Swal.fire({
      title: "刪除此盤點單？",
      text: "刪除後不可復原。",
      icon: "warning",
      showCancelButton: true,
      confirmButtonText: "確定刪除",
      cancelButtonText: "取消",
      confirmButtonColor: "#d33",
    });
    if (!res.isConfirmed) return;

    setDeleting(true);
    try {
      await api.delete(`${API_BASE}/t_InventoryRecord/${record.id}`);
      Swal.fire("已刪除", "盤點單已刪除。", "success");
      resetToNewLocal();
    } catch {
      Swal.fire("刪除失敗", "請稍後再試。", "error");
    } finally {
      setDeleting(false);
    }
  };

  const resetToNewLocal = async () => {
    setRecord(null);
    setEdited({});
    setRemark("");
    setKeyword("");
    setCurrentPage(1);
    await fetchProductPage(1);
  };

  const fetchRecordList = async (page = recPage) => {
    try {
      const offset = (page - 1) * REC_LIMIT;
      const params = {
        storeId,
        status: recStatus === "" ? undefined : recStatus,
        keyword: recKeyword || undefined,
        offset,
        limit: REC_LIMIT,
      };
      const { data } = await api.get(`${API_BASE}/t_InventoryRecord`, { params });
      setRecords(data?.items || []);
      setRecTotal(data?.total ?? 0);
    } catch {
      setRecords([]);
      setRecTotal(0);
      Swal.fire("讀取失敗", "無法載入盤點紀錄。", "error");
    }
  };

  const openRecordFromModal = async (r) => {
    try {
      const { data } = await api.get(`${API_BASE}/t_InventoryRecord/${r.id}`);
      setRecord(data);
      setRemark(data?.remark ?? "");
      setEdited({});
      setCurrentPage(1);
      await fetchRecordItems(1, "", r.id);
      setShowRecordModal(false);
    } catch {
      Swal.fire("開啟失敗", "請稍後再試。", "error");
    }
  };

  useEffect(() => {
    if (showRecordModal) fetchRecordList(1);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [showRecordModal]);

  // ====== Render Helpers ======
  const renderRows = (list) =>
    list.length ? (
      list.map((row) => {
        const v = getEditingValue(row);
        const baseQty = Number(row.stockQuantity ?? row.systemQuantity ?? 0);
        const diff = v === "" || v == null ? 0 : Number(v) - baseQty;
        return (
          <tr key={`${row.id || row.productId}`}>
            {/* ★ 商品編號欄已移除 */}
            <td className="text-start">{row.productName}</td>
            <td style={{ width: 80 }}>{row.unit || ""}</td>
            <td>{baseQty}</td> {/* ★ 庫存數量 → 庫存 */}
            <td>
              <input
                disabled={isLocked}
                value={getEditingValue(row)}
                onChange={(e) => onChangeCount(row, e.target.value)}
                className="form-control text-center"
                style={{ height: "5vh" }}
              />
            </td>
            <td style={{ color: diff !== 0 ? "red" : undefined }}>{diff}</td>
          </tr>
        );
      })
    ) : (
      <tr>
        <td colSpan={5}>無資料</td> {/* ★ colSpan 由 6 → 5 */}
      </tr>
    );

  // 永遠雙欄：每頁 24 筆，左 12 / 右 12
  const leftData = pagedItems.slice(0, 12);
  const rightData = pagedItems.slice(12, 24);

  if (hydrating || !storeId || !userId) {
    return <div className="p-4">載入中…</div>;
  }

  return (
    <>
      {/* 工具列（備註靠左 + 關鍵字） */}
      <div className="search-container d-flex gap-3 px-5 py-3 align-items-center flex-wrap">
        {/* 即時關鍵字（無搜尋按鈕） */}
        <div className="d-flex align-items-center" style={{ minWidth: 280 }}>
          <FaSearch className="me-2" />
          <input
            className="form-control"
            value={keyword}
            onChange={(e) => {
              setKeyword(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="搜尋商品編號/名稱"
          />
        </div>

        {/* ★ 商品種類下拉選單：隱藏（若日後要顯示，將下方註解解除即可） */}
        {false && (
          <select
            className="form-select"
            style={{ maxWidth: 220 }}
            value={categoryId}
            onChange={(e) => {
              setCategoryId(e.target.value);
              setCurrentPage(1);
            }}
            disabled={categoryLoading || !!record}
            title={record ? "已建單時不套用分類" : ""}
          >
            {categoryOptions.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
        )}

        {/* 備註（靠左） */}
        <div className="d-flex align-items-center" style={{ minWidth: 360 }}>
          <span className="me-2" style={{ whiteSpace: "nowrap" }}>備註：</span>
          <input
            className="form-control"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            placeholder="此盤點單的備註"
          />
        </div>

        <div className="ms-auto d-flex gap-2">
          <button className="btn btn-success" onClick={resetToNewLocal}>
            <FaPlus className="me-2" />
            新增盤點單（回到未建單）
          </button>

          <button className="btn btn-outline-secondary" onClick={() => setShowRecordModal(true)}>
            <FaHistory className="me-2" /> 盤點紀錄
          </button>
        </div>
      </div>

      {/* 狀態列 */}
      <div
        className="px-5 pb-2"
        style={{ fontSize: "0.95rem", color: record ? STATUS[record.status]?.color : "#6c757d" }}
      >
        {record ? (
          <>
            目前盤點單：<strong>{record.inventoryNumber || record.id}</strong>
            （狀態：{STATUS[record.status]?.text}，已盤 {record.countedItemCount ?? 0}/{record.totalItemCount ?? 0}）
            {record.remark ? <span className="ms-2">｜備註：{record.remark}</span> : null}
          </>
        ) : (
          <>
            尚未建立盤點單（輸入數量後按「暫存」或「送出」即會建立盤點單）
            <span className="ms-2">（已盤 {localCounted}/{totalItems}）</span>
          </>
        )}
      </div>

      {/* 表格區域：永遠雙欄半版 */}
      <div className="d-flex px-4">
        <div style={{ flex: 1, height: "60vh", overflow: "hidden" }}>
          <table className="table text-center" style={{ fontSize: "1.05rem", border: "1px solid #D7D7D7" }}>
            <thead className="table-info">
              <tr>
                {/* ★ 商品編號欄移除，並設定表頭全部不換行 */}
                <th style={{ whiteSpace: "nowrap" }}>商品名稱</th>
                <th style={{ width: 80, whiteSpace: "nowrap" }}>單位</th>
                <th style={{ width: 120, whiteSpace: "nowrap" }}>庫存</th> {/* ★ 改名 */}
                <th style={{ width: 140, whiteSpace: "nowrap" }}>盤點數量</th>
                <th style={{ width: 120, whiteSpace: "nowrap" }}>差異</th>
              </tr>
            </thead>
            <tbody>
              {loadingItems ? <tr><td colSpan={5}>載入中…</td></tr> : renderRows(leftData)}
            </tbody>
          </table>
        </div>

        <div style={{ flex: 1, height: "66vh", overflow: "hidden" }}>
          <table className="table text-center" style={{ fontSize: "1.05rem", border: "1px solid #D7D7D7" }}>
            <thead className="table-info">
              <tr>
                <th style={{ whiteSpace: "nowrap" }}>商品名稱</th>
                <th style={{ width: 80, whiteSpace: "nowrap" }}>單位</th>
                <th style={{ width: 120, whiteSpace: "nowrap" }}>庫存</th> {/* ★ 改名 */}
                <th style={{ width: 140, whiteSpace: "nowrap" }}>盤點數量</th>
                <th style={{ width: 120, whiteSpace: "nowrap" }}>差異</th>
              </tr>
            </thead>
            <tbody>
              {loadingItems ? <tr><td colSpan={5}>載入中…</td></tr> : renderRows(rightData)}
            </tbody>
          </table>
        </div>
      </div>

      {/* 換頁 */}
      <div className="pagination-controls text-center me-5">
        <button
          onClick={() => setCurrentPage((p) => Math.max(p - 1, 1))}
          disabled={currentPage === 1}
          className="btn btn-secondary mx-2 mb-2"
          style={{ fontSize: "1.1rem" }}
        >
          上一頁
        </button>
        <span style={{ fontSize: "1.2rem" }}>
          第 {currentPage} 頁 / 共 {totalPages} 頁
        </span>
        <button
          onClick={() => setCurrentPage((p) => Math.min(p + 1, totalPages))}
          disabled={currentPage === totalPages}
          className="btn btn-secondary mx-2 mb-2"
          style={{ fontSize: "1.1rem" }}
        >
          下一頁
        </button>
      </div>

      {/* 底部操作鈕（維持） */}
      <div className="d-flex gap-2 me-5" style={{ position: "absolute", bottom: 35, right: 0 }}>
        <button
          className="btn"
          style={{ background: "#9A3B3B", color: "white" }}
          disabled={!record || record.status >= 2 || deleting}
          onClick={handleDeleteRecord}
          title="刪除此盤點單（未結算）"
        >
          <FaTrash className="me-2" /> {deleting ? "刪除中…" : "刪除"}
        </button>

        <button className="btn" style={{ background: "#ED7171", color: "white" }} disabled={isLocked || clearing} onClick={handleClear}>
          <FaBroom className="me-2" /> {clearing ? "清空中…" : "一鍵清空"}
        </button>
        <button className="btn" style={{ background: "#445A61", color: "white" }} disabled={isLocked || saving} onClick={handleSave}>
          <FaSave className="me-2" /> {saving ? "儲存中…" : "暫存"}
        </button>
        <button className="btn" style={{ background: "#337DD1", color: "white" }} disabled={isLocked || finalizing} onClick={handleFinalize}>
          <FaPaperPlane className="me-2" /> {finalizing ? "送出中…" : "送出"}
        </button>
      </div>

      {/* 盤點紀錄 Modal（維持原本功能） */}
      {showRecordModal && (
        <div className="modal d-block" tabIndex="-1" onClick={() => setShowRecordModal(false)}>
          <div className="modal-dialog modal-xl" onClick={(e) => e.stopPropagation()}>
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">盤點紀錄</h5>
                <button type="button" className="btn-close" onClick={() => setShowRecordModal(false)} />
              </div>
              <div className="modal-body">
                <div className="d-flex gap-2 mb-3">
                  <select
                    className="form-select"
                    style={{ maxWidth: 160 }}
                    value={recStatus}
                    onChange={(e) => setRecStatus(e.target.value)}
                  >
                    <option value="">全部狀態</option>
                    <option value="0">暫存</option>
                    <option value="1">盤點中</option>
                    <option value="2">已結算</option>
                  </select>
                  <input
                    className="form-control"
                    placeholder="關鍵字（單號/備註/人員）"
                    value={recKeyword}
                    onChange={(e) => setRecKeyword(e.target.value)}
                  />
                  <button
                    className="btn btn-primary"
                    onClick={() => {
                      setRecPage(1);
                      fetchRecordList(1);
                    }}
                  >
                    查詢
                  </button>
                </div>

                <table className="table">
                  <thead>
                    <tr>
                      <th>單號</th>
                      <th>日期</th>
                      <th>盤點人</th>
                      <th>備註</th>
                      <th>狀態</th>
                      <th>已盤/總項</th>
                      <th></th>
                    </tr>
                  </thead>
                  <tbody>
                    {records.length ? (
                      records.map((r) => {
                        const counted = record && r.id === record.id ? (record.countedItemCount ?? 0) : (r.countedItemCount ?? 0);
                        const total = record && r.id === record.id ? (record.totalItemCount ?? 0) : (r.totalItemCount ?? 0);
                        return (
                          <tr key={r.id}>
                            <td>{r.inventoryNumber || r.id}</td>
                            <td>{(r.inventoryDate || "").slice(0, 10)}</td>
                            <td>{r.inventoryBy || ""}</td>
                            <td className="text-truncate" style={{ maxWidth: 280 }}>{r.remark || ""}</td>
                            <td style={{ color: STATUS[r.status]?.color }}>{STATUS[r.status]?.text}</td>
                            <td>{counted}/{total}</td>
                            <td>
                              <button className="btn btn-sm btn-primary" onClick={() => openRecordFromModal(r)}>
                                開啟
                              </button>
                            </td>
                          </tr>
                        );
                      })
                    ) : (
                      <tr>
                        <td colSpan={7}>無資料</td>
                      </tr>
                    )}
                  </tbody>
                </table>

                <div className="text-center">
                  <button
                    className="btn btn-outline-secondary mx-2"
                    onClick={() => {
                      const p = Math.max(1, recPage - 1);
                      setRecPage(p);
                      fetchRecordList(p);
                    }}
                    disabled={recPage === 1}
                  >
                    上一頁
                  </button>
                  <span> 第 {recPage} 頁 </span>
                  <button
                    className="btn btn-outline-secondary mx-2"
                    onClick={() => {
                      const maxPage = Math.max(1, Math.ceil(recTotal / REC_LIMIT));
                      const p = Math.min(maxPage, recPage + 1);
                      setRecPage(p);
                      fetchRecordList(p);
                    }}
                    disabled={recPage >= Math.max(1, Math.ceil(recTotal / REC_LIMIT))}
                  >
                    下一頁
                  </button>
                </div>
              </div>
              <div className="modal-footer">
                <button className="btn btn-outline-secondary" onClick={() => setShowRecordModal(false)}>
                  關閉
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
