// Legacy exports for backward compatibility
export * from "./api";
export { getDefaultParser } from "./parse-url-query";

// v2 Feature exports
export * from "./cache/index";
export * from "./performance/index";
export * from "./security/index";
export * from "./deps-resolution/index";
export * from "./introspection/index";
export * from "./providers/index";
export type { RepositoryInfo, ProviderConfig, ProviderError } from "./providers/base";
