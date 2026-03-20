import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/client";
import { useAuth } from "../context/AuthContext";
import { getRoleLabel } from "../utils/roles";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const [users, setUsers] = useState([]);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [blockingId, setBlockingId] = useState("");

  async function loadUsers() {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.get("/api/users");
      setUsers(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Не удалось загрузить пользователей");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadUsers();
  }, []);

  async function handleBlock(userId) {
    setBlockingId(userId);
    setError("");

    try {
      await apiClient.delete(`/api/users/${userId}`);
      await loadUsers();
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Не удалось заблокировать пользователя");
    } finally {
      setBlockingId("");
    }
  }

  return (
    <section className="page-block">
      <div className="panel simple-panel">
        <div className="table-header">
          <div>
            <h2>Управление пользователями</h2>
            <p className="muted">Здесь администратор может менять роли и блокировать учетные записи.</p>
          </div>

          <button type="button" className="secondary-button" onClick={loadUsers}>
            Обновить
          </button>
        </div>

        {error ? <p className="error-banner">{error}</p> : null}
        {isLoading ? <p className="muted">Загрузка...</p> : null}
        {!isLoading && users.length === 0 ? <p className="muted">Пользователей пока нет.</p> : null}

        {!isLoading && users.length > 0 ? (
          <div className="table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>ID</th>
                  <th>Email</th>
                  <th>Роль</th>
                  <th>Статус</th>
                  <th>Действия</th>
                </tr>
              </thead>
              <tbody>
                {users.map((user) => (
                  <tr key={user.id}>
                    <td className="cell-id">{user.id}</td>
                    <td>{user.email}</td>
                    <td>{getRoleLabel(user.role)}</td>
                    <td>
                      <span className={user.isBlocked ? "status-badge blocked" : "status-badge active"}>
                        {user.isBlocked ? "Заблокирован" : "Активен"}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <Link to={`/users/${user.id}/edit`} className="table-link">
                          Изменить
                        </Link>

                        <button
                          type="button"
                          className="danger-button inline-button"
                          onClick={() => handleBlock(user.id)}
                          disabled={user.isBlocked || blockingId === user.id || user.id === currentUser?.id}
                        >
                          {blockingId === user.id ? "Блокируем..." : "Заблокировать"}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : null}
      </div>
    </section>
  );
}
