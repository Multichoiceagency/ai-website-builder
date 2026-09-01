import { ref } from 'vue'
import { describe, expect, it } from 'vitest'
import { useEditorHistory } from '../app/composables/useEditorHistory'
import { applySectionsThrough } from '../app/utils/assistantSections'

/**
 * The assistant edits the open document, not the stored one. What matters is
 * that its changes cost exactly one undo step and that a change which matched
 * nothing costs none.
 */

interface Section {
  id: string
  block: string
  props: Record<string, unknown>
}

function editor(initial: Section[]) {
  const sections = ref<Section[]>(initial)
  const history = useEditorHistory<Section[]>()
  let dirty = false

  function mutate(next: Section[]) {
    history.commit(sections.value)
    sections.value = next
    dirty = true
  }

  function apply(transform: (input: Section[]) => Section[]) {
    return applySectionsThrough(sections.value, transform, mutate)
  }

  return { sections, history, apply, isDirty: () => dirty }
}

const header: Section = { id: 'a', block: 'header-simple-01', props: { logo: '' } }
const hero: Section = { id: 'b', block: 'hero-split-01', props: {} }

const setLogo = (sections: Section[]) =>
  sections.map((section) =>
    section.block.startsWith('header-')
      ? { ...section, props: { ...section.props, logo: 'https://cdn.test/logo.svg' } }
      : section,
  )

describe('applying an assistant transform', () => {
  it('changes the open document rather than the stored page', () => {
    const { sections, apply } = editor([header, hero])

    const result = apply(setLogo)

    expect(result.applied).toBe(true)
    expect(sections.value[0]!.props.logo).toBe('https://cdn.test/logo.svg')
  })

  it('costs exactly one undo step', () => {
    const { sections, history, apply } = editor([header, hero])

    apply(setLogo)

    const undone = history.undo(sections.value)
    expect(undone?.[0]!.props.logo).toBe('')
    expect(history.canUndo.value).toBe(false)
  })

  it('leaves the page clean when the transform matched nothing', () => {
    const { sections, history, apply, isDirty } = editor([hero])

    const result = apply((current) =>
      current.some((section) => section.block.startsWith('header-')) ? setLogo(current) : current,
    )

    expect(result.applied).toBe(false)
    expect(isDirty()).toBe(false)
    expect(history.canUndo.value).toBe(false)
    expect(sections.value).toEqual([hero])
  })
})
