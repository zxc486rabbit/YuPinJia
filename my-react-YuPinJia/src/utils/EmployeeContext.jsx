// src/utils/EmployeeContext.jsx
import React, {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import api, {
  getTokens,
  setAuthHeader,
  refreshAccessToken,
} from "./apiClient";

const USERINFO_URL =
  "https://yupinjia.hyjr.com.tw/api/api/Account/userInfo";

const EmployeeContext = createContext();
export const useEmployee = () => useContext(EmployeeContext);

// 小工具：sleep
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// 沒提供過期時間就先視為有效，避免開頁抖動／誤登出
const isTimestampValid = (ts) => {
  if (ts === undefined || ts === null || ts === "") return true;
  const n = Number(ts);
  if (Number.isNaN(n)) return true;
  return Date.now() < n;
};

// ──────────────────────────────────────────────────────────────

export const EmployeeProvider = ({ children }) => {
  const [currentUser, setCurrentUser] = useState(null); // { user, privileges? }
  const [orders, setOrders] = useState([]);
  const [hydrating, setHydrating] = useState(true);

  // 15 分鐘刷新計時器
  const refreshTimerRef = useRef(null);
  const didInitRef = useRef(false); // 防止 StrictMode 重跑

  /** 強制登出並導回登入 */
  const hardLogoutToLogin = () => {
    logout();
    if (typeof window !== "undefined") {
      // 用 assign 以防止返回上一頁繼續用舊 token
      window.location.assign("/login");
    }
  };

  /** 撈使用者資料（帶目前 accessToken） */
  const refreshUserInfo = async () => {
    try {
      const { accessToken } = getTokens();
      if (!accessToken) return null;

      setAuthHeader(accessToken);

      const res = await api.get(USERINFO_URL, {
        params: { ts: Date.now() },
        headers: {
          "Cache-Control": "no-cache",
          Pragma: "no-cache",
        },
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
      // 讓 httpBootstrap 的攔截器先處理 401/600 → 若仍拋出，這裡視為失敗
      console.error("[refreshUserInfo] failed", e);
      return null;
    }
  };

  /** 下單後同步贈送額度（保留你原有流程） */
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
        user: { ...prev.user, monthRemainGift: after },
      };
      localStorage.setItem("currentUser", JSON.stringify(merged));
      return merged;
    });

    return { before, after };
  };

  const syncGiftAfterOrder = async (usedGiftAmount) => {
    const { after: optimisticRemain } =
      optimisticGiftDeduct(usedGiftAmount);
    try {
      await refreshAccessToken().catch(() => {});
      for (let i = 0; i < 6; i++) {
        const latestUser = await refreshUserInfo();
        if (latestUser) {
          const serverRemain = Number(
            latestUser.monthRemainGift ?? 0
          );
          if (serverRemain <= optimisticRemain) break;
        }
        await sleep(400);
      }
    } catch (e) {
      console.warn("syncGiftAfterOrder failed", e);
    }
  };

  /** 啟動 15 分鐘自動刷新（後端要求每 15 分鐘打 /Account/refresh） */
  const startRefreshTimer = () => {
    stopRefreshTimer();
    refreshTimerRef.current = setInterval(async () => {
      try {
        const r = await refreshAccessToken();
        // 正常成功後不需額外動作；httpBootstrap/apiClient 已寫回 token
        if (!r?.accessToken) throw new Error("No accessToken after refresh");
      } catch (err) {
        console.error("[auto refresh] failed → force logout", err);
        hardLogoutToLogin();
      }
    }, 15 * 60 * 1000); // 15 分鐘
  };

  const stopRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  /** 初始化：還原 currentUser、若有 token 則撈 userInfo，最後啟動 15 分鐘刷新 */
  useEffect(() => {
    if (didInitRef.current) return;
    didInitRef.current = true;

    (async () => {
      try {
        // 還原快取的 user（僅作 UI 初值，最後仍會以 server 為準）
        const saved = localStorage.getItem("currentUser");
        if (saved) {
          try {
            setCurrentUser(JSON.parse(saved));
          } catch {}
        }

        const { accessToken, accessTokenExpiredAt } = getTokens();
        const tokenLooksValid =
          !!accessToken && isTimestampValid(accessTokenExpiredAt);

        if (tokenLooksValid || !!accessToken) {
          setAuthHeader(accessToken);
          const ok = await refreshUserInfo();
          if (!ok) {
            // token 形同不可用（撈不到 user），清乾淨
            localStorage.removeItem("accessToken");
            localStorage.removeItem("refreshToken");
            localStorage.removeItem("accessTokenExpiredAt");
            localStorage.removeItem("refreshTokenExpiredAt");
            setCurrentUser(null);
          } else {
            // 僅在成功取得 userInfo 後，才啟動 15 分鐘刷新
            startRefreshTimer();
          }
        } else {
          // 無 token：確保乾淨
          localStorage.removeItem("accessToken");
          localStorage.removeItem("refreshToken");
          localStorage.removeItem("accessTokenExpiredAt");
          localStorage.removeItem("refreshTokenExpiredAt");
          setCurrentUser(null);
        }
      } finally {
        setHydrating(false);
      }
    })();

    return () => stopRefreshTimer();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /** 手動登入：寫入 user 與 token（token 由 LoginPage 寫），並啟動刷新 */
  const login = (employee) => {
    const normalized = employee?.user
      ? employee
      : {
          user: employee || null,
          privileges: employee?.privileges ?? null,
        };

    setCurrentUser(normalized);
    localStorage.setItem("currentUser", JSON.stringify(normalized));

    const { accessToken } = getTokens();
    if (accessToken) {
      setAuthHeader(accessToken);
      startRefreshTimer();
    }
  };

  /** 登出：清空所有快取與計時器 */
  const logout = () => {
    setCurrentUser(null);
    setOrders([]);
    stopRefreshTimer();

    localStorage.removeItem("currentUser");
    localStorage.removeItem("accessToken");
    localStorage.removeItem("refreshToken");
    localStorage.removeItem("accessTokenExpiredAt");
    localStorage.removeItem("refreshTokenExpiredAt");
    setAuthHeader("");
  };

  const recordOrder = (order) =>
    setOrders((prev) => [...prev, order]);

  // 嚴格化登入條件：token 看起來可用 + 有 user
  const { accessToken, accessTokenExpiredAt } = getTokens();
  const tokenLooksValid =
    !!accessToken && isTimestampValid(accessTokenExpiredAt);
  const isAuthed = tokenLooksValid && !!(currentUser?.user);

  const ctxValue = useMemo(
    () => ({
      currentUser, // { user, privileges? }
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
