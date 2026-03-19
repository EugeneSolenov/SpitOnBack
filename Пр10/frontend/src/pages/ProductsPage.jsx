import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import apiClient from "../api/client";

const emptyForm = {
  title: "",
  category: "",
  description: "",
  imageUrl: "",
  price: "",
};

export default function ProductsPage() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyForm);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState("");

  async function loadProducts() {
    setIsLoading(true);
    setError("");

    try {
      const response = await apiClient.get("/api/products");
      setProducts(response.data);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Не удалось загрузить товары");
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    loadProducts();
  }, []);

  async function handleCreate(event) {
    event.preventDefault();
    setIsSaving(true);
    setError("");

    try {
      const response = await apiClient.post("/api/products", {
        title: form.title,
        category: form.category,
        description: form.description,
        imageUrl: form.imageUrl,
        price: Number(form.price),
      });

      setProducts((currentProducts) => [response.data, ...currentProducts]);
      setForm(emptyForm);
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Не удалось создать товар");
    } finally {
      setIsSaving(false);
    }
  }

  function handleChange(event) {
    setForm({
      ...form,
      [event.target.name]: event.target.value,
    });
  }

  return (
    <section className="page-block">
      <div className="panel simple-panel">
        <h2>Товары</h2>
        <p className="muted">Простой интерфейс для просмотра и изменения товаров.</p>
        <button type="button" className="secondary-button" onClick={loadProducts}>
          Обновить
        </button>
      </div>

      <div className="panel simple-panel">
        <h3>Добавить товар</h3>
        <form className="stack-form" onSubmit={handleCreate}>
          <label className="field">
            <span>Название</span>
            <input name="title" type="text" value={form.title} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Категория</span>
            <input name="category" type="text" value={form.category} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Описание</span>
            <textarea name="description" value={form.description} onChange={handleChange} rows="4" required />
          </label>

          <label className="field">
            <span>Ссылка на изображение</span>
            <input name="imageUrl" type="url" value={form.imageUrl} onChange={handleChange} required />
          </label>

          <label className="field">
            <span>Цена</span>
            <input name="price" type="number" min="0" step="0.01" value={form.price} onChange={handleChange} required />
          </label>

          {form.imageUrl ? (
            <div className="image-preview-block">
              <img src={form.imageUrl} alt={form.title || "предпросмотр"} className="product-image-preview" />
            </div>
          ) : null}

          {error ? <p className="error-banner">{error}</p> : null}

          <button type="submit" className="primary-button" disabled={isSaving}>
            {isSaving ? "Сохраняем..." : "Добавить товар"}
          </button>
        </form>
      </div>

      <div className="panel simple-panel">
        <div className="table-header">
          <h3>Список товаров</h3>
          <span>Всего: {products.length}</span>
        </div>

        {isLoading ? <p className="muted">Загрузка...</p> : null}
        {!isLoading && products.length === 0 ? <p className="muted">Товаров пока нет.</p> : null}

        {!isLoading && products.length > 0 ? (
          <div className="table-wrapper">
            <table className="products-table">
              <thead>
                <tr>
                  <th>Картинка</th>
                  <th>ID</th>
                  <th>Название</th>
                  <th>Категория</th>
                  <th>Описание</th>
                  <th>Цена</th>
                  <th>Действие</th>
                </tr>
              </thead>
              <tbody>
                {products.map((product) => (
                  <tr key={product.id}>
                    <td>
                      <img src={product.imageUrl} alt={product.title} className="table-product-image" />
                    </td>
                    <td className="cell-id">{product.id}</td>
                    <td>{product.title}</td>
                    <td>{product.category}</td>
                    <td className="cell-description">{product.description}</td>
                    <td>{Number(product.price).toLocaleString("ru-RU")} руб.</td>
                    <td>
                      <Link to={`/products/${product.id}`} className="table-link">
                        Открыть
                      </Link>
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