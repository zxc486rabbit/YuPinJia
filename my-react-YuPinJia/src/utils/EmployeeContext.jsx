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

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export const EmployeeProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // 形狀：{ user: {...}, privileges?: any }
  const [orders, setOrders] = useState([]);
  const [hydrating, setHydrating] = useState(true);
  const refreshTimerRef = useRef(null);

  // 重新抓一次 /Account/userInfo
  const refreshUserInfo = async () => {
    try {
      const { accessToken } = getTokens();
      if (!accessToken) return null;
      setAuthHeader(accessToken);

      const res = await api.get(USERINFO_URL, {
        params: { ts: Date.now() },
        headers: { "Cache-Control": "no-cache", Pragma: "no-cache" },
      });

      // ★ 關鍵修正：同時相容兩種格式（res.data.user / 直接 res.data）
      const latestUser = res?.data?.user ?? res?.data ?? null;

      setCurrentUser((prev) => {
        const merged = {
          ...(prev || {}),
          user: latestUser || prev?.user || null,
          // 若你的後端另有 privileges，可填；否則留著之前的或 null
          privileges: res?.data?.privileges ?? prev?.privileges ?? null,
        };
        localStorage.setItem("currentUser", JSON.stringify(merged));
        return merged;
      });

      console.log("[refreshUserInfo] got user:", latestUser);
      return latestUser;
    } catch (e) {
      console.error("refreshUserInfo failed", e);
      return null;
    }
  };

  const optimisticGiftDeduct = (amount) => {
    const delta = Math.max(0, Number(amount) || 0);
    let before = 0;
    let after = 0;

    setCurrentUser((prev) => {
      if (!prev?.user) return prev;
      before = Number(prev.user.monthRemainGift ?? prev.user.giftAmount ?? 0);
      after = Math.max(0, before - delta);

      const merged = {
        ...prev,
        user: {
          ...prev.user,
          monthRemainGift: after,
        },
      };
      localStorage.setItem("currentUser", JSON.stringify(merged));
      return merged;
    });

    console.log("[optimisticGiftDeduct] before:", before, "after:", after);
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

  // === Token 自動刷新計時器 ===
  const startRefreshTimer = () => {
    stopRefreshTimer();
    refreshTimerRef.current = setInterval(async () => {
      try {
        await refreshAccessToken();
      } catch (e) {
        console.error("Auto refresh failed:", e);
        logout(); // refresh 失敗 → 登出
      }
    }, 14 * 60 * 1000 + 30 * 1000);
  };

  const stopRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  // ★ 初始化：先從 localStorage 還原，再看 token 決定是否拉 userInfo
  useEffect(() => {
    (async () => {
      try {
        const saved = localStorage.getItem("currentUser");
        if (saved) {
          try {
            setCurrentUser(JSON.parse(saved));
          } catch {}
        }

        const { accessToken } = getTokens();
        if (accessToken) {
          setAuthHeader(accessToken);
          startRefreshTimer();
          await refreshUserInfo().catch(() => {});
        }
      } finally {
        setHydrating(false);
      }
    })();

    return () => stopRefreshTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const login = (employee) => {
    // 建議傳入形狀為 { user: <直接 userInfo 物件>, privileges?: any }
    // 如果傳的是「直接 userInfo 物件」，也在這裡轉一下
    const normalized =
      employee?.user
        ? employee
        : { user: employee || null, privileges: employee?.privileges ?? null };

    setCurrentUser(normalized);
    localStorage.setItem("currentUser", JSON.stringify(normalized));

    const { accessToken } = getTokens();
    if (accessToken) {
      setAuthHeader(accessToken);
      startRefreshTimer();
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

  const recordOrder = (order) => {
    setOrders((prev) => [...prev, order]);
  };

  // isAuthed：用「有 token」當判斷依據；hydrating 期間不要用它導頁
  const isAuthed = !!getTokens().accessToken;

  const ctxValue = useMemo(
    () => ({
      currentUser,           // { user, privileges }
      user: currentUser?.user, // 方便直接拿
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [currentUser, hydrating, isAuthed]
  );

  return (
    <EmployeeContext.Provider value={ctxValue}>
      {children}
    </EmployeeContext.Provider>
  );
};
