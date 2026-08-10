import type { Cart, Product, ProductSummary } from '@platform/schemas'

const CART_KEY = 'platform_storefront_cart_id'

function hostOf(): string {
  if (import.meta.server) {
    const event = useRequestEvent()
    return event ? getRequestHost(event) : 'localhost'
  }
  return window.location.host
}

async function unwrap<T>(promise: Promise<{ data?: T } | T>): Promise<T> {
  const result = await promise
  if (result && typeof result === 'object' && 'data' in result && (result as { data?: T }).data !== undefined) {
    return (result as { data: T }).data
  }
  return result as T
}

export function useStorefrontCart() {
  const cartId = useCookie<string | null>(CART_KEY, { sameSite: 'lax', maxAge: 60 * 60 * 24 * 14 })
  const cart = useState<Cart | null>('storefront-cart', () => null)
  const busy = useState('storefront-cart-busy', () => false)
  const error = useState('storefront-cart-error', () => '')

  async function ensureCart(): Promise<string> {
    if (cartId.value) return cartId.value
    const created = await unwrap<Cart>(
      $fetch('/public/commerce/carts', {
        method: 'POST',
        query: { host: hostOf() },
        body: { currency: 'EUR' },
      }),
    )
    cartId.value = created.id
    cart.value = created
    return created.id
  }

  async function refresh() {
    if (!cartId.value) {
      cart.value = null
      return
    }
    try {
      cart.value = await unwrap<Cart>(
        $fetch(`/public/commerce/carts/${cartId.value}`, { query: { host: hostOf() } }),
      )
    } catch {
      cartId.value = null
      cart.value = null
    }
  }

  async function addVariant(variantId: string, quantity = 1) {
    busy.value = true
    error.value = ''
    try {
      const id = await ensureCart()
      cart.value = await unwrap<Cart>(
        $fetch(`/public/commerce/carts/${id}/items`, {
          method: 'POST',
          query: { host: hostOf() },
          body: { variantId, quantity },
        }),
      )
    } catch (caught) {
      error.value = caught instanceof Error ? caught.message : 'Could not update cart'
      throw caught
    } finally {
      busy.value = false
    }
  }

  return { cart, cartId, busy, error, ensureCart, refresh, addVariant, hostOf }
}

export function useStorefrontCatalog() {
  async function listProducts(page = 1) {
    return unwrap<{ items: ProductSummary[]; meta: { total: number } }>(
      $fetch('/public/commerce/products', {
        query: { host: hostOf(), page, limit: 24 },
      }),
    )
  }

  async function getProduct(handle: string) {
    return unwrap<Product>(
      $fetch(`/public/commerce/products/${encodeURIComponent(handle)}`, {
        query: { host: hostOf() },
      }),
    )
  }

  return { listProducts, getProduct, hostOf }
}
