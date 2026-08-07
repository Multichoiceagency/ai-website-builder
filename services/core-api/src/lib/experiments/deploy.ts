/**
 * Putting a winner live — and taking it back off.
 *
 * Deploying writes the winning document onto the draft and publishes it, in
 * one transaction, *after* snapshotting what was there. That ordering is the
 * whole safety property: a rollback target exists before anything changes, so
 * undoing a deploy is a copy rather than a reconstruction (§7).
 */
import type { Experiment, ExperimentVariant } from '@platform/schemas'
import type { Tx } from '../../db/client.js'
import { findLatestRevisionId, setDeployment } from '../../db/repositories/experiments.js'
import {
  findPageById,
  findRevision,
  insertRevision,
  publishPage,
  updatePage,
} from '../../db/repositories/pages.js'
import { BadRequestError, NotFoundError } from '../errors.js'
import { applyVariant } from './variants.js'

export interface DeploymentResult {
  pageId: string
  path: string
  revisionId: string | null
  sectionCount: number
}

export async function deployVariant(
  tx: Tx,
  input: { tenantId: string; experiment: Experiment; variant: ExperimentVariant; deployedBy: string },
): Promise<DeploymentResult> {
  const page = await findPageById(tx, input.tenantId, input.experiment.pageId)
  if (!page) throw new NotFoundError('Page')

  await insertRevision(tx, {
    tenantId: input.tenantId,
    pageId: page.id,
    title: page.title,
    seo: page.seo,
    sections: page.sections,
    reason: 'experiment-pre-deploy',
    createdBy: input.deployedBy,
  })
  const revisionId = await findLatestRevisionId(tx, input.tenantId, page.id)

  const sections = applyVariant(page.sections, input.variant.document)
  await updatePage(tx, input.tenantId, page.id, { sections })
  await publishPage(tx, input.tenantId, page.id)

  await setDeployment(tx, input.tenantId, input.experiment.id, {
    variantId: input.variant.id,
    rollbackRevisionId: revisionId,
  })

  return { pageId: page.id, path: page.path, revisionId, sectionCount: sections.length }
}

/**
 * Restore the pre-deploy document. Snapshots the *current* state first, so a
 * rollback is itself undoable — the same rule restore-a-revision already
 * follows in the page editor.
 */
export async function rollbackDeployment(
  tx: Tx,
  input: { tenantId: string; experiment: Experiment; rolledBackBy: string },
): Promise<DeploymentResult> {
  const revisionId = input.experiment.rollbackRevisionId
  if (!revisionId) {
    throw new BadRequestError('This experiment has no deployment to roll back.')
  }

  const page = await findPageById(tx, input.tenantId, input.experiment.pageId)
  if (!page) throw new NotFoundError('Page')

  const revision = await findRevision(tx, input.tenantId, page.id, revisionId)
  if (!revision) throw new NotFoundError('Rollback snapshot')

  await insertRevision(tx, {
    tenantId: input.tenantId,
    pageId: page.id,
    title: page.title,
    seo: page.seo,
    sections: page.sections,
    reason: 'experiment-pre-rollback',
    createdBy: input.rolledBackBy,
  })

  await updatePage(tx, input.tenantId, page.id, {
    title: revision.title,
    seo: revision.seo,
    sections: revision.sections,
  })
  await publishPage(tx, input.tenantId, page.id)

  await setDeployment(tx, input.tenantId, input.experiment.id, {
    variantId: null,
    rollbackRevisionId: null,
  })

  return {
    pageId: page.id,
    path: page.path,
    revisionId,
    sectionCount: revision.sections.length,
  }
}
