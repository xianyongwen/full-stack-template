import assert from "node:assert/strict";
import { test } from "node:test";
import { buildApp } from "./app.js";

test("GET /health returns ok", async () => {
  const app = await buildApp();
  const res = await app.inject({ method: "GET", url: "/health" });
  assert.equal(res.statusCode, 200);
  assert.deepEqual(JSON.parse(res.body), { ok: true });
  await app.close();
});
