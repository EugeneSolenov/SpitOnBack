import { ApolloServer } from "@apollo/server";
import { startStandaloneServer } from "@apollo/server/standalone";
import { pathToFileURL } from "node:url";

const authors = [
  { id: "1", name: "Лев Толстой" },
  { id: "2", name: "Фёдор Достоевский" }
];

const books = [
  { id: "1", title: "Война и мир", year: 1869, authorId: "1" },
  { id: "2", title: "Анна Каренина", year: 1877, authorId: "1" },
  { id: "3", title: "Преступление и наказание", year: 1866, authorId: "2" }
];

let nextAuthorId = 3;
let nextBookId = 4;

const typeDefs = `
  type Book {
    id: ID!
    title: String!
    year: Int!
    author: Author!
  }

  type Author {
    id: ID!
    name: String!
    books: [Book!]!
  }

  type Query {
    books: [Book!]!
    book(id: ID!): Book
    authors: [Author!]!
  }

  type Mutation {
    createAuthor(name: String!): Author!
    createBook(title: String!, year: Int!, authorId: ID!): Book!
  }
`;

function findAuthor(id) {
  return authors.find((author) => author.id === id);
}

function getRequiredText(value, fieldName) {
  const text = value.trim();

  if (!text) {
    throw new Error(`${fieldName} не может быть пустым`);
  }

  return text;
}

const resolvers = {
  Query: {
    books: () => books,
    book: (_, { id }) => books.find((book) => book.id === id) || null,
    authors: () => authors
  },
  Mutation: {
    createAuthor: (_, { name }) => {
      const author = {
        id: String(nextAuthorId++),
        name: getRequiredText(name, "name")
      };

      authors.push(author);
      return author;
    },
    createBook: (_, { title, year, authorId }) => {
      const author = findAuthor(authorId);

      if (!author) {
        throw new Error("Автор не найден");
      }

      const book = {
        id: String(nextBookId++),
        title: getRequiredText(title, "title"),
        year,
        authorId
      };

      books.push(book);
      return book;
    }
  },
  Book: {
    author: (book) => findAuthor(book.authorId)
  },
  Author: {
    books: (author) => books.filter((book) => book.authorId === author.id)
  }
};

export function createServer() {
  return new ApolloServer({
    typeDefs,
    resolvers
  });
}

export async function startServer() {
  const server = createServer();
  const { url } = await startStandaloneServer(server, {
    listen: { port: Number(process.env.PORT) || 4000 }
  });

  console.log(`GraphQL server is running at ${url}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  startServer();
}
