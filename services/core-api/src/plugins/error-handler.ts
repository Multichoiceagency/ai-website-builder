import type { FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { ZodError } from 'zod'
import { PermissionDeniedError } from '@platform/permissions'
import { InvalidBlockPropsError, UnknownBlockError } from '@platform/blocks'
import type { ErrorEnvelope } from '@platform/schemas'
import { AppError } from '../lib/errors.js'
import { isProduction } from '../config/env.js'

/** Postgres unique-violation. Surfaces as 409 rather than a 500. */
const UNIQUE_VIOLATION = '23505'
const FOREIGN_KEY_VIOLATION = '23503'

function envelope(code: string, message: string, details?: unknown): ErrorEnvelope {
  return { success: false, data: null, error: details === undefined ? { code, message } : { code, message, details } }
}

/**
 * One place that turns a thrown error into an HTTP response, so no route
 * handler writes error-shaping code and no internal detail leaks by accident.
 */
const errorHandlerPlugin: FastifyPluginAsync = async (app) => {
  app.setNotFoundHandler((request, reply) => {
    reply.status(404).send(envelope('not_found', `No route for ${request.method} ${request.url}.`))
  })

  app.setErrorHandler((error, request, reply) => {
    if (error instanceof AppError) {
      return reply.status(error.statusCode).send(envelope(error.code, error.message, error.details))
    }

    if (error instanceof ZodError) {
      return reply.status(400).send(envelope('bad_request', 'Validation failed.', error.flatten()))
    }

    if (error instanceof PermissionDeniedError) {
      return reply.status(403).send(envelope('forbidden', error.message))
    }

    if (error instanceof UnknownBlockError) {
      return reply.status(400).send(envelope('unknown_block', error.message, { blockId: error.blockId }))
    }

    if (error instanceof InvalidBlockPropsError) {
      return reply.status(400).send(envelope('invalid_block_props', error.message, { issues: error.issues }))
    }

    // Everything below is an error we did not define, so narrow explicitly
    // rather than trusting the framework's error type.
    const unknownError = error as { code?: string; statusCode?: number; message?: string }

    const pgCode = unknownError.code
    if (pgCode === UNIQUE_VIOLATION) {
      return reply.status(409).send(envelope('conflict', 'That value is already taken.'))
    }
    if (pgCode === FOREIGN_KEY_VIOLATION) {
      return reply.status(400).send(envelope('bad_request', 'Referenced record does not exist.'))
    }

    if (typeof unknownError.statusCode === 'number' && unknownError.statusCode < 500) {
      return reply
        .status(unknownError.statusCode)
        .send(envelope('bad_request', unknownError.message ?? 'Bad request.'))
    }

    request.log.error({ err: error }, 'unhandled error')
    // Never leak an internal message in production.
    return reply
      .status(500)
      .send(
        envelope(
          'internal_error',
          isProduction ? 'Something went wrong.' : (unknownError.message ?? 'Unknown error.'),
        ),
      )
  })
}

export default fp(errorHandlerPlugin, { name: 'error-handler' })
