import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar panel">
        <div>
          <p className="eyebrow">Практика 10</p>
          <h1 className="sidebar-title">Панель управления товарами</h1>
          <p className="muted">
            Клиент хранит токены в localStorage и автоматически обновляет access-токен через axios interceptors.
          </p>
        </div>

        <nav className="nav-links">
          <NavLink to="/products" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Список товаров
          </NavLink>
          <a href="http://localhost:3000/api-docs" target="_blank" rel="noreferrer" className="nav-link">
            Swagger
          </a>
        </nav>

        <div className="profile-card">
          <div>
            <p className="profile-label">Текущий пользователь</p>
            <p className="profile-email">{user?.email}</p>
          </div>
          <button type="button" className="ghost-button" onClick={logout}>
            Выйти
          </button>
        </div>
      </aside>

      <main className="content-area">
        <Outlet />
      </main>
    </div>
  );
}