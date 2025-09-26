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
   價格規則與 URL 工具
========================= */

// 通用數字安全轉換
const num = (v) => {
  const n = Number(v);
  return Number.isFinite(n) ? n : 0;
};

// 經銷 > 等級 > 門市 > 原價
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

// 門市 > 原價（導遊帳號之客人結帳時用）
const pickPriceStoreOnly = (p) => {
  const candidates = [
    { key: "store", value: num(p.storePrice) },
    { key: "product", value: num(p.price) },
  ];
  const first =
    candidates.find((c) => c.value > 0) || candidates[candidates.length - 1];
  return { price: first.value, source: first.key };
};

// 依身份決定實際用價
const pickPriceForPayer = (p, currentMember, isGuideSelf) => {
  const isGuideAccount =
    currentMember?.subType === "導遊" || currentMember?.buyerType === 1;
  if (isGuideAccount && !isGuideSelf) {
    // 導遊帳號 → 客人結帳 → 門市/原價
    return pickPriceStoreOnly(p);
  }
  // 其餘 → 經銷 > 等級 > 門市 > 原價
  return pickPriceGeneral(p);
};

// 組產品查詢 URL（支援 searchType / categoryId / memberId）
const buildProductUrl = (searchType, categoryId, memberId) => {
  const base = "https://yupinjia.hyjr.com.tw/api/api/t_Product";
  const params = new URLSearchParams();
  if (searchType === 5) {
    if (categoryId == null) return null;
    params.set("categoryId", String(categoryId));
  } else {
    params.set("searchType", String(searchType));
  }
  if (memberId != null) params.set("memberId", String(memberId));
  return `${base}?${params.toString()}`;
};

/* =========================
   後端請求
========================= */

const fetchProductsBySearchType = async (searchType, categoryId, memberId) => {
  const url = buildProductUrl(searchType, categoryId, memberId);
  if (!url) return [];
  const res = await axios.get(url);
  return res.data || [];
};

const fetchCategories = async () => {
  const res = await axios.get("https://yupinjia.hyjr.com.tw/api/api/t_Category");
  return res.data || [];
};

export default function Home() {
  const { currentUser } = useEmployee() || {};
  const employeeUser = currentUser?.user;
  const queryClient = useQueryClient();

  const [activeTab, setActiveTab] = useState("熱銷排行");
  const [cartItems, setCartItems] = useState([]);
  const [currentMember, setCurrentMember] = useState(null);
  const [searchType, setSearchType] = useState(1);
  const [selectedCategoryId, setSelectedCategoryId] = useState(null);
  const [isGuideSelf, setIsGuideSelf] = useState(false); // true=導遊本人；false=客人
  const [searchKeyword, setSearchKeyword] = useState("");
  const [cartSummary, setCartSummary] = useState({
    subtotal: 0,
    usedPoints: 0,
    finalTotal: 0,
  });

  const navigate = useNavigate();

  const calcGiftValue = (items) =>
    (items || [])
      .filter((i) => i.isGift)
      .reduce((sum, i) => {
        const price = Number(i.originalPrice ?? i.price ?? i.unitPrice ?? 0);
        const qty = Number(i.quantity ?? 1);
        return sum + price * qty;
      }, 0);

  /* ========== 會員載入與同步 ========== */
  const handleMemberUpdate = (member) => {
    setCurrentMember(member);
    localStorage.setItem("currentMember", JSON.stringify(member));
  };

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

  // 讀取上次身份（導遊本人/客人）
  useEffect(() => {
    const saved = localStorage.getItem("checkout_payer");
    if (saved === "guide") setIsGuideSelf(true);
    if (saved === "customer") setIsGuideSelf(false);
  }, []);
  useEffect(() => {
    localStorage.setItem("checkout_payer", isGuideSelf ? "guide" : "customer");
  }, [isGuideSelf]);

  /* ========== Tab → searchType ========== */
  useEffect(() => {
    switch (activeTab) {
      case "熱銷排行":
        setSearchType(1);
        break;
      case "新品排行":
        setSearchType(2);
        break;
      case "贈送":
        setSearchType(3);
        break;
      case "產品分類":
        setSearchType(5);
        break;
      default:
        setSearchType(1);
    }
  }, [activeTab]);

  /* ========== 取得分類 ========== */
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  /* ========== 贈送額度（員工） ========== */
  const staffId = employeeUser?.id ?? employeeUser?.staffId ?? null;
  const {
    data: giftAmountData,
    refetch: refetchGiftAmount,
    isFetching: isFetchingGift,
  } = useQuery({
    queryKey: ["staffGiftAmount", staffId],
    enabled: activeTab === "贈送" && !!staffId,
    queryFn: async () => {
      const res = await axios.get(
        `https://yupinjia.hyjr.com.tw/api/api/t_Staff/GetGiftAmount/${staffId}`,
        { headers: { "Cache-Control": "no-cache", Pragma: "no-cache" }, params: { ts: Date.now() } }
      );
      const val = Number(res.data?.monthRemainGift);
      return Number.isFinite(val) ? val : 0;
    },
    staleTime: 0,
    cacheTime: 0,
    refetchOnWindowFocus: true,
    refetchOnReconnect: true,
  });
  const getGiftQuota = () => (typeof giftAmountData === "number" ? giftAmountData : 0);

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
    queryFn: () => fetchProductsBySearchType(searchType, selectedCategoryId, memberId),
    enabled: searchType !== null && (searchType !== 5 || selectedCategoryId !== null),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5,
  });

  // ✅ 注入實際用價（依身份決定來源），以及基準價（回扣計算會用）
  const allProducts = useMemo(() => {
    return (rawProducts || []).map((p) => {
      const dealerPick = pickPriceGeneral(p);
      const storePick = pickPriceStoreOnly(p);
      const { price: calculatedPrice, source } = pickPriceForPayer(p, currentMember, isGuideSelf);
      return {
        ...p,
        productId: p.productId ?? p.id,
        calculatedPrice,
        _priceSource: source, // distributor | level | store | product
        __dealerPrice: num(dealerPick.price),  // 經銷鏈的最終用價
        __storePrice: num(storePick.price),    // 門市鏈的最終用價
      };
    });
  }, [rawProducts, currentMember, isGuideSelf]);

  /* ========== 切換導遊本人/客人 → 重估購物車內單價（非贈品） ========== */
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
      return [...filtered].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    }
    return filtered;
  }, [searchKeyword, allProducts, activeTab]);

  const handleSearch = (keyword) => setSearchKeyword(keyword);

  /* ========== 加入購物車（一般用 calculatedPrice；贈品額度用原價） ========== */
  const addToCart = (item) => {
    if (!currentMember) {
      alert("請先登入會員再加入購物車");
      return;
    }

    const isGift = item.isGift || false;

    if (isGift) {
      const existingGiftItemIndex = cartItems.findIndex(
        (cartItem) =>
          (cartItem.productId ?? cartItem.id) === (item.productId ?? item.id) &&
          cartItem.isGift
      );

      const quota = getGiftQuota();
      const currentGiftSum = calcGiftValue(cartItems);
      const original = Number(item.originalPrice ?? item.price ?? item.calculatedPrice ?? 0);
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
          __dealerPrice: num(item.__dealerPrice ?? pickPriceGeneral(item).price),
          __storePrice: num(item.__storePrice ?? pickPriceStoreOnly(item).price),
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
          __dealerPrice: num(item.__dealerPrice ?? pickPriceGeneral(item).price),
          __storePrice: num(item.__storePrice ?? pickPriceStoreOnly(item).price),
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
          const price = Number(exist.originalPrice ?? exist.price ?? exist.calculatedPrice ?? 0);
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
            __dealerPrice: num(fullItem.__dealerPrice ?? pickPriceGeneral(fullItem).price),
            __storePrice: num(fullItem.__storePrice ?? pickPriceStoreOnly(fullItem).price),
          },
        ];
      }
      return prev;
    });
  };

  // 結帳後重抓贈送額度
  useEffect(() => {
    if (activeTab === "贈送" && localStorage.getItem("checkout_done")) {
      refetchGiftAmount();
      localStorage.removeItem("checkout_done");
    }
  }, [activeTab, refetchGiftAmount]);

  /* ========== 結帳 ========== */
  const canCheckout = useMemo(
    () => Array.isArray(cartItems) && cartItems.some((i) => Number(i?.quantity) > 0),
    [cartItems]
  );

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
    const normalizedMember = {
      id: currentMember?.id ?? currentMember?.memberId ?? 0,
      fullName: currentMember?.fullName ?? currentMember?.name ?? "",
      contactPhone:
        currentMember?.contactPhone ?? currentMember?.phone ?? currentMember?.mobile ?? "",
      contactAddress: currentMember?.contactAddress ?? currentMember?.address ?? "",
      subType: currentMember?.subType ?? "",
      discountRate: currentMember?.discountRate ?? 1,
      creditEligible:
        currentMember?.isDistributor
          ? isGuideSelf
            ? !!currentMember?.isSelfCredit
            : !!currentMember?.isGuestCredit
          : false,
      distributorId: currentMember?.distributorId ?? null,
    };

    // 把必要欄位塞入 checkoutData（包含每品基準價，供回扣計算）
    const items = cartItems.map((i) => ({
      id: i.id ?? i.productId,
      productId: i.productId ?? i.id,
      name: i.name,
      unitPrice: Number(i.unitPrice ?? i.calculatedPrice ?? i.price ?? 0),
      originalPrice: Number(i.originalPrice ?? i.price ?? i.unitPrice ?? i.msrp ?? 0),
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
    navigate("/checkout");
  };

  if (isError) return <p>錯誤：{error?.message || "讀取產品失敗"}</p>;

  return (
    <div className="container-fluid">
      <div className="row">
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
