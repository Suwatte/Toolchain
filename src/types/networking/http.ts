import type { JsonObject } from "../utils";
import type { Cookie } from "./request";

export type Primitive = string | number | boolean | null;
export type Awaitable<T> = T | Promise<T>;
export type BodyInit = JsonObject | string | Uint8Array;

export type NativeImageTransformPlan = {
  kind: "tilePermutation";
  columns: number;
  rows: number;
  /** Maps each destination tile index to its source tile index. */
  order: number[];
};

export type HttpRetries = number | { count: number; delay?: number };

export type HttpClientConfig = {
  baseUrl?: string;
  headers?: Record<string, string>;
  params?: Record<string, Primitive>;
  cookies?: Cookie[];
  /** Request timeout in milliseconds. */
  timeout?: number;
  /** Transport failures only. Object delay is expressed in milliseconds. */
  retries?: HttpRetries;
  rateLimit?: { permits: number; period: number };
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
  cloudflareResolutionURL?: string;
};

export type RequestConfig = {
  params?: Record<string, Primitive>;
  headers?: Record<string, string>;
  cookies?: Cookie[];
  timeout?: number;
  retries?: HttpRetries;
  maxRedirects?: number;
  validateStatus?: (status: number) => boolean;
  /** Opaque interceptor-only data. This is never sent over the network. */
  context?: JsonObject;
};

export interface HttpHeaders {
  get(name: string): string | null;
  has(name: string): boolean;
  set(name: string, value: string): void;
  delete(name: string): void;
  entries(): [string, string][];
  toJSON(): Record<string, string>;
}

export interface HttpRequest {
  url: string;
  method: string;
  headers: HttpHeaders;
  params: Record<string, Primitive>;
  cookies: Cookie[];
  body?: BodyInit;
  readonly context?: JsonObject;
}

export interface HttpResponse {
  readonly status: number;
  readonly url: string;
  readonly headers: HttpHeaders;
  readonly request: HttpRequest;
  readonly ok: boolean;

  text(): Promise<string>;
  json<T = unknown>(): Promise<T>;
  bytes(): Promise<Uint8Array>;
  arrayBuffer(): Promise<ArrayBuffer>;
  replaceBody(body: string | Uint8Array): HttpResponse;
  /** Defers a lossless pixel rearrangement to the native image pipeline. */
  deferImageTransform(plan: NativeImageTransformPlan): HttpResponse;
  rebuild(patch: {
    status?: number;
    headers?: Record<string, string>;
    body?: string | Uint8Array;
  }): HttpResponse;
}

export interface HttpClient {
  readonly interceptors: {
    request: {
      use(fn: (request: HttpRequest) => Awaitable<HttpRequest>): void;
    };
    response: {
      use(fn: (response: HttpResponse) => Awaitable<HttpResponse>): void;
    };
  };

  get(url: string, config?: RequestConfig): Promise<HttpResponse>;
  delete(url: string, config?: RequestConfig): Promise<HttpResponse>;
  head(url: string, config?: RequestConfig): Promise<HttpResponse>;
  post(url: string, body?: BodyInit, config?: RequestConfig): Promise<HttpResponse>;
  put(url: string, body?: BodyInit, config?: RequestConfig): Promise<HttpResponse>;
  patch(url: string, body?: BodyInit, config?: RequestConfig): Promise<HttpResponse>;
  request(
    config: RequestConfig & {
      url: string;
      method?: string;
      body?: BodyInit;
    },
  ): Promise<HttpResponse>;
}

export interface HttpError extends Error {
  readonly request: HttpRequest;
  readonly response?: HttpResponse;
}

declare global {
  const HttpHeaders: {
    new (init?: Record<string, string>): HttpHeaders;
    readonly prototype: HttpHeaders;
  };
  const HttpRequest: {
    readonly prototype: HttpRequest;
  };
  const HttpResponse: {
    readonly prototype: HttpResponse;
  };
  const HttpClient: {
    new (config?: HttpClientConfig): HttpClient;
    readonly prototype: HttpClient;
  };
  const HttpError: {
    readonly prototype: HttpError;
  };
}
