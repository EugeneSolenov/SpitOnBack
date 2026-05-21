export default function AboutPage() {
  return (
    <main className="page">
      <section className="panel">
        <h2>О проекте</h2>
        <p>
          Проект создан для практического задания по инструментам сборки. Он использует
          Vite, React, React Router и rollup-plugin-visualizer.
        </p>
      </section>

      <section className="list">
        <div>
          <strong>Команда разработки</strong>
          <span>npm run dev</span>
        </div>
        <div>
          <strong>Команда сборки</strong>
          <span>npm run build</span>
        </div>
        <div>
          <strong>Отчёт анализатора</strong>
          <span>dist/bundle-report.html</span>
        </div>
      </section>
    </main>
  );
}
