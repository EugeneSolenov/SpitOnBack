import React, { useEffect, useState } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "./api";

function App() {
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Состояние формы
  const [formData, setFormData] = useState({
    name: "", category: "", description: "", price: "", stock: ""
  });

  // Загрузка товаров при запуске
  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    const data = await getProducts();
    setProducts(data);
  };

  // Открытие модального окна (для создания или редактирования)
  const openModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData(product);
    } else {
      setEditingProduct(null);
      setFormData({ name: "", category: "", description: "", price: "", stock: "" });
    }
    setModalOpen(true);
  };

  // Удаление
  const handleDelete = async (id) => {
    if (window.confirm("Удалить этот товар?")) {
      await deleteProduct(id);
      loadProducts();
    }
  };

  // Отправка формы (Создание или Обновление)
  const handleSubmit = async (e) => {
    e.preventDefault();
    if (editingProduct) {
      await updateProduct(editingProduct.id, formData);
    } else {
      await createProduct(formData);
    }
    setModalOpen(false);
    loadProducts();
  };

  return (
    <div className="container">
      <h1>📦 Магазин Электроники</h1>
      
      <div className="toolbar">
        <button className="btn btn-primary" onClick={() => openModal()}>+ Добавить товар</button>
      </div>

      <div className="product-list">
        {products.map((p) => (
          <div key={p.id} className="product-card">
            <div className="product-info">
              <h3>{p.name}</h3>
              <div className="category">{p.category}</div>
              <p>{p.description}</p>
              <div className="price">{p.price} ₽</div>
              <div className="stock">На складе: {p.stock} шт.</div>
            </div>
            <div className="actions">
              <button className="btn btn-edit" onClick={() => openModal(p)}>Изменить</button>
              <button className="btn btn-danger" onClick={() => handleDelete(p.id)}>Удалить</button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingProduct ? "Редактирование" : "Новый товар"}</h2>
            <form onSubmit={handleSubmit}>
              <div className="form-group">
                <label>Название</label>
                <input required value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Категория</label>
                <input value={formData.category} onChange={e => setFormData({...formData, category: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Описание</label>
                <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Цена (₽)</label>
                <input type="number" required value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} />
              </div>
              <div className="form-group">
                <label>Количество</label>
                <input type="number" value={formData.stock} onChange={e => setFormData({...formData, stock: e.target.value})} />
              </div>
              <div className="modal-actions">
                <button type="button" className="btn btn-danger" onClick={() => setModalOpen(false)}>Отмена</button>
                <button type="submit" className="btn btn-primary">Сохранить</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;