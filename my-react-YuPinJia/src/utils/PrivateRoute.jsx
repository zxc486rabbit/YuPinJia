// src/utils/PrivateRoute.jsx
import { Navigate, useLocation } from "react-router-dom";
import { useEmployee } from "./EmployeeContext";

export default function PrivateRoute({ children }) {
  const { isAuthed, hydrating } = useEmployee();
  const location = useLocation();

  // 還原中：先不渲染任何東西（或回傳一個 Loading 元件）
  if (hydrating) return null;

  return isAuthed ? (
    children
  ) : (
    <Navigate to="/login" replace state={{ from: location }} />
  );
}
