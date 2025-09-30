// src/utils/PrivateRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useEmployee } from "./EmployeeContext";
import { getTokens } from "./apiClient";

function isValidTs(ts) {
  if (ts == null || ts === "") return true;
  const n = Number(ts);
  return Number.isNaN(n) ? true : Date.now() < n;
}

export default function PrivateRoute({ children }) {
  const { isAuthed, hydrating } = useEmployee();
  const location = useLocation();

  if (hydrating) return null;

  const { accessToken, accessTokenExpiredAt } = getTokens();
  const tokenLooksValid = !!accessToken && isValidTs(accessTokenExpiredAt);

  // 只要本地有看起來有效的 token，就先讓頁面有機會恢復（避免瞬間導回 /login）
  if (tokenLooksValid || isAuthed) return children;

  return <Navigate to="/login" replace state={{ from: location }} />;
}
