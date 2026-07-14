import {
  createDecipheriv,
  createHash,
} from "node:crypto";
import type {
  NativeCanvas as NativeCanvasShape,
  NativeCanvasDrawOperation,
  NativeImage as NativeImageShape,
  Rect,
  XorKeystreamOptions,
} from "../types";

type SharpPipeline = {
  metadata(): Promise<{ width?: number; height?: number }>;
  extract(region: { left: number; top: number; width: number; height: number }): SharpPipeline;
  resize(width: number, height: number): SharpPipeline;
  composite(inputs: Array<{ input: Buffer; left: number; top: number }>): SharpPipeline;
  flatten(options: { background: string }): SharpPipeline;
  png(): SharpPipeline;
  jpeg(options: { quality: number }): SharpPipeline;
  toBuffer(): Promise<Buffer>;
};

type SharpFactory = (
  input?: Buffer | { create: { width: number; height: number; channels: 4; background: string } },
) => SharpPipeline;

const sharp = (): SharpFactory => {
  try {
    return require("sharp") as SharpFactory;
  } catch {
    throw new Error(
      "NativeImage/NativeCanvas emulation requires the optional 'sharp' peer dependency",
    );
  }
};

const bytes = (value: Uint8Array): Buffer => {
  if (!(value instanceof Uint8Array)) {
    throw new TypeError("expected a Uint8Array");
  }
  return Buffer.from(value.buffer, value.byteOffset, value.byteLength);
};

const validRect = (rect: Rect): boolean =>
  Number.isFinite(rect?.origin?.x) &&
  Number.isFinite(rect?.origin?.y) &&
  Number.isFinite(rect?.size?.width) &&
  Number.isFinite(rect?.size?.height) &&
  rect.size.width > 0 &&
  rect.size.height > 0;

export class NativeImage implements NativeImageShape {
  readonly width: number;
  readonly height: number;
  private encodedData: Buffer | null;

  private constructor(data: Buffer, width: number, height: number) {
    this.encodedData = Buffer.from(data);
    this.width = width;
    this.height = height;
  }

  static async decode(input: Uint8Array): Promise<NativeImage> {
    const data = bytes(input);
    const metadata = await sharp()(data).metadata();
    if (!metadata.width || !metadata.height) {
      throw new Error("NativeImage.decode expected valid encoded image bytes");
    }
    return new NativeImage(data, metadata.width, metadata.height);
  }

  encodedBytes(): Buffer {
    if (!this.encodedData) {
      throw new Error("NativeImage was disposed");
    }
    return this.encodedData;
  }

  dispose(): void {
    this.encodedData = null;
  }
}

type DrawCommand = {
  image: NativeImage;
  source: Rect;
  destination: Rect;
};

export class NativeCanvas implements NativeCanvasShape {
  private readonly commands: DrawCommand[] = [];
  private disposed = false;

  constructor(
    readonly width: number,
    readonly height: number,
  ) {
    if (
      !Number.isSafeInteger(width) ||
      !Number.isSafeInteger(height) ||
      width <= 0 ||
      height <= 0 ||
      width > 16_384 ||
      height > 16_384 ||
      width * height > 100_000_000
    ) {
      throw new RangeError("NativeCanvas dimensions must be positive finite integers");
    }
  }

  draw(image: NativeImageShape, source: Rect, destination: Rect): void {
    if (this.disposed) {
      throw new Error("NativeCanvas was disposed");
    }
    if (!(image instanceof NativeImage)) {
      throw new TypeError("NativeCanvas.draw expected a NativeImage");
    }
    if (!validRect(source) || !validRect(destination)) {
      throw new RangeError("NativeCanvas.draw rectangles must have positive sizes");
    }
    this.commands.push({ image, source, destination });
  }

  drawBatch(
    image: NativeImageShape,
    operations: NativeCanvasDrawOperation[],
  ): void {
    if (!Array.isArray(operations)) {
      throw new TypeError("NativeCanvas.drawBatch expected an operation array");
    }
    for (const operation of operations) {
      this.draw(image, operation.source, operation.destination);
    }
  }

  async encode(format: "png" | "jpeg", quality = 0.9): Promise<Uint8Array> {
    if (this.disposed) {
      throw new Error("NativeCanvas was disposed");
    }
    if (format !== "png" && format !== "jpeg") {
      throw new TypeError("NativeCanvas.encode format must be png or jpeg");
    }

    const factory = sharp();
    const composites = await Promise.all(
      this.commands.map(async ({ image, source, destination }) => {
        const left = Math.max(0, Math.floor(source.origin.x));
        const top = Math.max(0, Math.floor(source.origin.y));
        const right = Math.min(image.width, Math.ceil(source.origin.x + source.size.width));
        const bottom = Math.min(image.height, Math.ceil(source.origin.y + source.size.height));
        if (right <= left || bottom <= top) {
          throw new RangeError("NativeCanvas.draw source rectangle is outside the image");
        }

        const widthScale = destination.size.width / source.size.width;
        const heightScale = destination.size.height / source.size.height;
        const outputWidth = Math.max(1, Math.round((right - left) * widthScale));
        const outputHeight = Math.max(1, Math.round((bottom - top) * heightScale));
        const output = await factory(image.encodedBytes())
          .extract({ left, top, width: right - left, height: bottom - top })
          .resize(outputWidth, outputHeight)
          .png()
          .toBuffer();
        return {
          input: output,
          left: Math.round(
            destination.origin.x + (left - source.origin.x) * widthScale,
          ),
          top: Math.round(
            destination.origin.y + (top - source.origin.y) * heightScale,
          ),
        };
      }),
    );

    let pipeline = factory({
      create: {
        width: this.width,
        height: this.height,
        channels: 4,
        background: "#00000000",
      },
    }).composite(composites);
    if (format === "png") {
      pipeline = pipeline.png();
    } else {
      pipeline = pipeline
        .flatten({ background: "#000000" })
        .jpeg({ quality: Math.round(Math.min(Math.max(quality, 0), 1) * 100) });
    }
    return Uint8Array.from(await pipeline.toBuffer());
  }

  dispose(): void {
    this.disposed = true;
    this.commands.length = 0;
  }
}

export const Crypto = Object.freeze({
  md5(input: Uint8Array | string): Uint8Array {
    return Uint8Array.from(
      createHash("md5")
        .update(typeof input === "string" ? Buffer.from(input, "utf8") : bytes(input))
        .digest(),
    );
  },

  sha256(input: Uint8Array | string): Uint8Array {
    return Uint8Array.from(
      createHash("sha256")
        .update(typeof input === "string" ? Buffer.from(input, "utf8") : bytes(input))
        .digest(),
    );
  },

  aesDecrypt(input: Uint8Array, key: Uint8Array, iv: Uint8Array): Uint8Array {
    const keyBytes = bytes(key);
    const ivBytes = bytes(iv);
    if (![16, 24, 32].includes(keyBytes.length) || ivBytes.length !== 16) {
      throw new RangeError("Crypto.aesDecrypt expected AES key and IV byte lengths");
    }
    const decipher = createDecipheriv(
      `aes-${keyBytes.length * 8}-cbc`,
      keyBytes,
      ivBytes,
    );
    return Uint8Array.from(
      Buffer.concat([decipher.update(bytes(input)), decipher.final()]),
    );
  },

  xorKeystream(input: Uint8Array, options: XorKeystreamOptions): Uint8Array {
    if (!(input instanceof Uint8Array)) {
      throw new TypeError("Crypto.xorKeystream expected a Uint8Array");
    }
    if (options == null || typeof options !== "object") {
      throw new TypeError("Crypto.xorKeystream expected an options object");
    }
    if (!Number.isFinite(options.seed)) {
      throw new TypeError("Crypto.xorKeystream seed must be a finite number");
    }
    if (options.length !== undefined && !Number.isFinite(options.length)) {
      throw new TypeError("Crypto.xorKeystream length must be a finite number");
    }
    if (options.byte !== undefined && !["high", "low"].includes(options.byte)) {
      throw new TypeError('Crypto.xorKeystream byte must be "high" or "low"');
    }

    const result = Uint8Array.from(input);
    const rawLength = options.length ?? result.length;
    const limit = Math.min(result.length, Math.max(0, Math.trunc(rawLength)));
    const highByte = (options.byte ?? "high") === "high";
    let state = options.seed | 0;

    if (options.prng === "lcg") {
      if (
        !Number.isFinite(options.multiplier) ||
        !Number.isFinite(options.increment)
      ) {
        throw new TypeError(
          "Crypto.xorKeystream lcg requires finite multiplier and increment",
        );
      }
      const multiplier = options.multiplier! | 0;
      const increment = options.increment! | 0;
      for (let index = 0; index < limit; index++) {
        state = (Math.imul(state, multiplier) + increment) | 0;
        result[index] ^= highByte ? state >>> 24 : state & 0xff;
      }
    } else if (options.prng === "xorshift32") {
      for (let index = 0; index < limit; index++) {
        state = (state ^ (state << 13)) | 0;
        state = (state ^ (state >>> 17)) | 0;
        state = (state ^ (state << 5)) | 0;
        result[index] ^= highByte ? state >>> 24 : state & 0xff;
      }
    } else {
      throw new TypeError(
        'Crypto.xorKeystream prng must be "lcg" or "xorshift32"',
      );
    }

    return result;
  },
});
