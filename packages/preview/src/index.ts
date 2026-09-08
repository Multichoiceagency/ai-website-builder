/**
 * @platform/preview — in-browser bundelen en verifiëren van gegenereerde code.
 *
 * Overgenomen uit OpenThorn (MIT, © 2026 Thomas Tschinkel); zie LICENSE.
 * De code bundelt projectbestanden met esbuild-wasm in een virtueel bestands-
 * systeem, rendert ze in een sandboxed iframe en draait daar rook-tests tegen.
 * Geen server-round-trip.
 */
export { buildPreview, buildFilesMap, type VirtualFile } from "./preview-bundle";
export { createVirtualFsPlugin } from "./virtualFsPlugin";
export { ALLOWED_PACKAGES } from "./allowed-packages";
export { initCompiler } from "./compiler";
export {
  runtimeSmokeTest,
  interactiveSmokeTest,
  formatRuntimeReport,
} from "./preview-runtime-check";
export { buildSelectModeScript } from "./preview-edit";
