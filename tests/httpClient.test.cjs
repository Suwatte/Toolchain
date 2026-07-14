const test = require("node:test");
const assert = require("node:assert/strict");
const http = require("node:http");

const {
  CloudflareError,
  HttpClient,
  HttpError,
  HttpResponse,
  installEmulatorGlobals,
} = require("../dist/emulator");

let server;
let baseUrl;
let retryAttempts = 0;

test.before(async () => {
  server = http.createServer((request, response) => {
    if (request.url === "/retry" && retryAttempts++ === 0) {
      request.socket.destroy();
      return;
    }
    if (request.url === "/redirect") {
      response.writeHead(302, { Location: "/json" });
      response.end();
      return;
    }
    if (request.url === "/missing") {
      response.writeHead(404, { "Content-Type": "text/plain" });
      response.end("missing");
      return;
    }
    if (request.url === "/challenge") {
      response.writeHead(403, { "Content-Type": "text/html" });
      response.end("<html>checking your browser cf-chl</html>");
      return;
    }
    response.writeHead(200, {
      "Content-Type": "application/json",
      "X-Case": "Yes",
    });
    response.end('{"value":1}');
  });
  await new Promise((resolve) => server.listen(0, "127.0.0.1", resolve));
  const address = server.address();
  baseUrl = `http://127.0.0.1:${address.port}`;
});

test.after(async () => {
  await new Promise((resolve, reject) =>
    server.close((error) => (error ? reject(error) : resolve())),
  );
});

test("HttpResponse reads are idempotent and binary-capable", async () => {
  const response = await new HttpClient({ baseUrl }).get("/json");

  assert.equal(response.ok, true);
  assert.equal(response.headers.get("x-case"), "Yes");
  assert.equal(await response.text(), '{"value":1}');
  assert.equal(await response.text(), '{"value":1}');
  assert.deepEqual(await response.json(), { value: 1 });
  assert.ok((await response.bytes()) instanceof Uint8Array);
  assert.equal((await response.arrayBuffer()).byteLength, 11);
});

test("interceptors run before validation and enforce response identity", async () => {
  const client = new HttpClient({ baseUrl });
  let context;
  client.interceptors.request.use((request) => {
    context = request.context;
    request.headers.set("Authorization", "Bearer token");
    return request;
  });
  client.interceptors.response.use((response) =>
    response.rebuild({ status: 200 }),
  );

  const response = await client.get("/missing", {
    context: { page: "one" },
  });
  assert.equal(response.status, 200);
  assert.deepEqual(context, { page: "one" });

  const invalid = new HttpClient({ baseUrl });
  invalid.interceptors.response.use((response) => ({ ...response }));
  await assert.rejects(
    invalid.get("/json"),
    /response interceptor must return an HttpResponse/,
  );
});

test("HttpError retains an idempotently readable response", async () => {
  const error = await new HttpClient({ baseUrl })
    .get("/missing")
    .then(() => undefined, (reason) => reason);
  assert.ok(error instanceof HttpError);
  assert.equal(error.response.status, 404);
  assert.equal(await error.response.text(), "missing");
  assert.equal(await error.response.text(), "missing");
});

test("replacement preserves the original and image take is terminal", async () => {
  const response = await new HttpClient({ baseUrl }).get("/json");
  const replacement = response.replaceBody(new Uint8Array([104, 105]));

  assert.equal(await replacement.text(), "hi");
  assert.equal(await response.text(), '{"value":1}');
  assert.ok(response instanceof HttpResponse);
  assert.equal(response.__takeBodyForImage().toString("utf8"), '{"value":1}');
  await assert.rejects(response.text(), /response body was taken by the image pipeline/);
});

test("deferred native image transforms preserve the body and validate permutations", async () => {
  const response = await new HttpClient({ baseUrl }).get("/json");
  const transformed = response.deferImageTransform({
    kind: "tilePermutation",
    columns: 2,
    rows: 1,
    order: [1, 0],
  });

  assert.deepEqual(transformed.__imageTransformForImage(), {
    kind: "tilePermutation",
    columns: 2,
    rows: 1,
    order: [1, 0],
  });
  assert.equal(await transformed.text(), '{"value":1}');
  assert.equal(response.__imageTransformForImage(), undefined);
  assert.throws(
    () =>
      response.deferImageTransform({
        kind: "tilePermutation",
        columns: 2,
        rows: 1,
        order: [0, 0],
      }),
    /invalid native image transform permutation/,
  );
});

test("transport retries, redirect limits, and Cloudflare classification match v2", async () => {
  retryAttempts = 0;
  const retried = await new HttpClient({
    baseUrl,
    retries: { count: 1, delay: 1 },
  }).get("/retry");
  assert.equal(retried.status, 200);
  assert.equal(retryAttempts, 2);

  await assert.rejects(
    new HttpClient({ baseUrl, maxRedirects: 0 }).get("/redirect"),
    (error) => error instanceof HttpError && error.response.status === 302,
  );
  await assert.rejects(
    new HttpClient({ baseUrl }).get("/challenge"),
    (error) => error instanceof CloudflareError,
  );
});

test("emulator global installation exposes both network APIs", () => {
  installEmulatorGlobals();
  assert.equal(globalThis.NetworkClient.name, "NetworkClient");
  assert.equal(globalThis.HttpClient.name, "HttpClient");
});
