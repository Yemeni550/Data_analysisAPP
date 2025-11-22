/// <reference types="vite/client" />

// Provide a minimal fallback so server-side tooling still typechecks
// even if Vite's client types are not loaded by default.
declare interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly [key: string]: unknown;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
