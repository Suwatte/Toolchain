import type { CGRect } from "./source/image";

export type Rect = CGRect;

export interface NativeImage {
  readonly width: number;
  readonly height: number;
  dispose(): void;
}

export type NativeCanvasDrawOperation = {
  source: Rect;
  destination: Rect;
};

export interface NativeCanvas {
  draw(image: NativeImage, source: Rect, destination: Rect): void;
  drawBatch(image: NativeImage, operations: NativeCanvasDrawOperation[]): void;
  encode(format: "png" | "jpeg", quality?: number): Promise<Uint8Array>;
  dispose(): void;
}

/**
 * Keystream parameters for `Crypto.xorKeystream`. State arithmetic is 32-bit:
 * `lcg` advances `state = (state * multiplier + increment) | 0` and
 * `xorshift32` applies the 13/17/5 shift variant. Each output byte XORs the
 * input with the state's high byte (`byte: "high"`, default) or low byte.
 */
export type XorKeystreamOptions = {
  prng: "lcg" | "xorshift32";
  /** Initial PRNG state, coerced to int32. */
  seed: number;
  /** Bytes to decode from the start of the input. Defaults to the full input. */
  length?: number;
  /** Which byte of the PRNG state keys each XOR. Defaults to "high". */
  byte?: "high" | "low";
  /** Required when `prng` is "lcg". */
  multiplier?: number;
  /** Required when `prng` is "lcg". */
  increment?: number;
};

export interface NativeCrypto {
  md5(data: Uint8Array | string): Uint8Array;
  sha256(data: Uint8Array | string): Uint8Array;
  /** AES-CBC with PKCS#7 padding. */
  aesDecrypt(data: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array;
  /**
   * XORs the input with a PRNG keystream natively. Per-byte JS loops run two
   * orders of magnitude slower on device (JavaScriptCore has no JIT), so
   * sources should decode obfuscated image bodies through this primitive.
   */
  xorKeystream(data: Uint8Array, options: XorKeystreamOptions): Uint8Array;
}

declare global {
  /**
   * TypeScript's DOM library declares the capitalized `Crypto` value as an
   * anonymous constructor, which cannot be augmented directly. Constructor
   * values inherit Function, so these signatures make the v5 static surface
   * visible when DOM types are also present. Runtime installation remains
   * scoped to the `Crypto` global.
   */
  interface Function {
    md5(data: Uint8Array | string): Uint8Array;
    sha256(data: Uint8Array | string): Uint8Array;
    aesDecrypt(
      data: Uint8Array,
      key: Uint8Array,
      iv: Uint8Array,
    ): Uint8Array;
    xorKeystream(data: Uint8Array, options: XorKeystreamOptions): Uint8Array;
  }

  const NativeImage: {
    decode(bytes: Uint8Array): Promise<NativeImage>;
    readonly prototype: NativeImage;
  };
  const NativeCanvas: {
    new (width: number, height: number): NativeCanvas;
    readonly prototype: NativeCanvas;
  };
}
