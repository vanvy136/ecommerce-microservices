BEGIN;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS processing_status VARCHAR(30)
NOT NULL DEFAULT 'completed';

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS processing_error TEXT;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS processing_updated_at TIMESTAMPTZ
NOT NULL DEFAULT NOW();

CREATE TABLE IF NOT EXISTS order_stock_reservations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL
        REFERENCES orders(id) ON DELETE CASCADE,

    product_id VARCHAR(255) NOT NULL,

    reservation_id VARCHAR(100) NOT NULL UNIQUE,

    quantity INTEGER NOT NULL
        CHECK (quantity > 0),

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'reserved',
                'committed',
                'released',
                'failed'
            )
        ),

    last_error TEXT,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    UNIQUE (order_id, product_id)
);

CREATE INDEX IF NOT EXISTS idx_order_reservations_order
ON order_stock_reservations(order_id);

CREATE INDEX IF NOT EXISTS idx_orders_processing_status
ON orders(processing_status);

COMMIT;
