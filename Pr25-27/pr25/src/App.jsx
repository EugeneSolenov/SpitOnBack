import { Suspense, lazy } from "react";
import { NavLink, Navigate, Route, Routes } from "react-router-dom";
import HomePage from "./pages/HomePage.jsx";

const AboutPage = lazy(() => import("./pages/AboutPage.jsx"));

export default function App() {
  return (
    <div className="app">
      <header className="header">
        <div>
          <p className="label">Практика 25</p>
          <h1>React-приложение на Vite</h1>
        </div>

        <nav className="nav">
          <NavLink to="/">Главная</NavLink>
          <NavLink to="/about">О проекте</NavLink>
        </nav>
      </header>

      <Suspense fallback={<main className="page">Загрузка страницы...</main>}>
        <Routes>
          <Route path="/" element={<HomePage />} />
          <Route path="/about" element={<AboutPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </Suspense>
    </div>
  );
}
