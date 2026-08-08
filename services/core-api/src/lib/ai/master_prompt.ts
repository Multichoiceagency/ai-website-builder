/**
 * Master system prompt for Motionsites / admin template codegen.
 *
 * Python equivalent: `from master_prompt import MASTER_SYSTEM_PROMPT`
 */
export {
  MOTIONSITES_CODEGEN_SYSTEM_PROMPT as MASTER_SYSTEM_PROMPT,
  MOTIONSITES_CODEGEN_SYSTEM_PROMPT,
  MOTIONSITES_CODEGEN_ALLOWED_PACKAGES,
  parseDependenciesHeader,
  validateCodegenOutput,
  type MotionsitesCodegenPackage,
} from './motionsites-codegen-prompt.js'
