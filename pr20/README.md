# Практическая работа 20

REST API для управления пользователями на `Express` с подключением к `MongoDB Atlas` через `mongoose`.

## Запуск

```bash
npm install
npm start
```

Сервер запускается на `http://localhost:3000`.

## Настройка базы данных

Строка подключения хранится в локальном файле `.env`:

```env
PORT=3000
MONGO_URI=mongodb+srv://username:password@cluster0.example.mongodb.net/pr20?retryWrites=true&w=majority&appName=Cluster0
```

Файл `.env` не нужно отправлять в репозиторий. Для примера настроек есть `.env.example`.

## Маршруты

- `POST /api/users` - создать пользователя
- `GET /api/users` - получить список пользователей
- `GET /api/users/:id` - получить одного пользователя
- `PATCH /api/users/:id` - обновить пользователя
- `DELETE /api/users/:id` - удалить пользователя

## Пример тела запроса

```json
{
  "first_name": "Иван",
  "last_name": "Иванов",
  "age": 20
}
```

## Тестовые данные

Чтобы очистить коллекцию пользователей и добавить демонстрационные записи:

```bash
npm run seed
```

## Проверка через PowerShell

```powershell
Invoke-RestMethod -Method Get -Uri http://localhost:3000/api/users
```
