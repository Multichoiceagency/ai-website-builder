-- ===========================================================================
-- 0005 — Commerce: catalog, inventory, carts, orders, customers, discounts.
--
-- These tables are the *platform's* commerce store, not a mirror of anyone's.
-- `PostgresCommerceProvider` runs on them; `MedusaCommerceProvider` maps the
-- same platform types onto Medusa instead (ADR-0006). Neither vendor's field
-- names appear here.
--
-- Money is always two columns: an integer amount in minor units and an ISO-4217
-- code. There is no numeric/float money column anywhere in this file, and there
-- must never be one — see `packages/schemas/src/commerce.ts`.
-- ===========================================================================

-- A currency code as stored: three upper-case letters, validated at the column
-- so a lower-cased or padded code cannot be written even by hand.
--
-- Guarded rather than bare: money is not exclusive to commerce, and a later
-- migration that wants the same domain must not have to know whether this one
-- got there first.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'currency_code') THEN
    CREATE DOMAIN currency_code AS text CHECK (VALUE ~ '^[A-Z]{3}$');
  END IF;
END
$$;

-- ---------------------------------------------------------------------------
-- Catalog
-- ---------------------------------------------------------------------------

CREATE TABLE commerce_collections (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title        text NOT NULL,
  handle       text NOT NULL,
  description  text NOT NULL DEFAULT '',
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, handle)
);

CREATE TRIGGER commerce_collections_set_updated_at BEFORE UPDATE ON commerce_collections
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE commerce_products (
  id            uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id     uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  title         text NOT NULL,
  handle        text NOT NULL,
  description   text NOT NULL DEFAULT '',
  status        text NOT NULL DEFAULT 'draft'
                  CHECK (status IN ('draft', 'active', 'archived')),
  -- Basis points. Prices are tax-inclusive, so this splits a total rather than
  -- adding to it: 2100 = 21% VAT already contained in the price.
  tax_rate_bps  integer NOT NULL DEFAULT 0 CHECK (tax_rate_bps BETWEEN 0 AND 100000),
  options       jsonb NOT NULL DEFAULT '[]'::jsonb,
  images        jsonb NOT NULL DEFAULT '[]'::jsonb,
  created_at    timestamptz NOT NULL DEFAULT now(),
  updated_at    timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, handle)
);

CREATE INDEX commerce_products_tenant_status_idx ON commerce_products (tenant_id, status);
CREATE TRIGGER commerce_products_set_updated_at BEFORE UPDATE ON commerce_products
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE commerce_product_collections (
  tenant_id      uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id     uuid NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
  collection_id  uuid NOT NULL REFERENCES commerce_collections(id) ON DELETE CASCADE,
  PRIMARY KEY (product_id, collection_id)
);

CREATE INDEX commerce_product_collections_collection_idx
  ON commerce_product_collections (collection_id);

CREATE TABLE commerce_variants (
  id                  uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id           uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  product_id          uuid NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
  title               text NOT NULL,
  sku                 text,
  barcode             text,
  price_amount        bigint NOT NULL CHECK (price_amount >= 0),
  compare_at_amount   bigint CHECK (compare_at_amount IS NULL OR compare_at_amount >= 0),
  currency            currency_code NOT NULL DEFAULT 'EUR',
  option_values       jsonb NOT NULL DEFAULT '{}'::jsonb,
  weight_grams        integer NOT NULL DEFAULT 0 CHECK (weight_grams >= 0),
  position            integer NOT NULL DEFAULT 0,
  created_at          timestamptz NOT NULL DEFAULT now(),
  updated_at          timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX commerce_variants_product_idx ON commerce_variants (product_id, position);
CREATE INDEX commerce_variants_tenant_idx ON commerce_variants (tenant_id);
-- A blank SKU is "not tracked", and several variants may be untracked; a
-- supplied SKU must still be unique within the tenant.
CREATE UNIQUE INDEX commerce_variants_tenant_sku_idx
  ON commerce_variants (tenant_id, sku) WHERE sku IS NOT NULL;
CREATE TRIGGER commerce_variants_set_updated_at BEFORE UPDATE ON commerce_variants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Inventory, per location
-- ---------------------------------------------------------------------------

CREATE TABLE commerce_locations (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name        text NOT NULL,
  code        text NOT NULL,
  is_default  boolean NOT NULL DEFAULT false,
  created_at  timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code)
);

-- At most one default location per tenant, enforced by the database rather
-- than by whichever code path happens to write next.
CREATE UNIQUE INDEX commerce_locations_one_default_idx
  ON commerce_locations (tenant_id) WHERE is_default;

CREATE TABLE commerce_inventory_levels (
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  variant_id   uuid NOT NULL REFERENCES commerce_variants(id) ON DELETE CASCADE,
  location_id  uuid NOT NULL REFERENCES commerce_locations(id) ON DELETE CASCADE,
  available    integer NOT NULL DEFAULT 0,
  reserved     integer NOT NULL DEFAULT 0 CHECK (reserved >= 0),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (variant_id, location_id)
);

CREATE INDEX commerce_inventory_levels_tenant_idx ON commerce_inventory_levels (tenant_id);
CREATE TRIGGER commerce_inventory_levels_set_updated_at BEFORE UPDATE ON commerce_inventory_levels
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Customers
-- ---------------------------------------------------------------------------

CREATE TABLE commerce_customers (
  id               uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id        uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  email            text NOT NULL,
  first_name       text NOT NULL DEFAULT '',
  last_name        text NOT NULL DEFAULT '',
  phone            text NOT NULL DEFAULT '',
  default_address  jsonb,
  created_at       timestamptz NOT NULL DEFAULT now(),
  updated_at       timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, email)
);

CREATE TRIGGER commerce_customers_set_updated_at BEFORE UPDATE ON commerce_customers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Discounts
-- ---------------------------------------------------------------------------

CREATE TABLE commerce_discounts (
  id                        uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id                 uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  code                      text NOT NULL,
  type                      text NOT NULL
                              CHECK (type IN ('percentage', 'fixed', 'free_shipping')),
  percentage_bps            integer CHECK (percentage_bps IS NULL OR percentage_bps BETWEEN 0 AND 100000),
  amount_value              bigint CHECK (amount_value IS NULL OR amount_value >= 0),
  amount_currency           currency_code,
  minimum_subtotal_value    bigint CHECK (minimum_subtotal_value IS NULL OR minimum_subtotal_value >= 0),
  minimum_subtotal_currency currency_code,
  -- False means "this one runs alone": the exclusive winner suppresses the
  -- rest rather than silently combining with them.
  stackable                 boolean NOT NULL DEFAULT false,
  priority                  integer NOT NULL DEFAULT 100 CHECK (priority BETWEEN 0 AND 1000),
  usage_limit               integer CHECK (usage_limit IS NULL OR usage_limit >= 1),
  usage_count               integer NOT NULL DEFAULT 0 CHECK (usage_count >= 0),
  starts_at                 timestamptz,
  ends_at                   timestamptz,
  active                    boolean NOT NULL DEFAULT true,
  created_at                timestamptz NOT NULL DEFAULT now(),
  updated_at                timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, code),
  -- A discount type without its value is not a discount; refuse it at the
  -- column level so no code path can create one.
  CONSTRAINT commerce_discounts_value_present CHECK (
    (type = 'percentage' AND percentage_bps IS NOT NULL)
    OR (type = 'fixed' AND amount_value IS NOT NULL AND amount_currency IS NOT NULL)
    OR type = 'free_shipping'
  )
);

CREATE TRIGGER commerce_discounts_set_updated_at BEFORE UPDATE ON commerce_discounts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- ---------------------------------------------------------------------------
-- Shipping rates
-- ---------------------------------------------------------------------------

CREATE TABLE commerce_shipping_rates (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name               text NOT NULL,
  description        text NOT NULL DEFAULT '',
  price_amount       bigint NOT NULL CHECK (price_amount >= 0),
  currency           currency_code NOT NULL DEFAULT 'EUR',
  free_above_amount  bigint CHECK (free_above_amount IS NULL OR free_above_amount >= 0),
  countries          text[] NOT NULL DEFAULT '{}',
  active             boolean NOT NULL DEFAULT true,
  created_at         timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX commerce_shipping_rates_tenant_idx ON commerce_shipping_rates (tenant_id, active);

-- ---------------------------------------------------------------------------
-- Carts
-- ---------------------------------------------------------------------------

CREATE TABLE commerce_carts (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  status            text NOT NULL DEFAULT 'open'
                      CHECK (status IN ('open', 'completed', 'abandoned')),
  currency          currency_code NOT NULL DEFAULT 'EUR',
  email             text,
  customer_id       uuid REFERENCES commerce_customers(id) ON DELETE SET NULL,
  discount_codes    jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping_rate_id  uuid REFERENCES commerce_shipping_rates(id) ON DELETE SET NULL,
  shipping_address  jsonb,
  billing_address   jsonb,
  created_at        timestamptz NOT NULL DEFAULT now(),
  updated_at        timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX commerce_carts_tenant_status_idx ON commerce_carts (tenant_id, status);
CREATE TRIGGER commerce_carts_set_updated_at BEFORE UPDATE ON commerce_carts
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE commerce_cart_items (
  id                uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id         uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  cart_id           uuid NOT NULL REFERENCES commerce_carts(id) ON DELETE CASCADE,
  variant_id        uuid NOT NULL REFERENCES commerce_variants(id) ON DELETE CASCADE,
  product_id        uuid NOT NULL REFERENCES commerce_products(id) ON DELETE CASCADE,
  title             text NOT NULL,
  variant_title     text NOT NULL DEFAULT '',
  sku               text,
  quantity          integer NOT NULL CHECK (quantity >= 1),
  -- Captured when the line was added. A later catalogue price change must not
  -- silently reprice a cart someone is standing in.
  unit_price_amount bigint NOT NULL CHECK (unit_price_amount >= 0),
  currency          currency_code NOT NULL DEFAULT 'EUR',
  tax_rate_bps      integer NOT NULL DEFAULT 0,
  created_at        timestamptz NOT NULL DEFAULT now(),
  UNIQUE (cart_id, variant_id)
);

CREATE INDEX commerce_cart_items_tenant_idx ON commerce_cart_items (tenant_id);

-- ---------------------------------------------------------------------------
-- Orders
--
-- Order lines reference the variant by id but carry no foreign key to it: an
-- order is a historical record, and deleting a product must not rewrite what a
-- customer bought. Title, SKU and price are snapshots for the same reason.
-- ---------------------------------------------------------------------------

CREATE TABLE commerce_orders (
  id                   uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id            uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  number               integer NOT NULL,
  status               text NOT NULL DEFAULT 'pending'
                         CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  cart_id              uuid REFERENCES commerce_carts(id) ON DELETE SET NULL,
  customer_id          uuid REFERENCES commerce_customers(id) ON DELETE SET NULL,
  email                text NOT NULL,
  currency             currency_code NOT NULL DEFAULT 'EUR',
  subtotal_amount      bigint NOT NULL CHECK (subtotal_amount >= 0),
  discount_amount      bigint NOT NULL DEFAULT 0 CHECK (discount_amount >= 0),
  shipping_amount      bigint NOT NULL DEFAULT 0 CHECK (shipping_amount >= 0),
  tax_amount           bigint NOT NULL DEFAULT 0 CHECK (tax_amount >= 0),
  total_amount         bigint NOT NULL CHECK (total_amount >= 0),
  refunded_amount      bigint NOT NULL DEFAULT 0 CHECK (refunded_amount >= 0),
  applied_discounts    jsonb NOT NULL DEFAULT '[]'::jsonb,
  shipping_address     jsonb,
  billing_address      jsonb,
  shipping_method      text NOT NULL DEFAULT '',
  payment_provider_id  text,
  payment_status       text CHECK (payment_status IS NULL OR payment_status IN
                         ('requires_action', 'authorized', 'captured', 'failed', 'refunded')),
  payment_reference    text,
  placed_at            timestamptz NOT NULL DEFAULT now(),
  created_at           timestamptz NOT NULL DEFAULT now(),
  updated_at           timestamptz NOT NULL DEFAULT now(),
  UNIQUE (tenant_id, number),
  CONSTRAINT commerce_orders_refund_within_total CHECK (refunded_amount <= total_amount)
);

CREATE INDEX commerce_orders_tenant_placed_idx ON commerce_orders (tenant_id, placed_at DESC);
CREATE INDEX commerce_orders_customer_idx ON commerce_orders (customer_id);
CREATE INDEX commerce_orders_status_idx ON commerce_orders (tenant_id, status);
CREATE TRIGGER commerce_orders_set_updated_at BEFORE UPDATE ON commerce_orders
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE commerce_order_items (
  id                 uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id          uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id           uuid NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  variant_id         uuid NOT NULL,
  product_id         uuid NOT NULL,
  title              text NOT NULL,
  variant_title      text NOT NULL DEFAULT '',
  sku                text,
  quantity           integer NOT NULL CHECK (quantity >= 1),
  unit_price_amount  bigint NOT NULL CHECK (unit_price_amount >= 0),
  currency           currency_code NOT NULL DEFAULT 'EUR',
  tax_rate_bps       integer NOT NULL DEFAULT 0,
  line_total_amount  bigint NOT NULL CHECK (line_total_amount >= 0)
);

CREATE INDEX commerce_order_items_order_idx ON commerce_order_items (order_id);
CREATE INDEX commerce_order_items_tenant_idx ON commerce_order_items (tenant_id);

-- The status timeline. Append-only for the application, like `audit_events`:
-- an order's history is evidence, and evidence you can edit is not evidence.
CREATE TABLE commerce_order_events (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id     uuid NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  status       text NOT NULL
                 CHECK (status IN ('pending', 'paid', 'fulfilled', 'cancelled', 'refunded')),
  note         text NOT NULL DEFAULT '',
  actor_label  text NOT NULL DEFAULT 'system',
  created_at   timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX commerce_order_events_order_idx ON commerce_order_events (order_id, created_at);
CREATE INDEX commerce_order_events_tenant_idx ON commerce_order_events (tenant_id);

CREATE TABLE commerce_refunds (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id   uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  order_id    uuid NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  amount      bigint NOT NULL CHECK (amount > 0),
  currency    currency_code NOT NULL DEFAULT 'EUR',
  reason      text NOT NULL DEFAULT '',
  created_by  text NOT NULL DEFAULT 'system',
  created_at  timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX commerce_refunds_order_idx ON commerce_refunds (order_id, created_at DESC);
CREATE INDEX commerce_refunds_tenant_idx ON commerce_refunds (tenant_id);

CREATE TABLE commerce_discount_redemptions (
  id           uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tenant_id    uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  discount_id  uuid NOT NULL REFERENCES commerce_discounts(id) ON DELETE CASCADE,
  order_id     uuid NOT NULL REFERENCES commerce_orders(id) ON DELETE CASCADE,
  amount_off   bigint NOT NULL CHECK (amount_off >= 0),
  currency     currency_code NOT NULL DEFAULT 'EUR',
  created_at   timestamptz NOT NULL DEFAULT now(),
  UNIQUE (discount_id, order_id)
);

CREATE INDEX commerce_discount_redemptions_tenant_idx ON commerce_discount_redemptions (tenant_id);

-- Per-tenant sequences. A real sequence cannot be per-tenant, and
-- `max(number) + 1` races under concurrency; an upsert with RETURNING is
-- atomic and gives every tenant order numbers starting at 1001.
CREATE TABLE commerce_counters (
  tenant_id  uuid NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
  name       text NOT NULL,
  value      bigint NOT NULL DEFAULT 1000,
  PRIMARY KEY (tenant_id, name)
);

-- ---------------------------------------------------------------------------
-- Row-level security (ADR-0004)
--
-- Same policy on every table: the tenant of the row must be the tenant of the
-- transaction, for reads and for writes. An unset `app.current_tenant` matches
-- nothing, so the failure mode is an empty result rather than someone else's
-- catalogue.
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  target text;
BEGIN
  FOREACH target IN ARRAY ARRAY[
    'commerce_collections',
    'commerce_products',
    'commerce_product_collections',
    'commerce_variants',
    'commerce_locations',
    'commerce_inventory_levels',
    'commerce_customers',
    'commerce_discounts',
    'commerce_shipping_rates',
    'commerce_carts',
    'commerce_cart_items',
    'commerce_orders',
    'commerce_order_items',
    'commerce_order_events',
    'commerce_refunds',
    'commerce_discount_redemptions',
    'commerce_counters'
  ]
  LOOP
    EXECUTE format('ALTER TABLE %I ENABLE ROW LEVEL SECURITY', target);
    EXECUTE format(
      'CREATE POLICY %I ON %I USING (tenant_id = current_tenant_id()) WITH CHECK (tenant_id = current_tenant_id())',
      target || '_tenant_isolation',
      target
    );
  END LOOP;
END
$$;

-- ---------------------------------------------------------------------------
-- Privileges for the runtime role
-- ---------------------------------------------------------------------------

DO $$
DECLARE
  app_role text := current_setting('platform.app_role', true);
  target   text;
BEGIN
  IF app_role IS NULL OR app_role = '' THEN
    RAISE EXCEPTION 'platform.app_role must be set by the migration runner';
  END IF;

  FOREACH target IN ARRAY ARRAY[
    'commerce_collections',
    'commerce_products',
    'commerce_product_collections',
    'commerce_variants',
    'commerce_locations',
    'commerce_inventory_levels',
    'commerce_customers',
    'commerce_discounts',
    'commerce_shipping_rates',
    'commerce_carts',
    'commerce_cart_items',
    'commerce_orders',
    'commerce_order_items',
    'commerce_refunds',
    'commerce_discount_redemptions',
    'commerce_counters'
  ]
  LOOP
    EXECUTE format('GRANT SELECT, INSERT, UPDATE, DELETE ON %I TO %I', target, app_role);
  END LOOP;

  -- The order timeline is append-only for the application, for the same reason
  -- the audit log is.
  EXECUTE format('GRANT SELECT, INSERT ON commerce_order_events TO %I', app_role);
END
$$;
