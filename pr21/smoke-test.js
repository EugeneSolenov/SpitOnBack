const { spawn } = require("child_process");

const BASE_URL = "http://localhost:3000";

function delay(ms) {
  return new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
}

async function request(path, options = {}) {
  const response = await fetch(`${BASE_URL}${path}`, options);
  const text = await response.text();
  const data = text ? JSON.parse(text) : null;

  return {
    status: response.status,
    data,
  };
}

function expect(condition, message) {
  if (!condition) {
    throw new Error(message);
  }
}

function unwrapCacheData(payload) {
  if (
    payload &&
    typeof payload === "object" &&
    Object.prototype.hasOwnProperty.call(payload, "source") &&
    Object.prototype.hasOwnProperty.call(payload, "data")
  ) {
    return payload.data;
  }

  return payload;
}

async function login(email, password) {
  const response = await request("/api/auth/login", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ email, password }),
  });

  expect(response.status === 200, `Login failed for ${email}: ${JSON.stringify(response.data)}`);
  return response.data;
}

async function waitForServer() {
  for (let index = 0; index < 30; index += 1) {
    try {
      const response = await fetch(`${BASE_URL}/api-docs/`);

      if (response.ok) {
        return;
      }
    } catch (error) {
      await delay(500);
    }
  }

  throw new Error("Server did not start in time");
}

async function run() {
  const server = spawn("node", ["index.js"], {
    cwd: __dirname,
    stdio: "ignore",
  });

  try {
    await waitForServer();

    const userTokens = await login("user@demo.local", "user1234");
    const sellerTokens = await login("seller@demo.local", "seller123");
    const adminTokens = await login("admin@demo.local", "admin123");

    const meResponse = await request("/api/auth/me", {
      headers: {
        Authorization: `Bearer ${adminTokens.accessToken}`,
      },
    });
    expect(meResponse.status === 200 && meResponse.data.role === "admin", "Admin profile should include role");

    const productsForUser = await request("/api/products", {
      headers: {
        Authorization: `Bearer ${userTokens.accessToken}`,
      },
    });
    const productList = unwrapCacheData(productsForUser.data);

    expect(productsForUser.status === 200, "User should be able to view products");
    expect(Array.isArray(productList), "Products response should include a product list");

    const userCreateAttempt = await request("/api/products", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${userTokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "User should fail",
        category: "Test",
        description: "Forbidden action",
        imageUrl: "https://example.com/product.png",
        price: 100,
      }),
    });
    expect(userCreateAttempt.status === 403, "User should not create products");

    const sellerCreateResponse = await request("/api/products", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${sellerTokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Smoke Test Product",
        category: "Tests",
        description: "Created by seller",
        imageUrl: "https://example.com/product.png",
        price: 1500,
      }),
    });
    expect(sellerCreateResponse.status === 201, "Seller should create products");

    const productId = sellerCreateResponse.data.id;

    const sellerUpdateResponse = await request(`/api/products/${productId}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${sellerTokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        title: "Smoke Test Product Updated",
        category: "Tests",
        description: "Updated by seller",
        imageUrl: "https://example.com/product.png",
        price: 1700,
      }),
    });
    expect(sellerUpdateResponse.status === 200, "Seller should update products");

    const sellerDeleteAttempt = await request(`/api/products/${productId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${sellerTokens.accessToken}`,
      },
    });
    expect(sellerDeleteAttempt.status === 403, "Seller should not delete products");

    const usersResponse = await request("/api/users", {
      headers: {
        Authorization: `Bearer ${adminTokens.accessToken}`,
      },
    });
    const userList = unwrapCacheData(usersResponse.data);

    expect(usersResponse.status === 200 && userList.length >= 3, "Admin should view users list");

    const registerResponse = await request("/api/auth/register", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "blocked-smoke@example.com",
        password: "secret12",
      }),
    });
    expect(registerResponse.status === 201, "Guest should register a user");

    const promoteResponse = await request(`/api/users/${registerResponse.data.id}`, {
      method: "PUT",
      headers: {
        Authorization: `Bearer ${adminTokens.accessToken}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        role: "seller",
        email: "blocked-smoke@example.com",
      }),
    });
    expect(promoteResponse.status === 200 && promoteResponse.data.role === "seller", "Admin should update user");

    const blockResponse = await request(`/api/users/${registerResponse.data.id}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminTokens.accessToken}`,
      },
    });
    expect(blockResponse.status === 200 && blockResponse.data.user.isBlocked, "Admin should block users");

    const blockedLogin = await request("/api/auth/login", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        email: "blocked-smoke@example.com",
        password: "secret12",
      }),
    });
    expect(blockedLogin.status === 403, "Blocked user should not login");

    const adminDeleteResponse = await request(`/api/products/${productId}`, {
      method: "DELETE",
      headers: {
        Authorization: `Bearer ${adminTokens.accessToken}`,
      },
    });
    expect(adminDeleteResponse.status === 200, "Admin should delete products");

    console.log("Smoke test passed");
  } finally {
    server.kill();
  }
}

run().catch((error) => {
  console.error(error.message);
  process.exit(1);
});
