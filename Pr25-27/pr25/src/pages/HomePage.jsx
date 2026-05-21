export default function HomePage() {
  return (
    <main className="page">
      <section className="hero">
        <div>
          <h2>Небольшой учебный проект</h2>
          <p>
            Здесь показаны маршруты, сборка через Vite и подготовка production-версии
            с анализом итогового бандла.
          </p>
        </div>

        <div className="summary">
          <span>Vite</span>
          <span>React Router</span>
          <span>Lazy loading</span>
          <span>Bundle report</span>
        </div>
      </section>

      <section className="grid">
        <article>
          <h3>Маршрутизация</h3>
          <p>В приложении есть главная страница и отдельная страница с описанием проекта.</p>
        </article>

        <article>
          <h3>Ленивая загрузка</h3>
          <p>Страница «О проекте» загружается отдельным чанком только при переходе.</p>
        </article>

        <article>
          <h3>Анализ сборки</h3>
          <p>После команды build создаётся HTML-отчёт с размерами файлов сборки.</p>
        </article>
      </section>
    </main>
  );
}
