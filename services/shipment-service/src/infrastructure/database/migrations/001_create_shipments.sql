
BEGIN;

CREATE TABLE IF NOT EXISTS shipments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    order_id UUID NOT NULL UNIQUE,
    customer_id UUID NOT NULL,

    status VARCHAR(30) NOT NULL DEFAULT 'pending'
        CHECK (
            status IN (
                'pending',
                'processing',
                'shipped',
                'delivered',
                'cancelled',
                'failed'
            )
        ),

    tracking_number VARCHAR(100) UNIQUE,
    carrier VARCHAR(100),

    shipping_address TEXT,
    notes TEXT,

    shipped_at TIMESTAMPTZ,
    delivered_at TIMESTAMPTZ,

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_shipments_customer
ON shipments(customer_id);

CREATE INDEX IF NOT EXISTS idx_shipments_status
ON shipments(status);

COMMIT;
