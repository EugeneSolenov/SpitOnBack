# Практическое занятие 21

Проект основан на практическом занятии 11 и дополнен Redis-кэшированием.

## Что кэшируется

| Маршрут | Метод | TTL |
| --- | --- | --- |
| `/api/users` | GET | 1 минута |
| `/api/users/:id` | GET | 1 минута |
| `/api/products` | GET | 10 минут |
| `/api/products/:id` | GET | 10 минут |

Ответы кэшируемых GET-маршрутов имеют формат:

```json
{
  "source": "server",
  "data": []
}
```

При повторном запросе из Redis поле `source` будет равно `cache`.

## Запуск

```bash
docker run -d --name redis-cache -p 6379:6379 redis
npm install
npm --prefix frontend install
npm run dev
```

Backend: `http://localhost:3000`

Frontend: `http://localhost:5173`

Swagger: `http://localhost:3000/api-docs`

Если фронтенд запускается на другом порту, перед стартом backend можно указать:

```powershell
$env:FRONTEND_ORIGIN="http://localhost:5174"; npm run server
```

## Проверка

```bash
npm run smoke
npm --prefix frontend run build
```
