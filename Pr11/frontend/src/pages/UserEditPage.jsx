import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "../api/client";
import { ROLES, getRoleLabel } from "../utils/roles";

export default function UserEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    email: "",
    role: ROLES.USER,
    password: "",
  });
  const [user, setUser] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadUser() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiClient.get(`/api/users/${id}`);
        setUser(response.data);
        setForm({
          email: response.data.email,
          role: response.data.role,
          password: "",
        });
      } catch (requestError) {
        setError(requestError.response?.data?.error || "Не удалось загрузить пользователя");
      } finally {
        setIsLoading(false);
      }
    }

    loadUser();
  }, [id]);

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    const payload = {
      email: form.email,
      role: form.role,
    };

    if (form.password.trim()) {
      payload.password = form.password;
    }

    try {
      await apiClient.put(`/api/users/${id}`, payload);
      navigate("/users", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Не удалось обновить пользователя");
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return (
      <section className="panel simple-panel">
        <p className="muted">Загрузка...</p>
      </section>
    );
  }

  return (
    <section className="panel simple-panel">
      <div className="table-header">
        <div>
          <h2>Редактирование пользователя</h2>
          <p className="muted">{user ? `Текущая роль: ${getRoleLabel(user.role)}` : ""}</p>
        </div>

        <Link to="/users" className="secondary-button link-button">
          Назад
        </Link>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
        <label className="field">
          <span>Email</span>
          <input name="email" type="email" value={form.email} onChange={handleChange} required />
        </label>

        <label className="field">
          <span>Роль</span>
          <select name="role" value={form.role} onChange={handleChange}>
            <option value={ROLES.USER}>Пользователь</option>
            <option value={ROLES.SELLER}>Продавец</option>
            <option value={ROLES.ADMIN}>Администратор</option>
          </select>
        </label>

        <label className="field">
          <span>Новый пароль</span>
          <input
            name="password"
            type="password"
            value={form.password}
            onChange={handleChange}
            placeholder="Оставьте пустым, если менять не нужно"
          />
        </label>

        {user?.isBlocked ? (
          <p className="error-banner">Пользователь уже заблокирован. При необходимости можно только просмотреть данные.</p>
        ) : null}

        {error ? <p className="error-banner">{error}</p> : null}

        <button type="submit" className="primary-button" disabled={isSaving || user?.isBlocked}>
          {isSaving ? "Сохраняем..." : "Сохранить"}
        </button>
      </form>
    </section>
  );
}
