// ./utils/EmployeeContext.jsx
import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import api, { setAuthHeader, refreshAccessToken, getTokens } from "./apiClient"; // 依你的專案路徑調整

const USERINFO_URL = "https://yupinjia.hyjr.com.tw/api/api/Account/userInfo";

const EmployeeContext = createContext();
export const useEmployee = () => useContext(EmployeeContext);

// 小工具：延遲
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const EmployeeProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null);
  const [orders, setOrders] = useState([]);
  const refreshTimerRef = useRef(null);

  // 重新抓一次 /Account/userInfo（破快取、帶權杖）
  // 回傳最新的 user（方便呼叫端判斷）
  const refreshUserInfo = async () => {
    try {
      const { accessToken } = getTokens();
      if (!accessToken) return null; // 尚未登入或已登出
      setAuthHeader(accessToken); // 保險：確保這次請求一定帶到 Authorization

      const res = await api.get(USERINFO_URL, {
        params: { ts: Date.now() }, // 破快取
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" }, // 再保險
      });

      const latestUser = res?.data?.user ?? null;

      setCurrentUser((prev) => {
        const merged = {
          ...(prev || {}),
          user: latestUser || prev?.user,
          privileges: res.data?.privileges || prev?.privileges,
        };
        // 若你有把 currentUser 存在 localStorage，也記得更新
        localStorage.setItem("currentUser", JSON.stringify(merged));
        return merged;
      });

      // 觀察用：你可在 DevTools 看到目前後端回來的 monthRemainGift
      console.log(
        "[refreshUserInfo] monthRemainGift =",
        latestUser?.monthRemainGift
      );

      return latestUser;
    } catch (e) {
      console.error("refreshUserInfo failed", e);
      return null;
    }
  };

  // 樂觀扣額：先把畫面的 monthRemainGift 扣掉本單使用額度，立即反映 UI
  // 回傳 { before, after }
  const optimisticGiftDeduct = (amount) => {
    const delta = Math.max(0, Number(amount) || 0);
    let before = 0;
    let after = 0;

    setCurrentUser((prev) => {
      if (!prev?.user) return prev;
      before = Number(
        prev.user.monthRemainGift ?? prev.user.giftAmount ?? 0
      );
      after = Math.max(0, before - delta);

      const merged = {
        ...prev,
        user: {
          ...prev.user,
          monthRemainGift: after, // 直接把 UI 顯示的剩餘額度扣掉
        },
      };

      localStorage.setItem("currentUser", JSON.stringify(merged));
      return merged;
    });

    console.log("[optimisticGiftDeduct] before:", before, "after:", after);
    return { before, after };
  };

  // 結帳後的「強制同步」：
  // 1) 先樂觀扣額（UI 立即更新）
  // 2) 嘗試 refresh token（若後端把額度放在 token claim，能拿到新 token）
  // 3) 最多重抓 6 次 /userInfo（每次間隔 400ms），直到後端值 ≤ 樂觀後的值（或次數用完）
  const syncGiftAfterOrder = async (usedGiftAmount) => {
    const { after: optimisticRemain } = optimisticGiftDeduct(usedGiftAmount);

    try {
      await refreshAccessToken().catch(() => {});
      // 最多重抓 6 次
      for (let i = 0; i < 6; i++) {
        const latestUser = await refreshUserInfo();
        if (latestUser) {
          const serverRemain = Number(latestUser.monthRemainGift ?? 0);
          // 只要後端回來的值「看起來不比樂觀值更大」（= 已落地或一致），就停止重試
          if (serverRemain <= optimisticRemain) break;
        }
        await sleep(400); // 給後端一些計算/落地的時間
      }
    } catch (e) {
      console.warn("syncGiftAfterOrder failed", e);
    }
  };

  // === Token 自動刷新計時器 ===
  const startRefreshTimer = () => {
    stopRefreshTimer();
    refreshTimerRef.current = setInterval(async () => {
      try {
        await refreshAccessToken();
      } catch (e) {
        console.error("Auto refresh failed:", e);
        // 若 refresh 失敗，多半是 refreshToken 過期 → 自動登出
        logout();
      }
    }, 14 * 60 * 1000 + 30 * 1000); // 每 14:30
  };

  const stopRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // App 初始：若 localStorage 有 accessToken，補上 Header 並啟動計時器
  useEffect(() => {
    const { accessToken } = getTokens();
    if (accessToken) {
      setAuthHeader(accessToken);
      startRefreshTimer();
      // 登入中 → 抓一次最新 userInfo
      refreshUserInfo().catch(() => {});
    }
    // 嘗試把上次登入資訊載回來
    const saved = localStorage.getItem("currentUser");
    if (saved) {
      try {
        setCurrentUser(JSON.parse(saved));
      } catch {}
    }
    return () => stopRefreshTimer();
  }, []);

  const login = (employee) => {
    setCurrentUser(employee);
    localStorage.setItem("currentUser", JSON.stringify(employee)); // 保存
    // 登入後重新掛上 Header & 啟動計時器
    const { accessToken } = getTokens();
    if (accessToken) {
      setAuthHeader(accessToken);
      startRefreshTimer();
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    // 清除交班的訂單資料
    setOrders([]);
    stopRefreshTimer();
    // 清理 token 與 axios header
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("accessTokenExpiredAt");
    localStorage.removeItem("refreshTokenExpiredAt");
    setAuthHeader(""); // 會移除 Authorization
  };

  const recordOrder = (order) => {
    setOrders((prevOrders) => [...prevOrders, order]);
  };

  const ctxValue = useMemo(
    () => ({
      currentUser,
      user: currentUser?.user,
      privileges: currentUser?.privileges,
      login,
      logout,
      recordOrder,
      refreshUserInfo,
      optimisticGiftDeduct,
      syncGiftAfterOrder,
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser]
  );

  return (
    <EmployeeContext.Provider value={ctxValue}>
      {children}
    </EmployeeContext.Provider>
  );
};
