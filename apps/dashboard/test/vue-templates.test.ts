import { globSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'

/**
 * A `<template>` carrying no v-if, v-for or v-slot compiles to a real
 * `<template>` element, which the browser renders inert. Wrapping the editor
 * body in one blanked the whole canvas with no error anywhere: it typechecks,
 * it builds, and the panels are in the DOM at 0x0.
 */

const NESTED_BARE_TEMPLATE = /^[ \t]+<template>[ \t]*$/

const root = join(dirname(fileURLToPath(import.meta.url)), '..')
const files = globSync('app/**/*.vue', { cwd: root })

describe('Vue single-file components', () => {
  it('never nests a directive-less <template>', () => {
    const offenders = files.flatMap((file) =>
      readFileSync(join(root, file), 'utf8')
        .split('\n')
        .map((line, index) => (NESTED_BARE_TEMPLATE.test(line) ? `${file}:${index + 1}` : null))
        .filter((hit): hit is string => hit !== null),
    )

    expect(offenders).toEqual([])
  })
})
