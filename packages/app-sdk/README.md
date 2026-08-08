# `@platform/app-sdk`

What a third-party app is given (§34): declare a manifest, receive signed
webhooks, call the App Gateway with a key. No database client, no session, no
tenant resolver.

## `defineApp`

```ts
import { defineApp, defineExtension } from '@platform/app-sdk'

const app = defineApp({
  id: 'acme-reviews',
  name: 'Acme Reviews',
  version: '1.0.0',
  tagline: 'Collect and show product reviews',
  category: 'reviews',
  permissions: ['commerce:read', 'page:write'],
  events: ['order.placed'],
  extensions: [
    defineExtension({
      id: 'reviews-panel',
      point: 'dashboard.page',
      title: 'Reviews',
    }),
  ],
  webhookUrl: 'https://example.com/hooks/platform',
  supportEmail: 'devs@example.com',
})

// Submit with POST /api/v1/apps/developer/apps/:id/submit
console.log(app.toJSON())
```

Invalid manifests throw `AppDefinitionError` at definition time (Zod), not at
submission time.
