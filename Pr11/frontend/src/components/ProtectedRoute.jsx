import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const location = useLocation();
  const { hasRole, isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return (
      <div className="screen-shell">
        <div className="panel spotlight-panel">
          <p className="eyebrow">Практика 11</p>
          <h1>Проверяем сессию и права доступа</h1>
          <p className="muted">
            Клиент восстанавливает пользователя из токенов и проверяет, какие действия доступны для его роли.
          </p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  if (allowedRoles && !hasRole(allowedRoles)) {
    return <Navigate to="/forbidden" replace state={{ from: location }} />;
  }

  return children;
}
