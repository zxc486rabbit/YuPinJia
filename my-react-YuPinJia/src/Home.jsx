import { useState, useEffect, useMemo, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
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
  const [activeTab, setActiveTab] = useState("熱銷排行"); // 當前選擇的分類
  const [cartItems, setCartItems] = useState([]); // 購物車中的商品
  const [currentMember, setCurrentMember] = useState(null); // 當前會員
  const [members, setMembers] = useState([]); // 會員資料
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

   // 監控 currentMember 更新，這樣我們可以在更新後執行其他操作
  useEffect(() => {
  if (currentMember) {
    console.log("currentMember 已更新:", currentMember);
    // 可以在這裡執行其他與 currentMember 更新後相關的操作
  }
}, [currentMember]);  // 依賴 currentMember 的變化

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

  // ➤ 載入所有會員資料
  useEffect(() => {
    // 載入會員與經銷商資料並進行整合
    Promise.all([
      axios.get("https://yupinjia.hyjr.com.tw/api/api/t_Member"),
      axios.get("https://yupinjia.hyjr.com.tw/api/api/t_Distributor"),
    ])
      .then(([memberRes, distributorRes]) => {
        const memberList = memberRes.data;
        const distributorMap = {};
        distributorRes.data.forEach((d) => {
          distributorMap[d.memberId] = {
            isDistributor: true,
            buyerType: d.buyerType, // 確認會員是否為經銷商
          };
        });

        // 將經銷商資訊合併到每位會員中
        const merged = memberList.map((m) => ({
          ...m,
          isDistributor: distributorMap[m.id]?.isDistributor || false,
          buyerType: distributorMap[m.id]?.buyerType || null,
        }));

        setMembers(merged); // 更新會員資料
      })
      .catch((err) => console.error("載入會員與經銷資料失敗", err));
  }, []);
  

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
        (cartItem) => cartItem.productId === item.productId && cartItem.isGift
      );

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
          unitPrice: 0, // 贈品價格設為 0
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
      const exist = prev.find((item) => item.productId === id);
      if (quantity <= 0) {
        return prev.filter((item) => item.productId !== id);
      }
      if (exist) {
        return prev.map((item) =>
          item.productId === id ? { ...item, quantity } : item
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

  const handleCheckout = () => {
    const normalizedMember = {
      ...currentMember,
      phone: currentMember?.contactPhone ?? currentMember?.phone ?? "",
    };
    const checkoutPayload = {
      items: cartItems,
      member: normalizedMember,
      subtotal: cartSummary.subtotal,
      usedPoints: cartSummary.usedPoints,
      finalTotal: cartSummary.finalTotal,
    };
    localStorage.setItem("checkoutData", JSON.stringify(checkoutPayload));
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
            members={members}
            onCheckoutClick={handleCheckout}
            onCartSummaryChange={setCartSummary}
            stockMap={allProducts.reduce((acc, p) => {
              acc[p.productId] = p.nowStock ?? 9999;
              return acc;
            }, {})}
            isGuideSelf={isGuideSelf}
            setIsGuideSelf={setIsGuideSelf}
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
