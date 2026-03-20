import { NavLink, Outlet } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { getRoleLabel } from "../utils/roles";

export default function Layout() {
  const { user, logout, canManageProducts, isAdmin } = useAuth();

  return (
    <div className="app-shell">
      <aside className="sidebar panel">
        <div>
          <p className="eyebrow">Практика 11</p>
          <h1 className="sidebar-title">RBAC для товаров и пользователей</h1>
          <p className="muted">
            Обычный пользователь просматривает каталог, продавец управляет товарами, администратор получает
            дополнительные инструменты для работы с пользователями.
          </p>
        </div>

        <nav className="nav-links">
          <NavLink to="/products" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
            Товары
          </NavLink>

          {isAdmin ? (
            <NavLink to="/users" className={({ isActive }) => (isActive ? "nav-link active" : "nav-link")}>
              Пользователи
            </NavLink>
          ) : null}

          <a href="http://localhost:3000/api-docs" target="_blank" rel="noreferrer" className="nav-link">
            Swagger
          </a>
        </nav>

        <div className="profile-card">
          <div>
            <p className="profile-label">Текущий пользователь</p>
            <p className="profile-email">{user?.email}</p>
            <span className="role-badge">{getRoleLabel(user?.role)}</span>
          </div>

          <div className="profile-hints">
            <p className="muted">
              {canManageProducts
                ? "Вы можете создавать и редактировать товары."
                : "Вам доступен только просмотр товаров."}
            </p>
            {isAdmin ? <p className="muted">Также доступно управление пользователями и удаление товаров.</p> : null}
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
