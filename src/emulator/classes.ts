import {
  BodyInit as HttpBodyInit,
  HttpClient as HttpClientShape,
  HttpClientConfig,
  HttpHeaders as HttpHeadersShape,
  HttpRequest as HttpRequestShape,
  HttpResponse as HttpResponseShape,
  NativeImageTransformPlan,
  NetworkRequest,
  NetworkRequestConfig,
  NetworkRequestTransformer,
  NetworkResponse,
  NetworkResponseTransformer,
  Primitive,
  RequestConfig,
} from "../types";
import axios from "axios";
import http from "http";
import https from "https";
import { Crypto, NativeCanvas, NativeImage } from "./native";

const globalObject = globalThis as Record<string, any>;
type JsonObject = Record<string, any>;

type Cookie = {
  name: string;
  value: string;
};

type BuilderLike = {
  requestTransformers?: NetworkRequestTransformer[];
  responseTransformers?: NetworkResponseTransformer[];
  headers?: Record<string, string | number | boolean>;
  cookies?: Cookie[];
  timeout?: number;
  statusValidator?: (status: number) => boolean;
  maxRetries?: number;
  requestsPerSecond?: number;
};

type CombinedRequest = NetworkRequest & {
  transformRequest: NetworkRequestTransformer[];
  transformResponse: NetworkResponseTransformer[];
  cookies: Cookie[];
};

// STORE
export class GlobalStore {
  secure: Record<string, string> = {};
  objects: Record<string, string> = {};
}

const globalStore = new GlobalStore();

// Object Store
export class STTStore {
  private readonly store: "ss" | "os";

  constructor(key: "ss" | "os") {
    this.store = key;
  }

  private get targetStore() {
    return this.store === "ss" ? globalStore.secure : globalStore.objects;
  }

  async get(key: string) {
    const value = this.targetStore[key];
    return value ? JSON.parse(value) : null;
  }

  async set(key: string, value: any) {
    this.targetStore[key] = JSON.stringify(value);
  }

  async remove(key: string) {
    delete this.targetStore[key];
  }

  async string(key: string) {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }

    if (typeof value !== "string") {
      throw new Error("ObjectStore Type Assertion failed, value is not a string");
    }

    return value;
  }

  async boolean(key: string) {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }

    if (typeof value !== "boolean") {
      throw new Error("ObjectStore Type Assertion failed, value is not a boolean");
    }

    return value;
  }

  async number(key: string) {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }

    if (typeof value !== "number") {
      throw new Error("ObjectStore Type Assertion failed, value is not a number");
    }

    return value;
  }

  async stringArray(key: string): Promise<string[] | null> {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }

    if (!Array.isArray(value)) {
      throw new Error("ObjectStore type assertion failed, value is not an array");
    }

    const isValid = value.every((item) => typeof item === "string");
    if (!isValid) {
      throw new Error(
        "ObjectStore Type Assertion Failed, elements of array are not strings"
      );
    }

    return value;
  }

  async object(key: string): Promise<JsonObject | null> {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }

    if (typeof value !== "object" || Array.isArray(value)) {
      throw new Error(
        "ObjectStore Type Assertion Failed, value is not a JSON object"
      );
    }

    return value as JsonObject;
  }
}

// ERROR
export class NetworkError extends Error {
  req: NetworkRequest;
  res: NetworkResponse;

  constructor(
    name: string,
    message: string,
    req: NetworkRequest,
    res: NetworkResponse
  ) {
    super(message);
    this.req = req;
    this.res = res;
    this.name = name;
  }
}

export class CloudflareError extends Error {
  resolutionURL?: string;

  constructor(resolutionURL?: string) {
    super("The requested resource is cloudflare protected");
    this.name = "CloudflareError";
    this.resolutionURL = resolutionURL;
  }
}

/**
 * Stands in for the app's `Application` global. Tests set the intent they need.
 */
export class EmulatorApplication {
  contentIntent: { isSafeModeEnabled: boolean };

  constructor(contentIntent = { isSafeModeEnabled: false }) {
    this.contentIntent = contentIntent;
  }

  async getContentIntent() {
    return { ...this.contentIntent };
  }
}

export type EmulatorGlobalOverrides = Partial<{
  Application: EmulatorApplication;
  ObjectStore: STTStore;
  SecureStore: STTStore;
  NetworkClient: typeof NetworkClient;
  CloudflareError: typeof CloudflareError;
  NetworkError: typeof NetworkError;
  HttpClient: typeof HttpClient;
  HttpHeaders: typeof HttpHeaders;
  HttpRequest: typeof HttpRequest;
  HttpResponse: typeof HttpResponse;
  HttpError: typeof HttpError;
  NativeImage: typeof NativeImage;
  NativeCanvas: typeof NativeCanvas;
  Crypto: typeof Crypto;
}>;

// NETWORK CLIENT
export class NetworkClient {
  requestTransformers: NetworkRequestTransformer[] = [];
  responseTransformers: NetworkResponseTransformer[] = [];
  headers: Record<string, string | number | boolean> = {};
  cookies: Cookie[] = [];
  timeout?: number;
  statusValidator?: (status: number) => boolean;
  maxRetries?: number;

  // Rate Limiting
  buffer: Array<{
    request: () => Promise<NetworkResponse>;
    resolve: (value: NetworkResponse) => void;
    reject: (error: unknown) => void;
  }> = [];
  lastRequestTime = 0;
  requestsPerSecond = 999;

  constructor(builder?: BuilderLike) {
    if (!builder) {
      return;
    }

    this.requestTransformers = builder.requestTransformers ?? [];
    this.responseTransformers = builder.responseTransformers ?? [];
    this.headers = builder.headers ?? {};
    this.cookies = builder.cookies ?? [];
    this.timeout = builder.timeout;
    this.statusValidator = builder.statusValidator;
    this.maxRetries = builder.maxRetries;
    this.requestsPerSecond = builder.requestsPerSecond ?? this.requestsPerSecond;
  }

  private combine(request: NetworkRequest): CombinedRequest {
    const requestTransformers = [...this.requestTransformers];
    if (request.transformRequest) {
      if (typeof request.transformRequest === "function") {
        requestTransformers.push(request.transformRequest);
      } else {
        requestTransformers.push(...request.transformRequest);
      }
    }

    const responseTransformers = [...this.responseTransformers];
    if (request.transformResponse) {
      if (typeof request.transformResponse === "function") {
        responseTransformers.push(request.transformResponse);
      } else {
        responseTransformers.push(...request.transformResponse);
      }
    }

    return {
      ...request,
      method: request.method ?? "GET",
      headers: {
        ...this.headers,
        ...request.headers,
      },
      cookies: [...this.cookies, ...(request.cookies ?? [])],
      timeout: request.timeout ?? this.timeout,
      maxRetries: request.maxRetries ?? this.maxRetries,
      transformRequest: requestTransformers,
      transformResponse: responseTransformers,
      validateStatus: request.validateStatus ?? this.statusValidator,
    };
  }

  async get(url: string, config?: NetworkRequestConfig) {
    return this.request({ url, method: "GET", ...(config ?? {}) });
  }

  async post(url: string, config?: NetworkRequestConfig) {
    return this.request({ url, method: "POST", ...(config ?? {}) });
  }

  async request(input: NetworkRequest) {
    const combined = this.combine(input);
    const request = (await this.factory(
      combined,
      combined.transformRequest
    )) as CombinedRequest;

    if (!this.requestsPerSecond) {
      return this.dispatch(request, request.transformResponse);
    }

    return this.rateLimitedRequest(() =>
      this.dispatch(request, request.transformResponse)
    );
  }

  private async dispatch(
    request: CombinedRequest,
    responseTransformers: NetworkResponseTransformer[]
  ): Promise<NetworkResponse> {
    const axResponse = await this.sendAxiosRequest(request);

    let response: NetworkResponse = {
      headers: axResponse.headers as JsonObject,
      status: axResponse.status,
      data:
        typeof axResponse.data === "string"
          ? axResponse.data
          : JSON.stringify(axResponse.data),
      request,
    };

    response = await this.factory(response, responseTransformers);

    const defaultValidateStatus = (status: number) =>
      status >= 200 && status < 300;
    const validateStatus = request.validateStatus ?? defaultValidateStatus;

    if (!validateStatus(response.status)) {
      const serverHeader = String(
        response.headers["server"] ?? response.headers["Server"] ?? ""
      ).toLowerCase();

      if ([503, 403].includes(response.status) && serverHeader.includes("cloudflare")) {
        throw new CloudflareError();
      }

      const error = new NetworkError(
        "NetworkError",
        `Request failed with status ${response.status}`,
        request,
        response
      );

      switch (response.status) {
        case 400:
          error.message = "Bad Request";
          break;
        case 401:
          error.message = "Unauthorized";
          break;
        case 403:
          error.message = "Forbidden";
          break;
        case 404:
          error.message =
            "Not Found.\nThe server cannot find the requested resource.";
          break;
        case 405:
          error.message =
            "Method Not Allowed\nThe request method is known by the server but is not supported by the target resource.";
          break;
        case 410:
          error.message = "Gone.";
          break;
        case 429:
          error.message = "Too Many Requests.";
          break;
        case 431:
          error.message =
            "Request Header Fields Too Large.\nThe server is unwilling to process the request because its header fields are too large.";
          break;
        case 500:
          error.message =
            "Internal Server Error.\nThe server has encountered a situation it does not know how to handle.";
          break;
        case 501:
          error.message =
            "Not Implemented\nThe request method is not supported by the server and cannot be handled.";
          break;
        case 502:
          error.message =
            "Bad Gateway\nThis error response means that the server, while working as a gateway to get a response needed to handle the request, got an invalid response.";
          break;
        case 503:
          error.message =
            "Service Unavailable.\nThe server is not ready to handle the request.";
          break;
        case 504:
          error.message =
            "Gateway Timeout\nThis error response is given when the server is acting as a gateway and cannot get a response in time.";
          break;
      }

      throw error;
    }

    return {
      ...response,
      request,
    };
  }

  private async sendAxiosRequest(request: CombinedRequest) {
    const cookieHeader = request.cookies.map((v) => `${v.name}=${v.value}`).join("; ");
    const contentType = Object.entries(request.headers ?? {}).find(
      ([name]) => name.toLowerCase() === "content-type",
    )?.[1];
    if (
      String(contentType ?? "").toLowerCase().includes("application/x-www-form-urlencoded") &&
      request.body !== undefined &&
      (request.body === null ||
        typeof request.body !== "object" ||
        Array.isArray(request.body))
    ) {
      throw new TypeError(
        "NetworkClient form bodies must be plain objects. Suwatte's native " +
          "JavaScriptCore bridge performs URL encoding and cannot convert a " +
          "pre-serialized body to [String: Any].",
      );
    }
    const retries = request.maxRetries ?? 0;
    let attempt = 0;

    while (true) {
      try {
        return await axios({
          method: request.method,
          params: request.params,
          url: request.url,
          headers: {
            ...request.headers,
            ...(cookieHeader.length > 0 ? { Cookie: cookieHeader } : {}),
            Connection: "close",
          },
          data: request.body,
          timeout: request.timeout,
          validateStatus: () => true,
          httpAgent: new http.Agent({ keepAlive: false }),
          httpsAgent: new https.Agent({ keepAlive: false }),
        });
      } catch (error) {
        if (attempt >= retries) {
          throw error;
        }
        attempt += 1;
      }
    }
  }

  private async factory<T>(
    value: T,
    methods: Array<(value: T) => Promise<T>>
  ): Promise<T> {
    let result = value;
    for (const method of methods) {
      result = await method(result);
    }
    return result;
  }

  private rateLimitedRequest(request: () => Promise<NetworkResponse>) {
    return new Promise<NetworkResponse>((resolve, reject) => {
      this.buffer.push({
        request,
        resolve,
        reject,
      });
      this.processBuffer();
    });
  }

  private processBuffer() {
    if (this.buffer.length === 0) {
      return;
    }

    const now = Date.now();
    const timeSinceLastRequest = now - this.lastRequestTime;
    const delay = 1000 / this.requestsPerSecond;

    if (timeSinceLastRequest >= delay) {
      const next = this.buffer.shift();
      if (!next) {
        return;
      }

      this.lastRequestTime = now;
      next.request().then(next.resolve).catch(next.reject);
      this.processBuffer();
      return;
    }

    const timer = setTimeout(() => this.processBuffer(), delay - timeSinceLastRequest);
    if (typeof timer === "object" && "unref" in timer) timer.unref();
  }
}

type HttpRequestInput = RequestConfig & {
  url: string;
  method?: string;
  body?: HttpBodyInit;
  cloudflareResolutionURL?: string;
};

type NormalizedRetries = { count: number; delay?: number };

export class HttpHeaders implements HttpHeadersShape {
  private readonly values = new Map<string, { name: string; value: string }>();

  constructor(init?: Record<string, unknown> | HttpHeadersShape) {
    if (init && "entries" in init && typeof init.entries === "function") {
      for (const [name, value] of init.entries()) this.set(name, value);
      return;
    }
    for (const [name, value] of Object.entries(init ?? {})) {
      this.set(name, Array.isArray(value) ? value.join(", ") : String(value));
    }
  }

  get(name: string): string | null {
    return this.values.get(name.toLowerCase())?.value ?? null;
  }

  has(name: string): boolean {
    return this.values.has(name.toLowerCase());
  }

  set(name: string, value: string): void {
    this.values.set(name.toLowerCase(), { name, value: String(value) });
  }

  delete(name: string): void {
    this.values.delete(name.toLowerCase());
  }

  entries(): [string, string][] {
    return [...this.values.values()].map(({ name, value }) => [name, value]);
  }

  toJSON(): Record<string, string> {
    return Object.fromEntries(this.entries());
  }
}

const resolveHttpUrl = (base: string | undefined, input: string): string => {
  if (!base || /^[a-z][a-z0-9+.-]*:\/\//i.test(input)) return input;
  if (input.startsWith("//")) return `${base.split("://")[0]}:${input}`;
  const normalizedBase = base.endsWith("/") ? base.slice(0, -1) : base;
  return normalizedBase + (input.startsWith("/") ? input : `/${input}`);
};

const normalizeRetries = (
  retries: HttpClientConfig["retries"],
): NormalizedRetries | undefined => {
  if (retries == null) return undefined;
  const count = Number(typeof retries === "object" ? retries.count : retries);
  if (!Number.isFinite(count) || count <= 0) return undefined;
  const rawDelay = typeof retries === "object" ? retries.delay : undefined;
  const delay = Number(rawDelay);
  return {
    count: Math.floor(count),
    delay:
      rawDelay !== undefined && Number.isFinite(delay) && delay > 0
        ? delay
        : undefined,
  };
};

export class HttpRequest implements HttpRequestShape {
  url: string;
  method: string;
  headers: HttpHeaders;
  params: Record<string, Primitive>;
  cookies: Cookie[];
  body?: HttpBodyInit;
  readonly context?: JsonObject;
  readonly timeout?: number;
  readonly retries?: NormalizedRetries;
  readonly maxRedirects?: number;
  readonly validateStatus?: (status: number) => boolean;
  readonly cloudflareResolutionURL?: string;

  constructor(input: HttpRequestInput, clientConfig: HttpClientConfig) {
    this.url = resolveHttpUrl(clientConfig.baseUrl, input.url);
    this.method = String(input.method ?? "GET").toUpperCase();
    this.headers = new HttpHeaders({
      ...(clientConfig.headers ?? {}),
      ...(input.headers ?? {}),
    });
    this.params = { ...(clientConfig.params ?? {}), ...(input.params ?? {}) };
    this.cookies = [...(clientConfig.cookies ?? []), ...(input.cookies ?? [])];
    this.body = input.body;
    this.context = input.context;
    this.timeout = input.timeout ?? clientConfig.timeout;
    this.retries = normalizeRetries(input.retries ?? clientConfig.retries);
    const redirects = Number(input.maxRedirects ?? clientConfig.maxRedirects);
    this.maxRedirects = Number.isFinite(redirects)
      ? Math.max(0, Math.floor(redirects))
      : undefined;
    this.validateStatus = input.validateStatus ?? clientConfig.validateStatus;
    this.cloudflareResolutionURL =
      input.cloudflareResolutionURL ??
      clientConfig.cloudflareResolutionURL ??
      globalObject.SourceConfiguration?.cloudflareResolutionURL;

    const isObjectBody =
      this.body !== null &&
      typeof this.body === "object" &&
      !(this.body instanceof Uint8Array);
    if (isObjectBody && !this.headers.has("content-type")) {
      this.headers.set("Content-Type", "application/json");
    }
  }
}

class EmulatorResponseHandle {
  private body: Buffer | null;

  constructor(body: Buffer) {
    this.body = Buffer.from(body);
  }

  read(): Buffer {
    if (!this.body) {
      throw new Error("response body was taken by the image pipeline");
    }
    return this.body;
  }

  replacing(body: string | Uint8Array): EmulatorResponseHandle {
    return new EmulatorResponseHandle(
      typeof body === "string" ? Buffer.from(body, "utf8") : Buffer.from(body),
    );
  }

  take(): Buffer {
    const body = this.read();
    this.body = null;
    return body;
  }
}

export class HttpResponse implements HttpResponseShape {
  readonly status: number;
  readonly url: string;
  readonly headers: HttpHeaders;
  readonly request: HttpRequest;
  private readonly handle: EmulatorResponseHandle;
  private readonly imageTransform?: NativeImageTransformPlan;

  constructor(
    handle: EmulatorResponseHandle,
    request: HttpRequest,
    metadata: {
      status: number;
      url: string;
      headers: HttpHeaders;
    },
    imageTransform?: NativeImageTransformPlan,
  ) {
    this.handle = handle;
    this.request = request;
    this.status = metadata.status;
    this.url = metadata.url;
    this.headers = metadata.headers;
    this.imageTransform = imageTransform;
  }

  get ok(): boolean {
    return this.status >= 200 && this.status < 300;
  }

  async text(): Promise<string> {
    return this.handle.read().toString("utf8");
  }

  async json<T = unknown>(): Promise<T> {
    return JSON.parse(await this.text()) as T;
  }

  async bytes(): Promise<Uint8Array> {
    return Uint8Array.from(this.handle.read());
  }

  async arrayBuffer(): Promise<ArrayBuffer> {
    const bytes = await this.bytes();
    return bytes.buffer.slice(
      bytes.byteOffset,
      bytes.byteOffset + bytes.byteLength,
    ) as ArrayBuffer;
  }

  replaceBody(body: string | Uint8Array): HttpResponse {
    return this.rebuild({ body });
  }

  deferImageTransform(plan: NativeImageTransformPlan): HttpResponse {
    validateNativeImageTransformPlan(plan);
    return new HttpResponse(
      this.handle,
      this.request,
      {
        status: this.status,
        url: this.url,
        headers: this.headers,
      },
      {
        kind: plan.kind,
        columns: plan.columns,
        rows: plan.rows,
        order: [...plan.order],
      },
    );
  }

  rebuild(patch: {
    status?: number;
    headers?: Record<string, string>;
    body?: string | Uint8Array;
  }): HttpResponse {
    return new HttpResponse(
      patch.body === undefined ? this.handle : this.handle.replacing(patch.body),
      this.request,
      {
        status: patch.status ?? this.status,
        url: this.url,
        headers:
          patch.headers === undefined
            ? this.headers
            : new HttpHeaders(patch.headers),
      },
      patch.body === undefined ? this.imageTransform : undefined,
    );
  }

  /** Internal image-emulator terminal read. Not part of the source API. */
  __takeBodyForImage(): Buffer {
    return this.handle.take();
  }

  /** Internal image-emulator transform metadata. */
  __imageTransformForImage(): NativeImageTransformPlan | undefined {
    return this.imageTransform;
  }
}

const validateNativeImageTransformPlan = (
  plan: NativeImageTransformPlan,
): void => {
  const validDimension = (value: number) =>
    Number.isInteger(value) && value >= 1 && value <= 32;
  if (
    plan?.kind !== "tilePermutation" ||
    !validDimension(plan.columns) ||
    !validDimension(plan.rows)
  ) {
    throw new TypeError("invalid native image transform grid");
  }

  const count = plan.columns * plan.rows;
  if (
    !Array.isArray(plan.order) ||
    plan.order.length !== count ||
    new Set(plan.order).size !== count ||
    plan.order.some(
      (value) => !Number.isInteger(value) || value < 0 || value >= count,
    )
  ) {
    throw new TypeError("invalid native image transform permutation");
  }
};

export class HttpError extends Error {
  readonly request: HttpRequest;
  readonly response?: HttpResponse;

  constructor(request: HttpRequest, response?: HttpResponse) {
    super(`Request failed with status ${response?.status ?? "unknown"}`);
    this.name = "HttpError";
    this.request = request;
    this.response = response;
  }
}

class HttpRateLimiter {
  private readonly queue: Array<{
    task: () => Promise<HttpResponse>;
    resolve: (response: HttpResponse) => void;
    reject: (error: unknown) => void;
  }> = [];
  private tokens = 0;
  private lastRefillTime = Date.now();
  private blockedUntil = 0;
  private drainTimer: ReturnType<typeof setTimeout> | undefined;
  private readonly requestsPerSecond: number;

  constructor(rateLimit?: HttpClientConfig["rateLimit"]) {
    const permits = Number(rateLimit?.permits);
    const period = Number(rateLimit?.period);
    this.requestsPerSecond =
      Number.isFinite(permits) && permits > 0
        ? permits / (Number.isFinite(period) && period > 0 ? period : 1)
        : 0;
    this.tokens = this.capacity();
  }

  run(task: () => Promise<HttpResponse>): Promise<HttpResponse> {
    if (
      this.requestsPerSecond === 0 &&
      this.blockedUntil <= Date.now() &&
      this.queue.length === 0
    ) {
      return task();
    }
    return new Promise((resolve, reject) => {
      this.queue.push({ task, resolve, reject });
      this.schedule();
    });
  }

  backoff(status: number, headers: HttpHeaders): void {
    if (status !== 429 && status !== 503) return;
    const retryAfter = headers.get("retry-after");
    let wait: number | undefined;
    if (retryAfter) {
      const seconds = Number(retryAfter);
      if (Number.isFinite(seconds) && seconds >= 0) {
        wait = Math.ceil(seconds * 1000);
      } else {
        const date = Date.parse(retryAfter);
        if (!Number.isNaN(date)) wait = Math.max(0, date - Date.now());
      }
    }
    const interval =
      this.requestsPerSecond > 0 ? 1000 / this.requestsPerSecond : 0;
    this.blockedUntil = Math.max(
      this.blockedUntil,
      Date.now() + (wait ?? Math.max(1000, interval)),
    );
  }

  private capacity(): number {
    return this.requestsPerSecond <= 0
      ? 0
      : Math.max(Math.ceil(this.requestsPerSecond * 5), 5);
  }

  private delay(): number {
    const now = Date.now();
    const elapsed = (now - this.lastRefillTime) / 1000;
    this.tokens = Math.min(
      this.capacity(),
      this.tokens + elapsed * this.requestsPerSecond,
    );
    this.lastRefillTime = now;
    const blocked = Math.max(0, this.blockedUntil - now);
    if (blocked > 0) return blocked;
    if (this.requestsPerSecond === 0 || this.tokens >= 1) return 0;
    return Math.ceil(((1 - this.tokens) / this.requestsPerSecond) * 1000);
  }

  private schedule(): void {
    if (this.queue.length === 0 || this.drainTimer) return;
    const delay = this.delay();
    this.drainTimer = setTimeout(() => {
      this.drainTimer = undefined;
      this.drain();
    }, delay);
    if (typeof this.drainTimer === "object" && "unref" in this.drainTimer) {
      this.drainTimer.unref();
    }
  }

  private drain(): void {
    if (this.queue.length === 0) return;
    const delay = this.delay();
    if (delay > 0) {
      this.schedule();
      return;
    }
    if (this.requestsPerSecond > 0) this.tokens -= 1;
    const next = this.queue.shift();
    if (!next) return;
    next.task().then(next.resolve).catch(next.reject).finally(() => this.schedule());
    this.schedule();
  }
}

const isCloudflareChallenge = async (response: HttpResponse): Promise<boolean> => {
  const location = response.headers.get("location")?.toLowerCase() ?? "";
  const mitigated = response.headers.get("cf-mitigated")?.toLowerCase() ?? "";
  if (location.includes("/cdn-cgi/challenge-platform/") || mitigated.includes("challenge")) {
    return true;
  }
  if (![403, 429, 503].includes(response.status)) return false;
  const body = (await response.text()).toLowerCase().slice(0, 8192);
  return [
    "cf-chl",
    "cf-turnstile",
    "challenges.cloudflare.com",
    "cdn-cgi/challenge-platform",
    "just a moment",
    "attention required",
    "verify you are human",
    "checking your browser",
  ].some((hint) => body.includes(hint));
};

export class HttpClient implements HttpClientShape {
  readonly interceptors: HttpClientShape["interceptors"];
  private readonly config: HttpClientConfig;
  private readonly limiter: HttpRateLimiter;
  private readonly requestInterceptors: Array<
    (request: HttpRequestShape) => HttpRequestShape | Promise<HttpRequestShape>
  > = [];
  private readonly responseInterceptors: Array<
    (response: HttpResponseShape) => HttpResponseShape | Promise<HttpResponseShape>
  > = [];

  constructor(config: HttpClientConfig = {}) {
    this.config = { ...config };
    this.limiter = new HttpRateLimiter(config.rateLimit);
    this.interceptors = {
      request: {
        use: (fn) => this.requestInterceptors.push(fn),
      },
      response: {
        use: (fn) => this.responseInterceptors.push(fn),
      },
    };
  }

  get(url: string, config?: RequestConfig): Promise<HttpResponse> {
    return this.request({ ...(config ?? {}), url, method: "GET" });
  }

  delete(url: string, config?: RequestConfig): Promise<HttpResponse> {
    return this.request({ ...(config ?? {}), url, method: "DELETE" });
  }

  head(url: string, config?: RequestConfig): Promise<HttpResponse> {
    return this.request({ ...(config ?? {}), url, method: "HEAD" });
  }

  post(
    url: string,
    body?: HttpBodyInit,
    config?: RequestConfig,
  ): Promise<HttpResponse> {
    return this.request({ ...(config ?? {}), url, method: "POST", body });
  }

  put(
    url: string,
    body?: HttpBodyInit,
    config?: RequestConfig,
  ): Promise<HttpResponse> {
    return this.request({ ...(config ?? {}), url, method: "PUT", body });
  }

  patch(
    url: string,
    body?: HttpBodyInit,
    config?: RequestConfig,
  ): Promise<HttpResponse> {
    return this.request({ ...(config ?? {}), url, method: "PATCH", body });
  }

  async request(input: HttpRequestInput): Promise<HttpResponse> {
    let request: HttpRequestShape = new HttpRequest(input, this.config);
    for (const interceptor of this.requestInterceptors) {
      request = await interceptor(request);
      if (!(request instanceof HttpRequest)) {
        throw new TypeError(
          "request interceptor must return the HttpRequest it was given",
        );
      }
    }
    return this.limiter.run(() => this.dispatch(request as HttpRequest));
  }

  private async dispatch(request: HttpRequest): Promise<HttpResponse> {
    const cookieHeader = request.cookies
      .map(({ name, value }) => `${name}=${value}`)
      .join("; ");
    let attempt = 0;
    let rawResponse;
    while (true) {
      try {
        rawResponse = await axios({
          method: request.method,
          url: request.url,
          params: request.params,
          headers: {
            ...request.headers.toJSON(),
            ...(cookieHeader ? { Cookie: cookieHeader } : {}),
            Connection: "close",
          },
          data: request.body,
          timeout: request.timeout,
          responseType: "arraybuffer",
          validateStatus: () => true,
          ...(request.maxRedirects === undefined
            ? {}
            : { maxRedirects: request.maxRedirects }),
          httpAgent: new http.Agent({ keepAlive: false }),
          httpsAgent: new https.Agent({ keepAlive: false }),
        });
        break;
      } catch (error) {
        if (attempt >= (request.retries?.count ?? 0)) throw error;
        attempt += 1;
        if (request.retries?.delay) {
          await new Promise((resolve) =>
            setTimeout(resolve, request.retries?.delay),
          );
        }
      }
    }

    const finalURL =
      (rawResponse.request as { res?: { responseUrl?: string } })?.res
        ?.responseUrl ?? request.url;
    let response: HttpResponseShape = new HttpResponse(
      new EmulatorResponseHandle(Buffer.from(rawResponse.data)),
      request,
      {
        status: rawResponse.status,
        url: finalURL,
        headers: new HttpHeaders(rawResponse.headers as Record<string, unknown>),
      },
    );
    this.limiter.backoff(response.status, response.headers as HttpHeaders);

    for (const interceptor of this.responseInterceptors) {
      response = await interceptor(response);
      if (!(response instanceof HttpResponse)) {
        throw new TypeError(
          "response interceptor must return an HttpResponse (use rebuild/replaceBody)",
        );
      }
    }

    const wrapped = response as HttpResponse;
    const validateStatus =
      request.validateStatus ?? ((status: number) => status >= 200 && status < 300);
    if (validateStatus(wrapped.status)) return wrapped;
    if (await isCloudflareChallenge(wrapped)) {
      throw new CloudflareError(
        request.cloudflareResolutionURL ?? request.url,
      );
    }
    throw new HttpError(request, wrapped);
  }
}

const defaultObjectStore = new STTStore("os");
const defaultSecureStore = new STTStore("ss");

const defaultGlobals = () => ({
  Application: new EmulatorApplication(),
  ObjectStore: defaultObjectStore,
  SecureStore: defaultSecureStore,
  NetworkClient,
  CloudflareError,
  NetworkError,
  HttpClient,
  HttpHeaders,
  HttpRequest,
  HttpResponse,
  HttpError,
  NativeImage,
  NativeCanvas,
  Crypto,
});

export const resetEmulatorStores = () => {
  globalStore.objects = {};
  globalStore.secure = {};
};

export const installEmulatorGlobals = (
  overrides: EmulatorGlobalOverrides = {},
) => {
  const globals = {
    ...defaultGlobals(),
    ...overrides,
  };

  for (const [key, value] of Object.entries(globals)) {
    globalObject[key] = value;
  }

  return globals;
};

export const resetEmulatorRuntime = (
  overrides: EmulatorGlobalOverrides = {},
) => {
  resetEmulatorStores();
  return installEmulatorGlobals(overrides);
};
