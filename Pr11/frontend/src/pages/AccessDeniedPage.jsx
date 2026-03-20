import { Link } from "react-router-dom";

export default function AccessDeniedPage() {
  return (
    <div className="screen-shell">
      <section className="panel auth-panel">
        <p className="eyebrow">403</p>
        <h1>Доступ запрещен</h1>
        <p className="muted">
          У вашей текущей роли нет прав для перехода на эту страницу. Вернитесь в каталог или войдите под другой
          учетной записью.
        </p>

        <div className="simple-actions">
          <Link to="/products" className="primary-button link-button">
            К товарам
          </Link>
          <Link to="/login" className="secondary-button link-button">
            Сменить аккаунт
          </Link>
        </div>
      </section>
    </div>
  );
}
