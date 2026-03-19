import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: "", password: "" });
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSubmitting(true);
    setError("");

    try {
      await register(form);
      navigate("/products", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Не удалось зарегистрироваться");
    } finally {
      setIsSubmitting(false);
    }
  }

  return (
    <div className="screen-shell">
      <section className="panel auth-panel">
        <p className="eyebrow">Регистрация</p>
        <h1>Создайте аккаунт</h1>
        <p className="muted">
          После регистрации приложение сразу выполнит вход и сохранит полученные токены в localStorage.
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
              minLength={6}
              required
            />
          </label>

          {error ? <p className="error-banner">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={isSubmitting}>
            {isSubmitting ? "Создаем аккаунт..." : "Зарегистрироваться"}
          </button>
        </form>

        <p className="auth-switch">
          Уже есть аккаунт? <Link to="/login">Войти</Link>
        </p>
      </section>
    </div>
  );
}