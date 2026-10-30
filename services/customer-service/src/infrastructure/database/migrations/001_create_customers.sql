CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE TABLE IF NOT EXISTS customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),

    auth_user_id UUID NOT NULL UNIQUE,

    full_name VARCHAR(150) NOT NULL,

    phone VARCHAR(20),

    loyalty_points INTEGER NOT NULL DEFAULT 0
        CHECK (loyalty_points >= 0),

    membership_tier VARCHAR(20) NOT NULL DEFAULT 'BRONZE'
        CHECK (membership_tier IN (
            'BRONZE',
            'SILVER',
            'GOLD',
            'PLATINUM'
        )),

    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),

    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);