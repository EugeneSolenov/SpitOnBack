import React, { useEffect, useState } from "react";
import { getProducts, createProduct, updateProduct, deleteProduct } from "./api";

// Заглушка, если ссылка сломалась или пустая
const PLACEHOLDER = "https://via.placeholder.com/300x200?text=No+Image";

function App() {
  const [products, setProducts] = useState([]);
  const [modalOpen, setModalOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState(null);

  // Добавили поле image
  const [formData, setFormData] = useState({
    name: "", category: "", price: "", stock: "", image: ""
  });

  useEffect(() => {
    loadProducts();
  }, []);

  const loadProducts = async () => {
    try {
      const data = await getProducts();
      setProducts(data);
    } catch (error) {
      console.error("Ошибка сети");
    }
  };

  const handleOpenModal = (product = null) => {
    if (product) {
      setEditingProduct(product);
      setFormData({ 
        name: product.name, 
        category: product.category, 
        price: product.price, 
        stock: product.stock,
        image: product.image 
      });
    } else {
      setEditingProduct(null);
      setFormData({ name: "", category: "", price: "", stock: "", image: "" });
    }
    setModalOpen(true);
  };

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

  const handleDelete = async (id) => {
    if (window.confirm("Удалить?")) {
      await deleteProduct(id);
      loadProducts();
    }
  };

  return (
    <div className="container">
      <div className="toolbar">
        <h1>📦 Склад с фото</h1>
        <button className="btn btn-primary" onClick={() => handleOpenModal()}>
          + Добавить
        </button>
      </div>

      <div className="product-list">
        {products.map((p) => (
          <div key={p.id} className="product-card">
            {/* Вывод картинки */}
            <img 
              src={p.image || PLACEHOLDER} 
              alt={p.name} 
              className="product-image"
              onError={(e) => { e.target.src = PLACEHOLDER; }} // Если ссылка битая, ставим заглушку
            />
            
            <div>
              <h3>{p.name}</h3>
              <div className="category">{p.category}</div>
            </div>
            <div>
              <div className="price">{p.price} ₽</div>
              <div className="stock">Остаток: {p.stock} шт.</div>
            </div>
            
            <div className="actions">
              <button className="btn" onClick={() => handleOpenModal(p)}>
                Изменить
              </button>
              <button className="btn btn-danger" onClick={() => handleDelete(p.id)}>
                Удалить
              </button>
            </div>
          </div>
        ))}
      </div>

      {modalOpen && (
        <div className="modal-overlay">
          <div className="modal">
            <h2>{editingProduct ? "Редактирование" : "Новый товар"}</h2>
            <form onSubmit={handleSubmit}>
              
              {/* Поле для ссылки на картинку */}
              <div className="form-group">
                <label>Ссылка на фото (URL)</label>
                <input 
                  className="input" 
                  placeholder="https://..."
                  value={formData.image} 
                  onChange={e => setFormData({...formData, image: e.target.value})} 
                />
              </div>

              <div className="form-group">
                <label>Название</label>
                <input 
                  className="input" 
                  value={formData.name} 
                  onChange={e => setFormData({...formData, name: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Категория</label>
                <input 
                  className="input" 
                  value={formData.category} 
                  onChange={e => setFormData({...formData, category: e.target.value})} 
                />
              </div>
              <div className="form-group">
                <label>Цена</label>
                <input 
                  className="input" 
                  type="number" 
                  value={formData.price} 
                  onChange={e => setFormData({...formData, price: e.target.value})} 
                  required 
                />
              </div>
              <div className="form-group">
                <label>Количество</label>
                <input 
                  className="input" 
                  type="number" 
                  value={formData.stock} 
                  onChange={e => setFormData({...formData, stock: e.target.value})} 
                />
              </div>

              <div className="modal-actions">
                <button type="button" className="btn" onClick={() => setModalOpen(false)}>
                  Отмена
                </button>
                <button type="submit" className="btn btn-primary">
                  Сохранить
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;