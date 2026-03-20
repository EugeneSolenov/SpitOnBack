import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import apiClient from "../api/client";

export default function ProductEditPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    title: "",
    category: "",
    description: "",
    imageUrl: "",
    price: "",
  });
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadProduct() {
      setIsLoading(true);
      setError("");

      try {
        const response = await apiClient.get(`/api/products/${id}`);
        setForm({
          title: response.data.title,
          category: response.data.category,
          description: response.data.description,
          imageUrl: response.data.imageUrl,
          price: String(response.data.price),
        });
      } catch (requestError) {
        setError(requestError.response?.data?.error || "Не удалось загрузить товар");
      } finally {
        setIsLoading(false);
      }
    }

    loadProduct();
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

    try {
      await apiClient.put(`/api/products/${id}`, {
        title: form.title,
        category: form.category,
        description: form.description,
        imageUrl: form.imageUrl,
        price: Number(form.price),
      });
      navigate(`/products/${id}`, { replace: true });
    } catch (requestError) {
      setError(requestError.response?.data?.error || "Не удалось обновить товар");
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
        <h2>Редактирование товара</h2>
        <Link to={`/products/${id}`} className="secondary-button link-button">
          Отмена
        </Link>
      </div>

      <form className="stack-form" onSubmit={handleSubmit}>
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
          {isSaving ? "Сохраняем..." : "Сохранить"}
        </button>
      </form>
    </section>
  );
}
