# Практика 26

GraphQL API каталога книг на Apollo Server.

## Запуск

```powershell
npm install
npm start
```

Адрес Apollo Sandbox:

```text
http://localhost:4000
```

## Проверка

```powershell
npm run smoke
```

## Примеры запросов

```graphql
query {
  books {
    id
    title
    year
    author {
      name
    }
  }
}
```

```graphql
query {
  authors {
    id
    name
    books {
      title
    }
  }
}
```

```graphql
mutation {
  createBook(title: "Идиот", year: 1869, authorId: "2") {
    id
    title
    author {
      name
    }
  }
}
```
