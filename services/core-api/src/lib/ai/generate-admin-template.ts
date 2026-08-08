import { remember, retrieveWorkingMemory, formatWorkingMemoryForPrompt } from './agent-memory.js'
import { saveTemplateWithDependencies, type AdminTemplateMeta } from './admin-template-registry.js'
import { MASTER_SYSTEM_PROMPT, validateCodegenOutput } from './master_prompt.js'
import { generateMotionsitesComponent } from './motionsites-codegen.js'

/**
 * `genereer_admin_template` — generate via Motionsites engine, then save + register.
 *
 * Matches the Python flow:
 *   response = gemini(system=MASTER_SYSTEM_PROMPT, contents=user_prompt)
 *   save_template_with_dependencies(slug, name, category, response.text)
 */

export interface GenerateAdminTemplateInput {
  slug: string
  name: string
  category: string
  userPrompt: string
  /** Persist to templates/admin + system_registry.json (default true). */
  save?: boolean
}

export interface GenerateAdminTemplateResult {
  ok: boolean
  model: string
  packages: string[]
  code: string
  errors: string[]
  memoryTokens: number
  meta?: AdminTemplateMeta
  filePath?: string
}

export async function generateAdminTemplate(
  input: GenerateAdminTemplateInput,
): Promise<GenerateAdminTemplateResult> {
  // Lower temperature path is handled inside generateMotionsitesComponent via env;
  // force a dedicated call with MASTER_SYSTEM_PROMPT + memory for admin templates.
  process.env.MOTIONSITES_CODEGEN_TEMPERATURE = '0.15'

  const generated = await generateMotionsitesComponent(input.userPrompt)
  if (!generated.ok) {
    return {
      ok: false,
      model: generated.model,
      packages: generated.packages,
      code: generated.code,
      errors: generated.errors,
      memoryTokens: generated.memoryTokens,
    }
  }

  // Prefer raw (with DEPENDENCIES header) for the registry stripper.
  const rawForSave = generated.raw.includes('DEPENDENCIES')
    ? generated.raw
    : `/*DEPENDENCIES:${JSON.stringify({ packages: generated.packages })} */\n${generated.code}`

  const validated = validateCodegenOutput(rawForSave)
  if (!validated.ok) {
    return {
      ok: false,
      model: generated.model,
      packages: validated.packages,
      code: validated.code,
      errors: validated.errors,
      memoryTokens: generated.memoryTokens,
    }
  }

  if (input.save === false) {
    return {
      ok: true,
      model: generated.model,
      packages: generated.packages,
      code: generated.code,
      errors: [],
      memoryTokens: generated.memoryTokens,
    }
  }

  const saved = await saveTemplateWithDependencies({
    slug: input.slug,
    name: input.name,
    category: input.category,
    rawAiOutput: rawForSave,
    model: generated.model,
  })

  await remember({
    kind: 'episodic',
    key: `episodic:admin-template:${saved.meta.id}`,
    content: `Admin template “${saved.meta.name}” (${saved.meta.id}) category=${saved.meta.category} packages=${JSON.stringify(saved.detectedPackages)} path=${saved.meta.component_path}`,
    tags: ['admin-template', saved.meta.category, ...saved.detectedPackages],
  })

  return {
    ok: true,
    model: generated.model,
    packages: saved.detectedPackages,
    code: saved.cleanCode,
    errors: [],
    memoryTokens: generated.memoryTokens,
    meta: saved.meta,
    filePath: saved.filePath,
  }
}

/** Expose for callers that only need the master prompt + memory context assembly. */
export async function buildAdminCodegenSystemPrompt(brief: string): Promise<string> {
  const working = await retrieveWorkingMemory(brief, { maxTokens: 3_500 })
  return [
    MASTER_SYSTEM_PROMPT,
    '',
    'Retrieved agent memory (follow procedural rules above all):',
    formatWorkingMemoryForPrompt(working),
  ].join('\n')
}
