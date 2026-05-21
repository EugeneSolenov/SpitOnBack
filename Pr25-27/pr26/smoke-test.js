import { createServer } from "./server.js";

const server = createServer();

async function runOperation(name, operation) {
  const result = await server.executeOperation(operation);

  if (result.body.kind !== "single") {
    throw new Error(`${name}: неожиданный тип ответа`);
  }

  if (result.body.singleResult.errors?.length) {
    throw new Error(`${name}: ${result.body.singleResult.errors[0].message}`);
  }

  console.log(`${name}: ok`);
  return result.body.singleResult.data;
}

await runOperation("authors", {
  query: `
    query {
      authors {
        id
        name
        books {
          title
        }
      }
    }
  `
});

await runOperation("book", {
  query: `
    query {
      book(id: "1") {
        title
        author {
          name
        }
      }
    }
  `
});

await runOperation("createBook", {
  query: `
    mutation {
      createBook(title: "Детство", year: 1852, authorId: "1") {
        id
        title
        author {
          name
        }
      }
    }
  `
});

await server.stop();
console.log("Smoke test completed");
