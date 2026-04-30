import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient, { unwrapCacheData } from "../api/client";
import { useAuth } from "../context/AuthContext";

export default function ProductDetailsPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { canDeleteProducts, canManageProducts } = useAuth();
  const [product, setProduct] = useState(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiClient.get(`/api/products/${id}`);
        setProduct(unwrapCacheData(response.data));
      } catch (requestError) {
        setError(requestError.response?.data?.error || "Не удалось загрузить товар");
      } finally {
        setIsLoading(false);
      }
    }

    loadProduct();
  }, [id]);

  async function handleDelete() {
    setIsDeleting(true);
    setError("");

    try {
      await apiClient.delete(`/api/products/${id}`);
      navigate("/products", { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Не удалось удалить товар");
      setIsDeleting(false);
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
        <h2>{product?.title || "Товар не найден"}</h2>
        <Link to="/products" className="secondary-button link-button">
          Назад
        </Link>
      </div>

      {error ? <p className="error-banner">{error}</p> : null}

      {product ? (
        <div className="details-layout">
          <img src={product.imageUrl} alt={product.title} className="details-image" />

          <div className="details-info">
            <p>
              <strong>ID:</strong> {product.id}
            </p>
            <p>
              <strong>Название:</strong> {product.title}
            </p>
            <p>
              <strong>Категория:</strong> {product.category}
            </p>
            <p>
              <strong>Описание:</strong> {product.description}
            </p>
            <p>
              <strong>Цена:</strong> {Number(product.price).toLocaleString("ru-RU")} руб.
            </p>
          </div>

          <div className="details-actions simple-actions">
            {canManageProducts ? (
              <Link to={`/products/${product.id}/edit`} className="primary-button link-button">
                Редактировать
              </Link>
            ) : null}

            {canDeleteProducts ? (
              <button type="button" className="danger-button" onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? "Удаляем..." : "Удалить"}
              </button>
            ) : null}
          </div>
        </div>
      ) : (
        <p className="muted">Товар с таким ID не найден.</p>
      )}
    </section>
  );
}
