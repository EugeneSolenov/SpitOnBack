import { useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const redirectTo = location.state?.from?.pathname || "/products";

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await login(form);
      navigate(redirectTo, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Не удалось войти в систему");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="screen-shell">
      <section className="panel auth-panel">
        <p className="eyebrow">Вход</p>
        <h1>Войдите в систему</h1>
        <p className="muted">
          После входа access-токен будет подставляться в запросы автоматически, а refresh-токен поможет обновить сессию без повторного ввода пароля.
        </p>

        <form className="auth-form" onSubmit={handleSubmit}>
          <label className="field">
            <span>Эл. почта</span>
            <input
              type="email"
              value={form.email}
              onChange={(event) => setForm({ ...form, email: event.target.value })}
              placeholder="student@mail.com"
              required
            />
          </label>

          <label className="field">
            <span>Пароль</span>
            <input
              type="password"
              value={form.password}
              onChange={(event) => setForm({ ...form, password: event.target.value })}
              placeholder="qwerty123"
              required
            />
          </label>

          {error ? <p className="error-banner">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Входим..." : "Войти"}
          </button>
        </form>

        <p className="auth-switch">
          Нет аккаунта? <Link to="/register">Зарегистрироваться</Link>
        </p>
      </section>
    </div>
  );
}