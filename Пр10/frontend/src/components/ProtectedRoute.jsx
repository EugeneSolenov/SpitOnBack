import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children }) {
  const location = useLocation();
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="screen-shell">
        <div className="panel spotlight-panel">
          <p className="eyebrow">Практика 10</p>
          <h1>Проверяем токены и восстанавливаем сессию</h1>
          <p className="muted">Если access-токен истек, клиент попробует получить новую пару токенов автоматически.</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  return children;
}