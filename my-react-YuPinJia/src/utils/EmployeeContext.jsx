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
  tsToMs,
} from "./apiClient";

const USERINFO_URL = "https://yupinjia.hyjr.com.tw/api/api/Account/userInfo";

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

// 指數退避重試：避免單次抖動就整個流程失敗
async function resilientRefreshOnce() {
  let attempt = 0;
  let lastErr;
  const maxAttempts = 3;
  const base = 1000;
  while (attempt < maxAttempts) {
    try {
      const r = await refreshAccessToken(); // 帶 __skipAuthRefresh
      if (!r?.accessToken) throw new Error("No AT after refresh");
      return r;
    } catch (e) {
      lastErr = e;
      const code = e?.response?.status ?? e?.code ?? "";
      const msg = e?.response?.data?.message ?? e?.message ?? "";
      // refresh token 明確失效就不要重試
      if (code === 401 || /refresh token/i.test(String(msg))) break;
      await sleep(base * Math.pow(2, attempt)); // 1s, 2s, 4s
      attempt++;
    }
  }
  throw lastErr;
}

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

  /** 啟動 15 分鐘自動刷新（更有韌性，不輕易登出） */
  const startRefreshTimer = () => {
    stopRefreshTimer();
    refreshTimerRef.current = setInterval(async () => {
      try {
        const r = await resilientRefreshOnce();
        if (!r?.accessToken) throw new Error("No accessToken after refresh");
      } catch (err) {
        // 不要立刻登出；交由攔截器在下一次真正 401/600 時處理
        console.warn("[auto refresh] failed, will rely on interceptors next call", err);
      }
    }, 15 * 60 * 1000); // 15 分鐘
  };

  const stopRefreshTimer = () => {
    if (refreshTimerRef.current) {
      clearInterval(refreshTimerRef.current);
      refreshTimerRef.current = null;
    }
  };

  /** 初始化：還原 currentUser → 取 userInfo → 失敗再 refresh → 再取 → 仍失敗才清 */
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
        const tokenLooksValid = !!accessToken && isTimestampValid(accessTokenExpiredAt);

        if (tokenLooksValid || !!accessToken) {
          setAuthHeader(accessToken);
          let ok = await refreshUserInfo();
          if (!ok) {
            try {
              await resilientRefreshOnce();
              ok = await refreshUserInfo();
            } catch {
              ok = null;
            }
          }
          if (ok) {
            startRefreshTimer();
          } else {
            ["accessToken", "refreshToken", "accessTokenExpiredAt", "refreshTokenExpiredAt"]
              .forEach((k) => localStorage.removeItem(k));
            setCurrentUser(null);
          }
        } else {
          ["accessToken", "refreshToken", "accessTokenExpiredAt", "refreshTokenExpiredAt"]
            .forEach((k) => localStorage.removeItem(k));
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

  const recordOrder = (order) => setOrders((prev) => [...prev, order]);

  // 嚴格化登入條件：token 看起來可用 + 有 user
  const { accessToken, accessTokenExpiredAt } = getTokens();
  const tokenLooksValid = !!accessToken && isTimestampValid(accessTokenExpiredAt);
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
