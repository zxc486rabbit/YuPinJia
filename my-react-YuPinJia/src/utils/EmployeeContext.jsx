import React, {
  createContext,
  useContext,
  useState,
  useEffect,
  useRef,
  useMemo,
} from "react";
import api, { setAuthHeader, refreshAccessToken, getTokens } from "./apiClient";

const USERINFO_URL = "https://yupinjia.hyjr.com.tw/api/api/Account/userInfo";

const EmployeeContext = createContext();
export const useEmployee = () => useContext(EmployeeContext);

// sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 判斷過期時間（毫秒）；沒有提供就視為「暫時有效」以免開頁抖動
const isTimestampValid = (ts) => {
  if (!ts && ts !== 0) return true;
  const exp = Number(ts);
  if (Number.isNaN(exp)) return true;
  return Date.now() < exp;
};

export const EmployeeProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // { user, privileges? }
  const [orders, setOrders] = useState([]);
  const [hydrating, setHydrating] = useState(true);
  const refreshTimerRef = useRef(null);

  // 重新抓 /Account/userInfo
  const refreshUserInfo = async () => {
    try {
      const { accessToken } = getTokens();
      if (!accessToken) return null;
      setAuthHeader(accessToken);

      const res = await api.get(USERINFO_URL, {
        params: { ts: Date.now() },
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });

      const latestUser = res?.data?.user ?? res?.data ?? null;

      setCurrentUser((prev) => {
        const merged = {
          ...(prev || {}),
          user: latestUser || prev?.user || null,
          privileges: res?.data?.privileges ?? prev?.privileges ?? null,
        };
        localStorage.setItem("currentUser", JSON.stringify(merged));
        return merged;
      });

      return latestUser;
    } catch (e) {
      console.error("refreshUserInfo failed", e);
      return null;
    }
  };

  // 贈送額度：樂觀扣點
  const optimisticGiftDeduct = (amount) => {
    const delta = Math.max(0, Number(amount) || 0);
    let before = 0;
    let after = 0;

    setCurrentUser((prev) => {
      if (!prev?.user) return prev;
      before = Number(prev.user.monthRemainGift ?? prev.user.giftAmount ?? 0);
      after = Math.max(0, before - delta);
      const merged = { ...prev, user: { ...prev.user, monthRemainGift: after } };
      localStorage.setItem("currentUser", JSON.stringify(merged));
      return merged;
    });

    return { before, after };
  };

  const syncGiftAfterOrder = async (usedGiftAmount) => {
    const { after: optimisticRemain } = optimisticGiftDeduct(usedGiftAmount);
    try {
      await refreshAccessToken().catch(() => {});
      for (let i = 0; i < 6; i++) {
        const latestUser = await refreshUserInfo();
        if (latestUser) {
          const serverRemain = Number(latestUser.monthRemainGift ?? 0);
          if (serverRemain <= optimisticRemain) break;
        }
        await sleep(400);
      }
    } catch (e) {
      console.warn("syncGiftAfterOrder failed", e);
    }
  };

  // （可選）自動刷新計時器：預設關閉，避免看起來像「跳過登入」
  const startRefreshTimer = () => {
    stopRefreshTimer();
    refreshTimerRef.current = setInterval(async () => {
      try {
        await refreshAccessToken();
      } catch (e) {
        console.error("Auto refresh failed:", e);
        logout();
        if (typeof window !== "undefined") window.location.assign("/login");
      }
    }, 14 * 60 * 1000 + 30 * 1000);
  };
  const stopRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // 初始化：有 token 就先帶著去撈 userInfo（不自動 refresh）
  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem("currentUser");
        if (saved) {
          try { setCurrentUser(JSON.parse(saved)); } catch {}
        }

        const { accessToken } = getTokens();
        if (accessToken) {
          setAuthHeader(accessToken);
          // 不啟動 startRefreshTimer()，避免一開頁就無感續期
          await refreshUserInfo().catch(() => {});
        } else {
          // 沒 token → 確保乾淨
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("accessTokenExpiredAt");
          localStorage.removeItem("refreshTokenExpiredAt");
        }
      } finally {
        setHydrating(false);
      }
    })();

    return () => stopRefreshTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (employee) => {
    const normalized = employee?.user
      ? employee
      : { user: employee || null, privileges: employee?.privileges ?? null };

    setCurrentUser(normalized);
    localStorage.setItem("currentUser", JSON.stringify(normalized));

    const { accessToken } = getTokens();
    if (accessToken) {
      setAuthHeader(accessToken);
      // 需要長時間停留可再開：
      // startRefreshTimer();
    }
  };

  const logout = () => {
    setCurrentUser(null);
    localStorage.removeItem("currentUser");
    setOrders([]);
    stopRefreshTimer();
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("accessTokenExpiredAt");
    localStorage.removeItem("refreshTokenExpiredAt");
    setAuthHeader("");
  };

  const recordOrder = (order) => setOrders((prev) => [...prev, order]);

  // 嚴格 isAuthed：token 看起來有效 + 有 user
  const { accessToken, accessTokenExpiredAt } = getTokens();
  const tokenLooksValid = !!accessToken && isTimestampValid(accessTokenExpiredAt);
  const isAuthed = tokenLooksValid && !!(currentUser?.user);

  const ctxValue = useMemo(
    () => ({
      currentUser,
      user: currentUser?.user,
      privileges: currentUser?.privileges,
      hydrating,
      isAuthed,
      login,
      logout,
      recordOrder,
      refreshUserInfo,
      optimisticGiftDeduct,
      syncGiftAfterOrder,
    }),
    [currentUser, hydrating, isAuthed]
  );

  return (
    <EmployeeContext.Provider value={ctxValue}>
      {children}
    </EmployeeContext.Provider>
  );
};
