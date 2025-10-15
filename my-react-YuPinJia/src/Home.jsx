// Home.jsx
import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { useEmployee } from "./utils/EmployeeContext";
import axios from "axios";

import Cart from "./components/Cart";
import Navbar from "./components/Navbar";
import CardTable from "./components/CardTable";
import NewArrivalTable from "./components/NewArrivalTable";
import GiftTable from "./components/GiftTable";
import CategoryProductTable from "./components/CategoryProductTable";

/* =========================
   價格規則與工具
========================= */

const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

const pickPriceGeneral = (p) => {
  const candidates = [
    { key: "distributor", value: num(p.distributorPrice) },
    { key: "level", value: num(p.levelPrice) },
    { key: "store", value: num(p.storePrice) },
    { key: "product", value: num(p.price) },
  ];
  const first =
    candidates.find((c) => c.value > 0) || candidates[candidates.length - 1];
  return { price: first.value, source: first.key };
};

const pickPriceStoreOnly = (p) => {
  const candidates = [
    { key: "store", value: num(p.storePrice) },
    { key: "product", value: num(p.price) },
  ];
  const first =
    candidates.find((c) => c.value > 0) || candidates[candidates.length - 1];
  return { price: first.value, source: first.key };
};

const pickPriceForPayer = (p, currentMember, isGuideSelf) => {
  // ✅ 未登入：一律用門市價（storePrice）→ 原價（price）
  if (!currentMember) return pickPriceStoreOnly(p);

  const isGuideAccount =
    currentMember?.subType === "導遊" || currentMember?.buyerType === 1;
  if (isGuideAccount && !isGuideSelf) {
    return pickPriceStoreOnly(p);
  }
  return pickPriceGeneral(p);
};

/* =========================
   產品 URL（有 memberId 就帶，沒有就不帶）
========================= */
const buildProductUrl = (searchType, categoryId, memberId) => {
  const base = "https://yupinjia.hyjr.com.tw/api/api/t_Product";
  const params = new URLSearchParams();

  if (searchType != null) params.set("searchType", String(searchType));
  if (searchType === 3 && categoryId != null) {
    params.set("categoryId", String(categoryId));
  }
  // ✅ 只有有 memberId 才帶，未登入就不帶
  if (memberId != null) params.set("memberId", String(memberId));

  const qs = params.toString();
  return qs ? `${base}?${qs}` : base;
};

/* =========================
   後端請求
========================= */

const fetchProductsBySearchType = async (searchType, categoryId, memberId) => {
  const url = buildProductUrl(searchType, categoryId, memberId);
  const res = await axios.get(url);
  return res.data || [];
};

const fetchCategories = async () => {
  const res = await axios.get(
    "https://yupinjia.hyjr.com.tw/api/api/t_Category"
  );
  return res.data || [];
};

/* =========================
   會員摘要（結帳後刷新）
========================= */
const API_BASE = "https://yupinjia.hyjr.com.tw/api/api";

async function fetchMemberSummaryById(id) {
  if (!id) return null;
  const res = await axios.get(`${API_BASE}/t_Member/MemberSummary/${id}`);
  return res.data || null;
}

function mergeMemberSummary(prev, summary) {
  // ① 先把 point 讀對（支援大小寫與相容欄位）
  const rawPt =
    summary?.point ??
    summary?.Point ??
    summary?.cashbackPoint ??
    summary?.CashbackPoint ??
    summary?.rewardPoints ??
    0;
  const point = Number.isFinite(Number(rawPt)) ? Number(rawPt) : 0;

  // ② 其他欄位也做大小寫相容（避免之後 API 改動）
  const id = summary?.id ?? summary?.Id ?? prev?.id ?? prev?.memberId;
  const fullName = summary?.fullName ?? summary?.FullName ?? prev?.fullName;
  const memberType =
    summary?.memberType ?? summary?.MemberType ?? prev?.memberType;
  const levelName = summary?.levelName ?? summary?.LevelName ?? prev?.levelName;

  return {
    ...(prev || {}),
    id,
    memberId: id,
    fullName,
    memberType,
    levelName,
    levelCode: levelName, // 舊畫面用到的別名
    // ③ 三個點數欄位都一起覆蓋，確保前台任何讀法都會拿到 98
    point,
    cashbackPoint: point,
    rewardPoints: point,
  };
}

export default function Home() {
  const { currentUser } = useEmployee() || {};
  const employeeUser = currentUser?.user;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("熱銷排行");
  const [cartItems, setCartItems] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);
  const [searchType, setSearchType] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isGuideSelf, setIsGuideSelf] = useState(() => {
    try {
      const saved = localStorage.getItem("checkout_payer");
      if (saved === "guide") return true;
      if (saved === "customer") return false;
      const raw = localStorage.getItem("checkoutData");
      const payer = raw ? JSON.parse(raw)?.checkoutPayer : null;
      if (payer === "GUIDE_SELF") return true;
      if (payer === "CUSTOMER") return false;
    } catch {}
    return false;
  });
  const [searchKeyword, setSearchKeyword] = useState("");
  const [cartSummary, setCartSummary] = useState({
    subtotal: 0,
    usedPoints: 0,
    finalTotal: 0,
  });

  const navigate = useNavigate();

  // 計算購物車中贈品的原價合計
  const calcGiftValue = (items) =>
    (items || [])
      .filter((i) => i.isGift)
      .reduce((sum, i) => {
        const price = Number(i.originalPrice ?? i.price ?? i.unitPrice ?? 0);
        const qty = Number(i.quantity ?? 1);
        return sum + price * qty;
      }, 0);

  const handleMemberUpdate = (member) => {
    setCurrentMember(member);
    localStorage.setItem("currentMember", JSON.stringify(member));
  };

  // 還原 localStorage 的會員資料
  const memberInitRef = useRef(false);
  useEffect(() => {
    if (memberInitRef.current) return;
    const stored = localStorage.getItem("currentMember");
    if (stored) {
      try {
        setCurrentMember(JSON.parse(stored));
      } catch {}
    }
    memberInitRef.current = true;
  }, []);

  // 還原結帳身份（導遊/客人），含 checkoutData 備援
  useEffect(() => {
    try {
      const saved = localStorage.getItem("checkout_payer");
      if (saved === "guide") return setIsGuideSelf(true);
      if (saved === "customer") return setIsGuideSelf(false);
      // 備援：從上一次的 checkoutData 讀（GUIDE_SELF / CUSTOMER）
      const raw = localStorage.getItem("checkoutData");
      if (raw) {
        const payer = JSON.parse(raw)?.checkoutPayer;
        if (payer === "GUIDE_SELF") return setIsGuideSelf(true);
        if (payer === "CUSTOMER") return setIsGuideSelf(false);
      }
    } catch {}
  }, []);
  useEffect(() => {
    localStorage.setItem("checkout_payer", isGuideSelf ? "guide" : "customer");
  }, [isGuideSelf]);

  // Tab → searchType
  useEffect(() => {
    switch (activeTab) {
      case "熱銷排行":
        setSearchType(1);
        break;
      case "新品排行":
        setSearchType(2);
        break;
      case "贈送":
        setSearchType(4);
        break;
      case "產品分類":
        setSearchType(3);
        break;
      default:
        setSearchType(1);
    }
  }, [activeTab]);

  // 取得分類
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  /* ========== 贈送額度（員工） ========== */
  // staffId 來源：staffId > employeeId > id
  const rawStaffId =
    employeeUser?.staffId ??
    employeeUser?.employeeId ??
    employeeUser?.id ??
    null;
  const staffId =
    rawStaffId != null && Number.isFinite(Number(rawStaffId))
      ? Number(rawStaffId)
      : null;

  const {
    data: giftAmountData,
    refetch: refetchGiftAmount,
    isFetching: isFetchingGift,
  } = useQuery({
    queryKey: ["staffGiftAmount", staffId],
    // ✅ 放寬條件，只要有 staffId 就抓；如果要節省請求可改回 activeTab === "贈送" && staffId != null
    enabled: staffId != null,
    queryFn: async () => {
      try {
        const res = await axios.get(
          `https://yupinjia.hyjr.com.tw/api/api/t_Staff/GetGiftAmount/${staffId}`,
          {
            headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
            params: { ts: Date.now() },
          }
        );
        const d = res.data ?? {};
        // ✅ 相容大小寫與其他命名
        const val = Number(
          d.MonthRemainGift ??
            d.monthRemainGift ??
            d.GiftAmount ??
            d.giftAmount ??
            0
        );
        return Number.isFinite(val) ? val : 0;
      } catch (err) {
        console.warn(
          "[GetGiftAmount] error:",
          err?.response?.status,
          err?.message
        );
        return 0;
      }
    },
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });

  const getGiftQuota = () =>
    typeof giftAmountData === "number" ? giftAmountData : 0;

  // 只要切到「贈送」分頁就重抓一次（避免快取造成舊數字）
  useEffect(() => {
    if (activeTab === "贈送" && staffId != null) {
      refetchGiftAmount?.();
    }
  }, [activeTab, staffId, refetchGiftAmount]);

  /* ========== memberId → 取得產品 ========== */
  const memberId = useMemo(
    () => currentMember?.id ?? currentMember?.memberId ?? null,
    [currentMember]
  );

  const {
  data: rawProducts = [],
  isError,
  error,
} = useQuery({
  queryKey: ["products", searchType, selectedCategoryId, memberId],
  queryFn: () =>
    fetchProductsBySearchType(searchType, selectedCategoryId, memberId),
  // ✅ 不再要求一定有 memberId；分類模式維持要選 categoryId
  enabled: searchType !== null && (searchType !== 3 || selectedCategoryId !== null),
  keepPreviousData: true,
  staleTime: 1000 * 60 * 5,
});

  // 注入實際用價（由 Home 統一計價）
  const allProducts = useMemo(() => {
    return (rawProducts || []).map((p) => {
      const dealerPick = pickPriceGeneral(p);
      const storePick = pickPriceStoreOnly(p);
      const { price: calculatedPrice, source } = pickPriceForPayer(
        p,
        currentMember,
        isGuideSelf
      );
      return {
        ...p,
        productId: p.productId ?? p.id,
        calculatedPrice,
        _priceSource: source, // distributor | level | store | product
        __dealerPrice: num(dealerPick.price),
        __storePrice: num(storePick.price),
      };
    });
  }, [rawProducts, currentMember, isGuideSelf]);

  // 切換導遊本人/客人 → 重估購物車內非贈品單價
  useEffect(() => {
    if (!allProducts?.length) return;
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.isGift) return it; // 贈品維持 0 元
        const key = it.productId ?? it.id;
        const matched = allProducts.find((p) => (p.productId ?? p.id) === key);
        if (!matched) return it;
        return {
          ...it,
          unitPrice: Number(matched.calculatedPrice ?? it.unitPrice ?? 0),
          __dealerPrice: matched.__dealerPrice,
          __storePrice: matched.__storePrice,
        };
      })
    );
  }, [isGuideSelf, currentMember?.id, allProducts]);

  useEffect(() => {
    if (!allProducts?.length) return;
    setCartItems((prev) =>
      prev.map((it) => {
        if (it.isGift) return it; // 贈品維持 0 元
        const key = it.productId ?? it.id;
        const matched = allProducts.find((p) => (p.productId ?? p.id) === key);
        if (!matched) return it;
        return {
          ...it,
          unitPrice: Number(matched.calculatedPrice ?? it.unitPrice ?? 0),
          __dealerPrice: matched.__dealerPrice,
          __storePrice: matched.__storePrice,
        };
      })
    );
  }, [currentMember?.memberId, allProducts]);

  /* ========== 搜尋 / 顯示清單 ========== */
  const filteredSuggestions = useMemo(() => {
    if (!searchKeyword || !allProducts.length) return [];
    const keyword = searchKeyword.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name?.toLowerCase().includes(keyword) ||
        p.productNumber?.toLowerCase().includes(keyword)
    );
  }, [searchKeyword, allProducts]);

  const displayedProducts = useMemo(() => {
    let filtered = [...allProducts];
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name?.toLowerCase().includes(keyword) ||
          p.productNumber?.toLowerCase().includes(keyword)
      );
    }
    if (activeTab === "新品排行") {
      return [...filtered].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );
    }
    return filtered;
  }, [searchKeyword, allProducts, activeTab]);

  const handleSearch = (keyword) => setSearchKeyword(keyword);

  /* ========== 加入購物車（一般用 calculatedPrice；贈品額度用原價） ========== */
  const addToCart = (item) => {

    const isGift = item.isGift || false;

    if (isGift) {
      const existingGiftItemIndex = cartItems.findIndex(
        (cartItem) =>
          (cartItem.productId ?? cartItem.id) === (item.productId ?? item.id) &&
          cartItem.isGift
      );

      const quota = getGiftQuota();
      const currentGiftSum = calcGiftValue(cartItems);
      const original = Number(
        item.originalPrice ?? item.price ?? item.calculatedPrice ?? 0
      );
      const addValue = original;

      if (quota >= 0 && currentGiftSum + addValue > quota) {
        const remain = Math.max(0, quota - currentGiftSum);
        Swal.fire({
          icon: "warning",
          title: "贈送額度不足",
          text: `本月剩餘額度 $${remain}，此商品原價 $${addValue}，已超過可用額度。`,
        });
        return;
      }

      if (existingGiftItemIndex >= 0) {
        const updated = [...cartItems];
        updated[existingGiftItemIndex].quantity += 1;
        setCartItems(updated);
      } else {
        const giftProduct = {
          ...item,
          productId: item.productId ?? item.id,
          quantity: 1,
          unitPrice: 0,
          originalPrice: Number(item.price ?? 0), // 額度用原價
          isGift: true,
          __dealerPrice: num(
            item.__dealerPrice ?? pickPriceGeneral(item).price
          ),
          __storePrice: num(
            item.__storePrice ?? pickPriceStoreOnly(item).price
          ),
        };
        setCartItems((prev) => [...prev, giftProduct]);
      }
    } else {
      const existingIndex = cartItems.findIndex(
        (cartItem) =>
          (cartItem.productId ?? cartItem.id) === (item.productId ?? item.id) &&
          !cartItem.isGift
      );

      const finalUnitPrice = Number(item.calculatedPrice ?? item.price ?? 0);

      if (existingIndex >= 0) {
        const updated = [...cartItems];
        updated[existingIndex].quantity += 1;
        setCartItems(updated);
      } else {
        const regularProduct = {
          ...item,
          productId: item.productId ?? item.id,
          quantity: 1,
          unitPrice: finalUnitPrice,
          isGift: false,
          __dealerPrice: num(
            item.__dealerPrice ?? pickPriceGeneral(item).price
          ),
          __storePrice: num(
            item.__storePrice ?? pickPriceStoreOnly(item).price
          ),
        };
        setCartItems((prev) => [...prev, regularProduct]);
      }
    }
  };

  /* ========== 更新數量（贈品加量判斷仍用原價） ========== */
  const updateQuantity = (id, quantity, forceAdd = false, fullItem = null) => {
    if (id === "__CLEAR__") {
      setCartItems([]);
      return;
    }
    setCartItems((prev) => {
      const exist = prev.find((item) => (item.productId ?? item.id) === id);
      if (quantity <= 0) {
        return prev.filter((item) => (item.productId ?? item.id) !== id);
      }
      if (exist) {
        // 贈品加量需檢查額度
        if (exist.isGift && quantity > Number(exist.quantity ?? 1)) {
          const quota = getGiftQuota();
          const currentGiftSum = calcGiftValue(prev);
          const price = Number(
            exist.originalPrice ?? exist.price ?? exist.calculatedPrice ?? 0
          );
          const addQty = quantity - Number(exist.quantity ?? 1);
          const addValue = price * addQty;
          if (quota >= 0 && currentGiftSum + addValue > quota) {
            const remain = Math.max(0, quota - currentGiftSum);
            Swal.fire({
              icon: "warning",
              title: "贈送額度不足",
              text: `本月剩餘額度 $${remain}，加量將新增 $${addValue}，已超過可用額度。`,
            });
            return prev;
          }
        }
        return prev.map((item) =>
          (item.productId ?? item.id) === id ? { ...item, quantity } : item
        );
      }
      if (forceAdd && fullItem) {
        return [
          ...prev,
          {
            ...fullItem,
            quantity,
            unitPrice: Number(fullItem.calculatedPrice ?? fullItem.price ?? 0),
            __dealerPrice: num(
              fullItem.__dealerPrice ?? pickPriceGeneral(fullItem).price
            ),
            __storePrice: num(
              fullItem.__storePrice ?? pickPriceStoreOnly(fullItem).price
            ),
          },
        ];
      }
      return prev;
    });
  };

  // ========== 結帳後/回首頁：會員點數自動刷新 ==========
  useEffect(() => {
    let channel;

    const fetchMemberSummaryByIdNoCache = async (id) => {
      if (!id) return null;
      const res = await axios.get(`${API_BASE}/t_Member/MemberSummary/${id}`, {
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
        params: { ts: Date.now() }, // 破快取
      });
      return res.data || null;
    };

    const maybeRefreshMemberPoints = async () => {
      try {
        const midFromFlag = Number(
          localStorage.getItem("member_points_refresh_id") || 0
        );
        const cid = Number(currentMember?.id ?? currentMember?.memberId ?? 0);
        const id = midFromFlag || cid;
        if (!id) return;

        const summary = await fetchMemberSummaryByIdNoCache(id);
        if (summary) {
          setCurrentMember((prev) => {
            const merged = mergeMemberSummary(prev, summary);
            localStorage.setItem("currentMember", JSON.stringify(merged));
            return merged;
          });
        }
        localStorage.removeItem("member_points_refresh_id");
      } catch (e) {
        console.warn("refresh MemberSummary 失敗", e);
      }
    };

    // A) 進到首頁就先刷新一次（若有 currentMember）
    if (currentMember?.id || currentMember?.memberId) {
      maybeRefreshMemberPoints();
    }

    // B) 視窗獲得焦點時也刷新（避免漏抓）
    const onFocus = () => maybeRefreshMemberPoints();
    window.addEventListener("focus", onFocus);

    // C) checkout 廣播 / localStorage 旗標 觸發刷新
    if ("BroadcastChannel" in window) {
      channel = new BroadcastChannel("pos-events");
      channel.onmessage = (ev) => {
        if (ev?.data?.type === "checkout_done") {
          maybeRefreshMemberPoints();
        }
      };
    }

    const onStorage = (e) => {
      if (e.key === "checkout_done" || e.key === "member_points_refresh_id") {
        maybeRefreshMemberPoints();
      }
    };
    window.addEventListener("storage", onStorage);

    return () => {
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("storage", onStorage);
      if (channel) channel.close();
    };
  }, [currentMember?.id, currentMember?.memberId, setCurrentMember]);

  /* ========== 結帳後：贈送額度重抓 ========== */
  useEffect(() => {
    if (activeTab === "贈送" && localStorage.getItem("checkout_done")) {
      refetchGiftAmount?.();
      localStorage.removeItem("checkout_done");
    }
  }, [activeTab, refetchGiftAmount]);

  /* ========== 結帳 ========== */
  const canCheckout = useMemo(
    () =>
      Array.isArray(cartItems) &&
      cartItems.some((i) => Number(i?.quantity) > 0),
    [cartItems]
  );

  // ★ 新增：從結帳返回首頁時，自動還原購物車草稿
  useEffect(() => {
    const flag = localStorage.getItem("restoreCartFlag");
    if (flag === "1") {
      try {
        const raw = localStorage.getItem("cartDraft");
        if (raw) {
          const draft = JSON.parse(raw);
          if (Array.isArray(draft.cartItems)) setCartItems(draft.cartItems);
          if (draft.cartSummary) setCartSummary(draft.cartSummary);
          if (typeof draft.activeTab === "string")
            setActiveTab(draft.activeTab);
          // ⚠️ 不覆蓋 isGuideSelf，避免把正確選擇沖掉
          // 只在完全沒有任何記錄時才作為最後備援（通常不會發生）
          const saved = localStorage.getItem("checkout_payer");
          if (!saved && typeof draft.isGuideSelf === "boolean") {
            setIsGuideSelf(draft.isGuideSelf);
          }
          if (typeof draft.selectedCategoryId !== "undefined")
            setSelectedCategoryId(draft.selectedCategoryId);
          if (typeof draft.searchKeyword === "string")
            setSearchKeyword(draft.searchKeyword);
        }
      } catch {}
      // 只在「返回修改」時還原一次，避免每次打開首頁都套用舊草稿
      localStorage.removeItem("restoreCartFlag");
      // 若你希望回來就丟棄草稿，可一併移除：
      // localStorage.removeItem("cartDraft");
    }
  }, []);

  const handleCheckout = () => {
    if (!canCheckout) {
      Swal.fire({
        icon: "info",
        title: "購物車是空的",
        text: "請先加入商品再結帳。",
        confirmButtonText: "了解",
      });
      return;
    }
    const buyerType =
      currentMember?.buyerType ??
      (currentMember?.memberType === "導遊"
        ? 1
        : currentMember?.memberType === "經銷商"
        ? 2
        : 0);

    const normalizedMember = {
      id: currentMember?.id ?? currentMember?.memberId ?? 0,
      fullName: currentMember?.fullName ?? currentMember?.name ?? "",
      contactPhone:
        currentMember?.contactPhone ??
        currentMember?.phone ??
        currentMember?.mobile ??
        "",
      contactAddress:
        currentMember?.contactAddress ?? currentMember?.address ?? "",
      memberType: currentMember?.memberType ?? "",

      // ★ 關鍵：把這些都帶到 checkout
      buyerType,
      subType:
        currentMember?.subType ??
        (buyerType === 1 ? "導遊" : buyerType === 2 ? "廠商" : ""),
      isSelfCredit: !!(
        currentMember?.isSelfCredit ?? currentMember?.IsSelfCredit
      ),
      isGuestCredit: !!(
        currentMember?.isGuestCredit ?? currentMember?.IsGuestCredit
      ),

      discountRate: currentMember?.discountRate ?? 1,
      isDistributor: !!currentMember?.isDistributor,

      // 這個只是資訊用，不作為最終判斷依據
      creditEligible: currentMember?.isDistributor
        ? isGuideSelf
          ? !!currentMember?.isSelfCredit
          : !!currentMember?.isGuestCredit
        : false,

      distributorId: currentMember?.distributorId ?? null,
    };

    const items = cartItems.map((i) => ({
      id: i.id ?? i.productId,
      productId: i.productId ?? i.id,
      name: i.name,
      unitPrice: Number(i.unitPrice ?? i.calculatedPrice ?? i.price ?? 0),
      originalPrice: Number(
        i.originalPrice ?? i.price ?? i.unitPrice ?? i.msrp ?? 0
      ),
      quantity: Number(i.quantity ?? 1),
      isGift: !!i.isGift,
      __dealerPrice: num(i.__dealerPrice),
      __storePrice: num(i.__storePrice),
      distributorPrice: num(i.distributorPrice),
      levelPrice: num(i.levelPrice),
      storePrice: num(i.storePrice),
      price: num(i.price),
    }));

    const payloadForCheckout = {
      items,
      member: normalizedMember,
      subtotal: Number(cartSummary.subtotal ?? 0),
      usedPoints: Number(cartSummary.usedPoints ?? 0),
      finalTotal: Number(cartSummary.finalTotal ?? 0),
      isGuideSelf, // true=導遊本人；false=客人
      checkoutPayer: isGuideSelf ? "GUIDE_SELF" : "CUSTOMER",
    };

    localStorage.setItem("checkoutData", JSON.stringify(payloadForCheckout));

    // ★ 新增：存購物車草稿與還原旗標
    localStorage.setItem(
      "cartDraft",
      JSON.stringify({
        cartItems, // 原本購物車（含贈品與單價）
        cartSummary, // 小計/折抵/總計
        activeTab, // 回來時維持分頁
        isGuideSelf, // 導遊身份
        selectedCategoryId, // 產品分類時的選取
        searchKeyword, // 目前搜尋字
      })
    );
    localStorage.setItem("restoreCartFlag", "1");

    // 進結帳前，把身份選擇確實寫回 localStorage（避免中途被覆蓋）
    try {
      localStorage.setItem(
        "checkout_payer",
        isGuideSelf ? "guide" : "customer"
      );
    } catch {}
    navigate("/checkout");
  };

  if (isError) return <p>錯誤：{error?.message || "讀取產品失敗"}</p>;

  return (
    <div className="container-fluid">
      <div className="row">
        {/* 左側：購物車 */}
        <div className="col-5">
          <Cart
            items={cartItems}
            updateQuantity={updateQuantity}
            currentMember={currentMember}
            setCurrentMember={handleMemberUpdate}
            onCartSummaryChange={setCartSummary}
            stockMap={allProducts.reduce((acc, p) => {
              acc[p.productId ?? p.id] = p.nowStock ?? 9999;
              return acc;
            }, {})}
            isGuideSelf={isGuideSelf}
            setIsGuideSelf={setIsGuideSelf}
            canCheckout={canCheckout}
          />
        </div>

        {/* 右側：商品區 */}
        <div className="col-7">
          <Navbar
            activeTab={activeTab}
            setActiveTab={(tab) => {
              setActiveTab(tab);
              setSelectedCategoryId(null);
              setSearchKeyword("");
            }}
            onSearch={setSearchKeyword}
            suggestions={filteredSuggestions}
          />

          {activeTab === "熱銷排行" && (
            <CardTable
              products={displayedProducts}
              addToCart={addToCart}
              cartItems={cartItems}
              usedPoints={cartSummary.usedPoints}
              currentMember={currentMember}
              onCheckout={handleCheckout}
              isGuideSelf={isGuideSelf}
            />
          )}

          {activeTab === "新品排行" && (
            <NewArrivalTable
              products={displayedProducts}
              addToCart={addToCart}
              cartItems={cartItems}
              usedPoints={cartSummary.usedPoints}
              onCheckout={handleCheckout}
              currentMember={currentMember}
              isGuideSelf={isGuideSelf}
            />
          )}

          {activeTab === "產品分類" && (
            <CategoryProductTable
              products={displayedProducts}
              addToCart={addToCart}
              cartItems={cartItems}
              usedPoints={cartSummary.usedPoints}
              onCheckout={handleCheckout}
              currentMember={currentMember}
              isGuideSelf={isGuideSelf}
              categories={categories}
              setSelectedCategoryId={setSelectedCategoryId}
              selectedCategoryId={selectedCategoryId}
            />
          )}

          {activeTab === "贈送" && (
            <GiftTable
              products={displayedProducts}
              addToCart={addToCart}
              cartItems={cartItems}
              giftQuota={getGiftQuota()}
              isLoadingQuota={isFetchingGift}
              onCheckout={handleCheckout}
            />
          )}
        </div>
      </div>
    </div>
  );
}
