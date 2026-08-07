import type { CollectionId } from '@platform/schemas'
import { defineBlock, type BlockDefinition, type BlockDefinitionInput } from '../define.js'

/**
 * A block that belongs to a named collection.
 *
 * `collection` and `tags` are the only two things a collection adds to a block.
 * Everything else — the props schema, the editor fields, the scores, the
 * renderer contract — is the ordinary block contract from `defineBlock`, so a
 * collection block is never a second-class citizen of the registry (ADR-0003).
 */
export interface CollectionBlockInput extends BlockDefinitionInput {
  collection: CollectionId
  /** Search keys the block picker, the lab and AI selection all filter on. */
  tags: string[]
}

export interface CollectionBlockDefinition extends BlockDefinition {
  collection: CollectionId
  tags: string[]
}

export function defineCollectionBlock(input: CollectionBlockInput): CollectionBlockDefinition {
  const { collection, tags, ...blockInput } = input

  if (!tags.length) {
    throw new Error(`Collection block "${input.id}" must carry at least one tag — tags are how it is found.`)
  }

  return { ...defineBlock(blockInput), collection, tags }
}
