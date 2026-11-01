
-- Theo dõi tiến trình xử lý Saga
ALTER TABLE orders
ADD COLUMN IF NOT EXISTS processing_owner UUID;

ALTER TABLE orders
ADD COLUMN IF NOT EXISTS processing_lease_until TIMESTAMPTZ;

-- Tránh dữ liệu xử lý mới bị coi là đã hoàn thành
ALTER TABLE orders
ALTER COLUMN processing_status SET DEFAULT 'processing';

-- Hỗ trợ tìm đơn cần phục hồi
CREATE INDEX IF NOT EXISTS idx_orders_saga_recovery
ON orders (processing_status, processing_lease_until)
WHERE processing_status NOT IN ('completed', 'failed');

-- Tra cứu reservation theo đơn
CREATE INDEX IF NOT EXISTS idx_stock_reservations_order
ON order_stock_reservations (order_id);
