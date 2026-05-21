# Практики 25-27

В папке находятся три отдельных проекта.

## Практика 25

Папка: `pr25`

Задание: создать небольшое React-приложение с инструментом сборки Vite, двумя маршрутами, ленивой загрузкой одного маршрута и анализатором итоговой сборки.

Что реализовано:

- React-приложение на Vite;
- две страницы: главная `/` и страница `О проекте` `/about`;
- маршрутизация через `react-router-dom`;
- lazy loading для страницы `О проекте` через `React.lazy` и `Suspense`;
- анализатор бандла `rollup-plugin-visualizer`;
- production-сборка через `npm run build`;
- отчёт анализатора создаётся в `dist/bundle-report.html`.

Запуск:

```powershell
cd pr25
npm install
npm run dev
```

Сборка:

```powershell
npm run build
```

## Практика 26

Папка: `pr26`

Задание: реализовать GraphQL API для каталога книг с использованием Apollo Server.

Что реализовано:

- GraphQL-сервер на `@apollo/server`;
- типы `Book` и `Author`;
- связь между книгами и авторами: у книги есть автор, у автора есть список книг;
- запросы `Query` для получения всех книг, одной книги по `id` и всех авторов;
- мутации `Mutation` для создания книги и автора;
- резолверы для обычных и вложенных полей;
- данные хранятся в памяти в массивах `authors` и `books`;
- быстрая проверка API через `smoke-test.js`.

Запуск:

```powershell
cd pr26
npm install
npm start
```

Проверка:

```powershell
npm run smoke
```

Пример GraphQL-запроса для PowerShell:

```powershell
$body = @{
  query = 'query { books { id title year author { name } } }'
} | ConvertTo-Json

Invoke-RestMethod -Uri "http://localhost:4000/" -Method Post -ContentType "application/json" -Body $body | ConvertTo-Json -Depth 10
```

## Практика 27

Папка: `pr27`

Producer API и worker-процессы для обработки задач через RabbitMQ, retry logic и dead-letter queue.

```powershell
cd pr27
npm install
npm run rabbit:up
npm start
npm run workers
```

После проверки RabbitMQ можно остановить:

```powershell
npm run rabbit:down
```
