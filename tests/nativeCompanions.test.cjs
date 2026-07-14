const test = require("node:test");
const assert = require("node:assert/strict");

const {
  Crypto,
  NativeCanvas,
  NativeImage,
  installEmulatorGlobals,
} = require("../dist/emulator");

const hex = (bytes) => Buffer.from(bytes).toString("hex");

test("Crypto hashes and AES-CBC decrypt match known vectors", () => {
  assert.equal(hex(Crypto.md5("hello")), "5d41402abc4b2a76b9719d911017c592");
  assert.equal(
    hex(Crypto.sha256("hello")),
    "2cf24dba5fb0a30e26e83b2ac5b9e29e1b161e5c1fa7425e73043362938b9824",
  );

  const ciphertext = Buffer.from("cda122e671f0f91095f426334e422b2b", "hex");
  const key = Buffer.from("000102030405060708090a0b0c0d0e0f", "hex");
  const iv = Buffer.from("101112131415161718191a1b1c1d1e1f", "hex");
  assert.equal(Buffer.from(Crypto.aesDecrypt(ciphertext, key, iv)).toString(), "hello world");
});

test("Crypto.xorKeystream matches the reference loops", () => {
  const int32 = (v) => v | 0;
  const input = Uint8Array.from({ length: 1024 }, (_, i) => (i * 31 + 7) & 0xff);

  const referenceLcg = (seed, length, multiplier, increment) => {
    const result = Uint8Array.from(input);
    let state = int32(seed);
    const limit = Math.min(result.length, Math.max(0, length));
    for (let i = 0; i < limit; i++) {
      state = int32(Math.imul(state, multiplier) + increment);
      result[i] ^= state >>> 24;
    }
    return result;
  };
  const referenceXorshift = (seed, length, highByte) => {
    const result = Uint8Array.from(input);
    let state = int32(seed);
    const limit = Math.min(result.length, Math.max(0, length));
    for (let i = 0; i < limit; i++) {
      state = int32(state ^ int32(state << 13));
      state = int32(state ^ (state >>> 17));
      state = int32(state ^ int32(state << 5));
      result[i] ^= highByte ? state >>> 24 : state & 0xff;
    }
    return result;
  };

  assert.deepEqual(
    Crypto.xorKeystream(input, {
      prng: "lcg",
      seed: -123456789,
      multiplier: 1000005,
      increment: 1234567891,
    }),
    referenceLcg(-123456789, input.length, 1000005, 1234567891),
  );
  assert.deepEqual(
    Crypto.xorKeystream(input, { prng: "xorshift32", seed: 987654321 }),
    referenceXorshift(987654321, input.length, true),
  );
  assert.deepEqual(
    Crypto.xorKeystream(input, { prng: "xorshift32", seed: 987654321, byte: "low" }),
    referenceXorshift(987654321, input.length, false),
  );
  assert.deepEqual(
    Crypto.xorKeystream(input, { prng: "xorshift32", seed: 42, length: 100 }),
    referenceXorshift(42, 100, true),
  );
  assert.throws(
    () => Crypto.xorKeystream(input, { prng: "rc4", seed: 1 }),
    /prng/,
  );
  assert.throws(
    () => Crypto.xorKeystream(input, { prng: "lcg", seed: 1 }),
    /multiplier/,
  );
});

test("native companion globals are installed with the emulator", () => {
  installEmulatorGlobals();
  assert.equal(globalThis.NativeImage, NativeImage);
  assert.equal(globalThis.NativeCanvas, NativeCanvas);
  assert.equal(globalThis.Crypto, Crypto);
});

test("NativeCanvas releases its queued drawing state explicitly", async () => {
  const canvas = new NativeCanvas(1, 1);
  canvas.dispose();
  await assert.rejects(canvas.encode("png"), /NativeCanvas was disposed/);
});

test("NativeImage and NativeCanvas use optional Sharp when available", async () => {
  const onePixelPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAFgwJ/lB6kWQAAAABJRU5ErkJggg==",
    "base64",
  );
  let hasSharp = true;
  try {
    require.resolve("sharp");
  } catch {
    hasSharp = false;
  }

  if (!hasSharp) {
    await assert.rejects(
      NativeImage.decode(onePixelPng),
      /requires the optional 'sharp' peer dependency/,
    );
    return;
  }

  const image = await NativeImage.decode(onePixelPng);
  assert.equal(image.width, 1);
  assert.equal(image.height, 1);
  const canvas = new NativeCanvas(2, 2);
  canvas.drawBatch(image, [
    {
      source: { origin: { x: 0, y: 0 }, size: { width: 1, height: 1 } },
      destination: { origin: { x: 0, y: 0 }, size: { width: 2, height: 2 } },
    },
  ]);
  const encoded = await canvas.encode("png");
  assert.equal(Buffer.from(encoded).subarray(1, 4).toString(), "PNG");
  canvas.dispose();
  image.dispose();
});
