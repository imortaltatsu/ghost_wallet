// Polyfills for react-native crypto and Node-style deps (stateless.js, etc.)
// Event/CustomEvent for @solana/client and wallet-standard (RN has no DOM Event)
if (typeof global.Event === "undefined") {
  (global as any).Event = class Event {
    type: string;
    bubbles: boolean;
    cancelable: boolean;
    defaultPrevented: boolean;
    constructor(
      type: string,
      options?: { bubbles?: boolean; cancelable?: boolean },
    ) {
      this.type = type;
      this.bubbles = options?.bubbles ?? false;
      this.cancelable = options?.cancelable ?? false;
      this.defaultPrevented = false;
    }
    preventDefault() {
      this.defaultPrevented = true;
    }
  };
}
if (typeof global.CustomEvent === "undefined") {
  (global as any).CustomEvent = class CustomEvent extends (
    (global as any).Event
  ) {
    detail: unknown;
    constructor(
      type: string,
      options?: { bubbles?: boolean; cancelable?: boolean; detail?: unknown },
    ) {
      super(type, options);
      this.detail = options?.detail ?? null;
    }
  };
}
(global as any).window = (global as any).window || global;
(global as any).window.Event = (global as any).Event;
(global as any).window.CustomEvent = (global as any).CustomEvent;

import { Blob } from "blob-polyfill";

// Forcefully overwrite Native Blob which lacks ArrayBuffer support
const PolyfillBlob = Blob;
(global as any).Blob = PolyfillBlob;
(global as any).window = (global as any).window || global;
(global as any).window.Blob = PolyfillBlob;
(global as any).self = (global as any).self || global;
(global as any).self.Blob = PolyfillBlob;

import { Buffer } from "buffer";
import "react-native-get-random-values";
import "text-encoding"; // Use standard polyfill instead of fast-text-encoding

// Ensure Buffer is globally available immediately
global.Buffer = global.Buffer || Buffer;
// Some libs check window.Buffer
(global as any).window = (global as any).window || global;
(global as any).window.Buffer = (global as any).window.Buffer || Buffer;
(global as any).window.crypto = (global as any).crypto || global.crypto;
(global as any).window.Event = (global as any).Event;
(global as any).window.CustomEvent = (global as any).CustomEvent;

// Polyfill process.nextTick and process.version for some node libs
if (!global.process) {
  (global as any).process = require("process");
}
// Ensure process.argv exists as an array (some libs slice it)
if (!(global.process as any).argv) {
  (global.process as any).argv = [];
}
// Ensure process.version exists
if (!(global.process as any).version) {
  (global.process as any).version = "v16.0.0"; // Fake version to satisfy checks
}
if (!(global.process as any).env) {
  (global.process as any).env = { NODE_ENV: "production" };
}

// Polyfill process.browser for some checks
(global.process as any).browser = true;

// Stream and crypto for Node-style deps (e.g. stateless.js, circomlibjs)
try {
  const stream = require("stream-browserify");
  (global as any).stream = stream;
  (global as any).window.stream = stream;
} catch (_) {
  // optional
}
try {
  const crypto = require("crypto-browserify");
  if (!(global as any).crypto?.getRandomValues) (global as any).crypto = crypto;
} catch (_) {
  // optional; react-native-get-random-values may already provide crypto
}

// Use axios for all HTTP requests so fetch() gets reliable response bodies in React Native (avoids
// "[object Object]" / "unexpected character o" from native fetch).
import axios from "axios";

function headersToRecord(
  h: Headers | Record<string, string> | [string, string][] | undefined,
): Record<string, string> {
  if (!h) return {};
  if (h instanceof Headers) {
    const o: Record<string, string> = {};
    h.forEach((v, k) => (o[k] = v));
    return o;
  }
  if (Array.isArray(h)) {
    return Object.fromEntries(h.filter(([, v]) => v != null));
  }
  return { ...h };
}

function axiosHeadersToFetchHeaders(axiosHeaders: unknown): Headers {
  const out = new Headers();
  if (
    axiosHeaders &&
    typeof axiosHeaders === "object" &&
    !Array.isArray(axiosHeaders)
  ) {
    Object.entries(axiosHeaders).forEach(([k, v]) => {
      if (v != null && typeof v === "string") out.set(k, v);
    });
  }
  return out;
}

(global as any).fetch = async function (
  input: RequestInfo | URL,
  init?: RequestInit,
): Promise<Response> {
  const url =
    typeof input === "string"
      ? input
      : input instanceof URL
        ? input.href
        : (input as Request).url;

  let method = init?.method ?? "GET";
  let body: string | undefined;
  let headers: HeadersInit | undefined = init?.headers;
  if (input instanceof Request) {
    method = input.method;
    headers = input.headers;
    body = await input.text();
  } else {
    body =
      init?.body != null && typeof init.body === "string"
        ? init.body
        : undefined;
  }

  try {
    const res = await axios({
      url,
      method: method.toUpperCase(),
      headers: headersToRecord(headers),
      data: body,
      responseType: "text",
      validateStatus: () => true,
    });
    // Always get a string body (RN/axios can sometimes return an object despite responseType: 'text').
    const text =
      typeof res.data === "string"
        ? res.data
        : res.data != null && typeof res.data === "object"
          ? JSON.stringify(res.data)
          : String(res.data ?? "");
    const out = new Response(text, {
      status: res.status,
      statusText: res.statusText || "",
      headers: axiosHeadersToFetchHeaders(res.headers),
    });
    (out as any).json = async () => {
      try {
        return JSON.parse(text);
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        throw new Error(
          `JSON parse failed: ${msg}. Body (first 300): ${text.slice(0, 300)}`,
        );
      }
    };
    return out;
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e));
    throw new TypeError(`fetch failed: ${err.message}`);
  }
};

console.log("Polyfills initialized");
