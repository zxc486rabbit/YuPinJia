import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import Swal from "sweetalert2";
import { useEmployee } from "./utils/EmployeeContext";
import axios from "axios";
import Cart from "./components/Cart";
import Navbar from "./components/Navbar";
import CardTable from "./components/CardTable";
import NewArrivalTable from "./components/NewArrivalTable";
import GiftTable from "./components/GiftTable";
import CategoryProductTable from "./components/CategoryProductTable";

// API：根據 searchType 或 categoryId 查詢產品資料
const fetchProductsBySearchType = async (searchType, categoryId) => {
  const url =
    searchType === 5
      ? `https://yupinjia.hyjr.com.tw/api/api/t_Product?categoryId=${categoryId}`
      : `https://yupinjia.hyjr.com.tw/api/api/t_Product?searchType=${searchType}`;
  const res = await axios.get(url);
  console.log("API 返回的資料：", res.data); // 這裡可以檢查是否有 isGift 屬性
  return res.data;
};

// API：查詢分類資料
const fetchCategories = async () => {
  const res = await axios.get(
    "https://yupinjia.hyjr.com.tw/api/api/t_Category"
  );
  return res.data;
};

export default function Home() {
  // 從登入後的 Context 取得 userInfo（含 giftAmount）
  const { currentUser, refreshUserInfo } = useEmployee() || {};
  const employeeUser = currentUser?.user; // 轉成你後續沿用的變數

  const [activeTab, setActiveTab] = useState("熱銷排行"); // 當前選擇的分類
  const [cartItems, setCartItems] = useState([]); // 購物車中的商品
  const [currentMember, setCurrentMember] = useState(null); // 當前會員
  const [searchType, setSearchType] = useState(1); // 查詢的產品類型
  const [selectedCategoryId, setSelectedCategoryId] = useState(null); // 選擇的分類 ID
  const [isGuideSelf, setIsGuideSelf] = useState(false); // 是否是導遊本人結帳
  const [searchKeyword, setSearchKeyword] = useState(""); // 搜尋關鍵字
  const [cartSummary, setCartSummary] = useState({
    subtotal: 0, // 小計
    usedPoints: 0, // 使用的點數
    finalTotal: 0, // 最終總金額
  });

  const navigate = useNavigate();

  // 取得本次可用贈送額度（先用 monthRemainGift 沒有再用giftAmount
  const getGiftQuota = () => {
    const remain = Number(employeeUser?.monthRemainGift);
    const init = Number(employeeUser?.giftAmount);
    // 以剩餘額度優先；若後端尚未提供剩餘，退而用初始額度
    return Number.isFinite(remain) && remain >= 0
      ? remain
      : Number.isFinite(init)
      ? init
      : 0;
  };

  // 計算目前購物車「已選贈品」按原價合計的金額
  const calcGiftValue = (items) =>
    (items || [])
      .filter((i) => i.isGift)
      .reduce((sum, i) => {
        const price = Number(i.originalPrice ?? i.price ?? i.unitPrice ?? 0);
        const qty = Number(i.quantity ?? 1);
        return sum + price * qty;
      }, 0);

  // 監控 currentMember 更新，這樣我們可以在更新後執行其他操作
  useEffect(() => {
    if (currentMember) {
      console.log("currentMember 已更新:", currentMember);
      // 可以在這裡執行其他與 currentMember 更新後相關的操作
    }
  }, [currentMember]); // 依賴 currentMember 的變化

  const handleMemberUpdate = (member) => {
    setCurrentMember(member);
    localStorage.setItem("currentMember", JSON.stringify(member));
  };

  // 載入 localStorage 中的會員資料
  const memberInitRef = useRef(false);
  useEffect(() => {
    if (memberInitRef.current) return;

    const stored = localStorage.getItem("currentMember");
    if (stored) {
      try {
        const storedMember = JSON.parse(stored);
        setCurrentMember(storedMember); // 更新會員資料
      } catch (e) {
        console.error("載入會員失敗", e);
      }
    }

    memberInitRef.current = true;
  }, []);

  useEffect(() => {
    if (activeTab === "贈送") {
      refreshUserInfo().catch(() => {});
    }
  }, [activeTab]);

  // 讀取：一進頁把身份載回來（導遊/客人）
  useEffect(() => {
    const saved = localStorage.getItem("checkout_payer");
    if (saved === "guide") setIsGuideSelf(true);
    if (saved === "customer") setIsGuideSelf(false);
  }, []);

  // 寫入：只要身份有變，就同步到 localStorage
  useEffect(() => {
    localStorage.setItem("checkout_payer", isGuideSelf ? "guide" : "customer");
  }, [isGuideSelf]);

  useEffect(() => {
    console.log("currentMember 已更新:", currentMember);
    // 你可以在這裡執行其他與會員資料更新相關的邏輯
  }, [currentMember]); // 當 currentMember 更新時觸發

  // ➤ 根據 tab 切換設定查詢類型
  useEffect(() => {
    switch (activeTab) {
      case "熱銷排行":
        setSearchType(1); // 熱銷排行
        break;
      case "新品排行":
        setSearchType(2); // 新品排行
        break;
      case "贈送":
        setSearchType(3); // 贈送
        break;
      case "產品分類":
        setSearchType(5); // 產品分類
        break;
      default:
        setSearchType(1); // 預設為熱銷排行
    }
  }, [activeTab]);

  // ➤ 查詢分類資料
  const { data: categories = [] } = useQuery({
    queryKey: ["categories"],
    queryFn: fetchCategories,
  });

  // ➤ 查詢產品資料
  const {
    data: allProducts = [],
    isError,
    error,
  } = useQuery({
    queryKey: ["products", searchType, selectedCategoryId],
    queryFn: () => fetchProductsBySearchType(searchType, selectedCategoryId),
    enabled:
      searchType !== null && (searchType !== 5 || selectedCategoryId !== null),
    keepPreviousData: true,
    staleTime: 1000 * 60 * 5, // 5分鐘內不重抓
  });

  // ➤ 搜尋建議（使用 useMemo 優化）
  const filteredSuggestions = useMemo(() => {
    if (!searchKeyword || !allProducts.length) return [];
    const keyword = searchKeyword.toLowerCase();
    return allProducts.filter(
      (p) =>
        p.name.toLowerCase().includes(keyword) ||
        p.productNumber?.toLowerCase().includes(keyword)
    );
  }, [searchKeyword, allProducts]);

  // ➤ 顯示的產品資料
  const displayedProducts = useMemo(() => {
    let filtered = [...allProducts];
    if (searchKeyword) {
      const keyword = searchKeyword.toLowerCase();
      filtered = filtered.filter(
        (p) =>
          p.name.toLowerCase().includes(keyword) ||
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

  const handleSearch = (keyword) => {
    setSearchKeyword(keyword);
  };

  const addToCart = (item) => {
    if (!currentMember) {
      alert("請先登入會員再加入購物車");
      return;
    }

    // 設置贈品商品標記
    const isGift = item.isGift || false;

    // 根據是否為贈品進行處理
    if (isGift) {
      // 如果是贈品，將其加入贈品列表
      const existingGiftItemIndex = cartItems.findIndex(
        (cartItem) =>
          (cartItem.productId ?? cartItem.id) === (item.productId ?? item.id) &&
          cartItem.isGift
      );

      // 以「商品原價」計入額度
      const quota = getGiftQuota(); // 例如 1000
      const currentGiftSum = calcGiftValue(cartItems); // 目前已選贈品(原價*數量)合計
      const addValue = Number(item.price ?? item.unitPrice ?? 0); // 本次要新增的那一件原價

      // 額度檢查（quota=0 代表沒有額度，第一件就會超標）
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
        // 如果贈品已存在，增加數量
        const updatedCartItems = [...cartItems];
        updatedCartItems[existingGiftItemIndex].quantity += 1; // 增加數量
        setCartItems(updatedCartItems); // 更新購物車
      } else {
        // 如果贈品不在購物車中，新增該商品
        const giftProduct = {
          ...item,
          productId: item.productId ?? item.id, // 統一使用 productId
          quantity: 1,
          unitPrice: 0, // 贈品價格顯示設為 0
          originalPrice: Number(item.price ?? 0), // ← 存原價用來算額度
          isGift: true, // 設置 isGift 為 true
        };
        setCartItems((prev) => [...prev, giftProduct]); // 添加新贈品
      }
    } else {
      // 如果是普通商品，將其加入常規商品列表
      const existingItemIndex = cartItems.findIndex(
        (cartItem) => cartItem.productId === item.productId && !cartItem.isGift
      );

      if (existingItemIndex >= 0) {
        // 如果商品已經存在，更新數量
        const updatedCartItems = [...cartItems];
        updatedCartItems[existingItemIndex].quantity += 1; // 增加數量
        setCartItems(updatedCartItems); // 更新購物車
      } else {
        // 如果商品不在購物車中，新增商品
        const regularProduct = {
          ...item,
          productId: item.productId ?? item.id, // 統一使用 productId
          quantity: 1,
          unitPrice: parseFloat(item.price ?? 0), // 常規商品價格
          isGift: false, // 設置 isGift 為 false
        };
        setCartItems((prev) => [...prev, regularProduct]); // 添加常規商品
      }
    }
  };

  const updateQuantity = (id, quantity, forceAdd = false, fullItem = null) => {
    if (id === "__CLEAR__") {
      setCartItems([]);
      return;
    }
    setCartItems((prev) => {
      const exist = prev.find((item) => (item.productId ?? item.id) === id);
      if (quantity <= 0) {
        return prev.filter((item) => item.productId !== id);
      }
      if (exist) {
        // 若是贈品且在「加量」，要做額度檢查
        if (exist.isGift && quantity > Number(exist.quantity ?? 1)) {
          const quota = getGiftQuota();
          const currentGiftSum = calcGiftValue(prev);
          const price = Number(exist.originalPrice ?? exist.price ?? 0);
          const addQty = quantity - Number(exist.quantity ?? 1);
          const addValue = price * addQty;
          if (quota >= 0 && currentGiftSum + addValue > quota) {
            const remain = Math.max(0, quota - currentGiftSum);
            Swal.fire({
              icon: "warning",
              title: "贈送額度不足",
              text: `本月剩餘額度 $${remain}，加量將新增 $${addValue}，已超過可用額度。`,
            });
            // 拒絕加量，維持原數量
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
            unitPrice: parseFloat(fullItem.price ?? 0),
          },
        ];
      }
      return prev;
    });
  };

  // 允許結帳的條件（最保險：有任一數量 > 0 的項目）
  const canCheckout = useMemo(
    () =>
      Array.isArray(cartItems) &&
      cartItems.some((i) => Number(i?.quantity) > 0),
    [cartItems]
  );

  const handleCheckout = () => {
    // 防呆：購物車空的時候禁止結帳
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
        currentMember?.contactPhone ??
        currentMember?.phone ??
        currentMember?.mobile ??
        "",
      // 若 Cart 還沒把 discountRate 設好，就用身份預設（導遊 0.9 / 客人 1）
      discountRate: currentMember?.discountRate ?? (isGuideSelf ? 0.9 : 1),
      subType: currentMember?.subType ?? "",
    };
    const items = cartItems.map((i) => ({
      // 給 CheckoutFlow/DB 用到的識別
      id: i.id ?? i.productId,
      productId: i.productId ?? i.id,

      // 顯示
      name: i.name,

      // UI 顯示價（贈品這裡是 0）
      unitPrice: Number(i.unitPrice ?? i.price ?? 0),

      // ★★ 重要：原價一定要帶過去（贈品會用到）
      originalPrice: Number(
        i.originalPrice ?? i.price ?? i.unitPrice ?? i.msrp ?? 0
      ),

      // 其他
      quantity: Number(i.quantity ?? 1),
      isGift: !!i.isGift,
    }));

    const payloadForCheckout = {
      items,
      member: normalizedMember,
      subtotal: Number(cartSummary.subtotal ?? 0),
      usedPoints: Number(cartSummary.usedPoints ?? 0),
      finalTotal: Number(cartSummary.finalTotal ?? 0),
      // ✅ 多帶這兩個欄位，結帳頁就知道身份
      isGuideSelf,
      checkoutPayer: isGuideSelf ? "GUIDE_SELF" : "CUSTOMER",
    };

    localStorage.setItem("checkoutData", JSON.stringify(payloadForCheckout));
    navigate("/checkout");
  };

  if (isError) return <p>錯誤：{error.message}</p>;

  return (
    <div className="container-fluid">
      <div className="row">
        <div className="col-5">
          <Cart
            items={cartItems}
            updateQuantity={updateQuantity}
            currentMember={currentMember}
            setCurrentMember={handleMemberUpdate}
            onCheckoutClick={handleCheckout}
            onCartSummaryChange={setCartSummary}
            stockMap={allProducts.reduce((acc, p) => {
              acc[p.productId] = p.nowStock ?? 9999;
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
            onSearch={handleSearch}
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
              currentMember={currentMember}
              isGuideSelf={isGuideSelf}
              onCheckout={handleCheckout}
            />
          )}
        </div>
      </div>
    </div>
  );
}
