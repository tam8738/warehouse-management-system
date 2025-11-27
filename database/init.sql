-- ============================================
-- WAREHOUSE MANAGEMENT SYSTEM - COMPLETE DATABASE SCHEMA
-- ============================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Drop existing tables in correct order (foreign keys first)
DROP TABLE IF EXISTS putaways CASCADE;
DROP TABLE IF EXISTS quality_checks CASCADE;
DROP TABLE IF EXISTS bin_stocks CASCADE;
DROP TABLE IF EXISTS bins CASCADE;
DROP TABLE IF EXISTS racks CASCADE;
DROP TABLE IF EXISTS aisles CASCADE;
DROP TABLE IF EXISTS zones CASCADE;
DROP TABLE IF EXISTS warehouses CASCADE;
DROP TABLE IF EXISTS notifications CASCADE;
DROP TABLE IF EXISTS inventory_counts CASCADE;
DROP TABLE IF EXISTS inventory_sessions CASCADE;
DROP TABLE IF EXISTS outbound_details CASCADE;
DROP TABLE IF EXISTS outbound_headers CASCADE;
DROP TABLE IF EXISTS inbound_details CASCADE;
DROP TABLE IF EXISTS inbound_headers CASCADE;
DROP TABLE IF EXISTS batches CASCADE;
DROP TABLE IF EXISTS stock CASCADE;
DROP TABLE IF EXISTS products CASCADE;
DROP TABLE IF EXISTS suppliers CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- ============================================
-- TABLE: users
-- ============================================
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    username VARCHAR(255) NOT NULL UNIQUE,
    password VARCHAR(255) NOT NULL,
    "fullName" VARCHAR(255),
    role VARCHAR(50) NOT NULL DEFAULT 'staff',
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_users_role CHECK (role IN ('admin', 'manager', 'staff')),
    CONSTRAINT chk_users_status CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX idx_users_status ON users(status);
CREATE INDEX idx_users_role ON users(role);

-- ============================================
-- TABLE: suppliers
-- ============================================
CREATE TABLE suppliers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    contact VARCHAR(255),
    email VARCHAR(255),
    phone VARCHAR(255),
    address TEXT,
    "taxCode" VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_suppliers_status CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX idx_suppliers_name ON suppliers(name);
CREATE INDEX idx_suppliers_status ON suppliers(status);
CREATE INDEX idx_suppliers_email ON suppliers(email);

-- ============================================
-- TABLE: products
-- ============================================
CREATE TABLE products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    sku VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    unit VARCHAR(50),
    barcode VARCHAR(255),
    "manageBatch" BOOLEAN NOT NULL DEFAULT false,
    description TEXT,
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    "minStockLevel" DECIMAL(10, 2) DEFAULT 10,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT chk_products_status CHECK (status IN ('active', 'inactive'))
);

CREATE INDEX idx_products_name ON products(name);
CREATE INDEX idx_products_barcode ON products(barcode);
CREATE INDEX idx_products_status ON products(status);
CREATE INDEX idx_products_manageBatch ON products("manageBatch");

-- ============================================
-- TABLE: stock
-- ============================================
CREATE TABLE stock (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "productId" UUID NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "reservedQty" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_stock_product FOREIGN KEY ("productId") 
        REFERENCES products(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_stock_quantity CHECK (quantity >= 0),
    CONSTRAINT chk_stock_reserved CHECK ("reservedQty" >= 0),
    CONSTRAINT chk_stock_available CHECK (quantity >= "reservedQty")
);

CREATE UNIQUE INDEX idx_stock_productId ON stock("productId");

-- ============================================
-- TABLE: warehouses
-- ============================================
CREATE TABLE warehouses (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    code VARCHAR(255) NOT NULL UNIQUE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    city VARCHAR(255),
    capacity DECIMAL(10, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    type VARCHAR(50) NOT NULL DEFAULT 'main',
    "managerId" UUID,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_warehouse_manager FOREIGN KEY ("managerId") 
        REFERENCES users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT chk_warehouse_status CHECK (status IN ('active', 'inactive', 'maintenance')),
    CONSTRAINT chk_warehouse_type CHECK (type IN ('main', 'secondary', 'return', 'quarantine'))
);

CREATE INDEX idx_warehouses_status ON warehouses(status);
CREATE INDEX idx_warehouses_type ON warehouses(type);

-- ============================================
-- TABLE: zones
-- ============================================
CREATE TABLE zones (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "warehouseId" UUID NOT NULL,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    type VARCHAR(50) NOT NULL DEFAULT 'storage',
    temperature VARCHAR(50) NOT NULL DEFAULT 'ambient',
    capacity DECIMAL(10, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_zone_warehouse FOREIGN KEY ("warehouseId") 
        REFERENCES warehouses(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_zone_status CHECK (status IN ('active', 'inactive', 'maintenance')),
    CONSTRAINT chk_zone_type CHECK (type IN ('storage', 'picking', 'packing', 'receiving', 'shipping', 'quarantine')),
    CONSTRAINT chk_zone_temperature CHECK (temperature IN ('ambient', 'cold', 'frozen'))
);

CREATE UNIQUE INDEX idx_zones_warehouse_code ON zones("warehouseId", code);

-- ============================================
-- TABLE: aisles
-- ============================================
CREATE TABLE aisles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "zoneId" UUID NOT NULL,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sequence INTEGER DEFAULT 0,
    width DECIMAL(10, 2),
    length DECIMAL(10, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_aisle_zone FOREIGN KEY ("zoneId") 
        REFERENCES zones(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_aisle_status CHECK (status IN ('active', 'inactive', 'maintenance'))
);

CREATE UNIQUE INDEX idx_aisles_zone_code ON aisles("zoneId", code);

-- ============================================
-- TABLE: racks
-- ============================================
CREATE TABLE racks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "aisleId" UUID NOT NULL,
    code VARCHAR(255) NOT NULL,
    name VARCHAR(255) NOT NULL,
    sequence INTEGER DEFAULT 0,
    levels INTEGER DEFAULT 5,
    "maxWeight" DECIMAL(10, 2),
    width DECIMAL(10, 2),
    height DECIMAL(10, 2),
    depth DECIMAL(10, 2),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_rack_aisle FOREIGN KEY ("aisleId") 
        REFERENCES aisles(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_rack_status CHECK (status IN ('active', 'inactive', 'maintenance', 'damaged'))
);

CREATE UNIQUE INDEX idx_racks_aisle_code ON racks("aisleId", code);

-- ============================================
-- TABLE: bins
-- ============================================
CREATE TABLE bins (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "rackId" UUID NOT NULL,
    code VARCHAR(255) NOT NULL UNIQUE,
    level INTEGER NOT NULL,
    "position" INTEGER NOT NULL,
    barcode VARCHAR(255) UNIQUE,
    capacity DECIMAL(10, 2),
    "currentQty" INTEGER DEFAULT 0,
    "maxWeight" DECIMAL(10, 2),
    width DECIMAL(10, 2),
    height DECIMAL(10, 2),
    depth DECIMAL(10, 2),
    "productId" UUID,
    status VARCHAR(50) NOT NULL DEFAULT 'empty',
    type VARCHAR(50) NOT NULL DEFAULT 'storage',
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_bin_rack FOREIGN KEY ("rackId") 
        REFERENCES racks(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_bin_product FOREIGN KEY ("productId") 
        REFERENCES products(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT chk_bin_status CHECK (status IN ('empty', 'partial', 'full', 'reserved', 'blocked', 'damaged')),
    CONSTRAINT chk_bin_type CHECK (type IN ('storage', 'picking', 'packing', 'staging', 'quarantine'))
);

CREATE INDEX idx_bins_rack_level_position ON bins("rackId", level, "position");
CREATE INDEX idx_bins_product ON bins("productId");
CREATE INDEX idx_bins_status ON bins(status);

-- ============================================
-- TABLE: bin_stocks
-- ============================================
CREATE TABLE bin_stocks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "binId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "batchNo" VARCHAR(255),
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "reservedQty" DECIMAL(10, 2) DEFAULT 0,
    "allocatedDate" TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    "expiryDate" DATE,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_binstock_bin FOREIGN KEY ("binId") 
        REFERENCES bins(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_binstock_product FOREIGN KEY ("productId") 
        REFERENCES products(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE
);

CREATE UNIQUE INDEX idx_binstock_bin_product_batch ON bin_stocks("binId", "productId", "batchNo");

-- ============================================
-- TABLE: batches
-- ============================================
CREATE TABLE batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "batchNo" VARCHAR(255) NOT NULL UNIQUE,
    "productId" UUID NOT NULL,
    "supplierId" UUID NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "manufactureDate" DATE NOT NULL,
    "expiryDate" DATE NOT NULL,
    "warehouseId" UUID,
    warehouse VARCHAR(255),
    "binId" UUID,
    location VARCHAR(255),
    status VARCHAR(50) NOT NULL DEFAULT 'active',
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_batch_product FOREIGN KEY ("productId") 
        REFERENCES products(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_batch_supplier FOREIGN KEY ("supplierId") 
        REFERENCES suppliers(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_batch_warehouse FOREIGN KEY ("warehouseId") 
        REFERENCES warehouses(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT fk_batch_bin FOREIGN KEY ("binId") 
        REFERENCES bins(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT chk_batches_status CHECK (status IN ('active', 'expired', 'recalled', 'depleted')),
    CONSTRAINT chk_batches_quantity CHECK (quantity >= 0),
    CONSTRAINT chk_batches_dates CHECK ("expiryDate" > "manufactureDate")
);

CREATE INDEX idx_batches_productId ON batches("productId");
CREATE INDEX idx_batches_supplierId ON batches("supplierId");
CREATE INDEX idx_batches_expiryDate ON batches("expiryDate");
CREATE INDEX idx_batches_status ON batches(status);

-- ============================================
-- TABLE: inbound_headers
-- ============================================
CREATE TABLE inbound_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "inboundNo" VARCHAR(255) NOT NULL UNIQUE,
    "supplierId" UUID NOT NULL,
    "poNo" VARCHAR(255),
    "receivedDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    notes TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_inbound_supplier FOREIGN KEY ("supplierId") 
        REFERENCES suppliers(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT fk_inbound_creator FOREIGN KEY ("createdBy") 
        REFERENCES users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT chk_inbound_status CHECK (status IN ('draft', 'completed', 'cancelled'))
);

CREATE INDEX idx_inbound_headers_supplierId ON inbound_headers("supplierId");
CREATE INDEX idx_inbound_headers_status ON inbound_headers(status);
CREATE INDEX idx_inbound_headers_receivedDate ON inbound_headers("receivedDate");

-- ============================================
-- TABLE: inbound_details
-- ============================================
CREATE TABLE inbound_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "headerId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "batchNo" VARCHAR(255) NOT NULL,
    quantity DECIMAL(10, 2) NOT NULL,
    "manufactureDate" DATE NOT NULL,
    "expDate" DATE NOT NULL,
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_inbound_detail_header FOREIGN KEY ("headerId") 
        REFERENCES inbound_headers(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_inbound_detail_product FOREIGN KEY ("productId") 
        REFERENCES products(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT chk_inbound_detail_quantity CHECK (quantity > 0),
    CONSTRAINT chk_inbound_detail_dates CHECK ("expDate" > "manufactureDate")
);

CREATE INDEX idx_inbound_details_headerId ON inbound_details("headerId");
CREATE INDEX idx_inbound_details_productId ON inbound_details("productId");
CREATE INDEX idx_inbound_details_batchNo ON inbound_details("batchNo");

-- ============================================
-- TABLE: outbound_headers
-- ============================================
CREATE TABLE outbound_headers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "outboundNo" VARCHAR(255) NOT NULL UNIQUE,
    customer VARCHAR(255) NOT NULL,
    "soNo" VARCHAR(255),
    "deliveryDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    notes TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_outbound_creator FOREIGN KEY ("createdBy") 
        REFERENCES users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT chk_outbound_status CHECK (status IN ('draft', 'completed', 'cancelled'))
);

CREATE INDEX idx_outbound_headers_customer ON outbound_headers(customer);
CREATE INDEX idx_outbound_headers_status ON outbound_headers(status);
CREATE INDEX idx_outbound_headers_deliveryDate ON outbound_headers("deliveryDate");

-- ============================================
-- TABLE: outbound_details
-- ============================================
CREATE TABLE outbound_details (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "outboundId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "batchNo" VARCHAR(255),
    quantity DECIMAL(10, 2) NOT NULL,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_outbound_detail_header FOREIGN KEY ("outboundId") 
        REFERENCES outbound_headers(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_outbound_detail_product FOREIGN KEY ("productId") 
        REFERENCES products(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT chk_outbound_detail_quantity CHECK (quantity > 0)
);

CREATE INDEX idx_outbound_details_outboundId ON outbound_details("outboundId");
CREATE INDEX idx_outbound_details_productId ON outbound_details("productId");
CREATE INDEX idx_outbound_details_batchNo ON outbound_details("batchNo");

-- ============================================
-- TABLE: inventory_sessions
-- ============================================
CREATE TABLE inventory_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "inventoryNo" VARCHAR(255) NOT NULL UNIQUE,
    "checkDate" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    checker VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'draft',
    notes TEXT,
    "createdBy" UUID,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_inventory_creator FOREIGN KEY ("createdBy") 
        REFERENCES users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT chk_inventory_status CHECK (status IN ('draft', 'completed', 'cancelled'))
);

CREATE INDEX idx_inventory_sessions_status ON inventory_sessions(status);
CREATE INDEX idx_inventory_sessions_checkDate ON inventory_sessions("checkDate");

-- ============================================
-- TABLE: inventory_counts
-- ============================================
CREATE TABLE inventory_counts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "sessionId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "batchNo" VARCHAR(255) NOT NULL,
    "systemQty" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    "actualQty" DECIMAL(10, 2) NOT NULL DEFAULT 0,
    difference DECIMAL(10, 2) NOT NULL DEFAULT 0,
    notes TEXT,
    "countedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_inventory_count_session FOREIGN KEY ("sessionId") 
        REFERENCES inventory_sessions(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_inventory_count_product FOREIGN KEY ("productId") 
        REFERENCES products(id) 
        ON DELETE RESTRICT 
        ON UPDATE CASCADE,
    CONSTRAINT chk_inventory_systemQty CHECK ("systemQty" >= 0),
    CONSTRAINT chk_inventory_actualQty CHECK ("actualQty" >= 0)
);

CREATE INDEX idx_inventory_counts_sessionId ON inventory_counts("sessionId");
CREATE INDEX idx_inventory_counts_productId ON inventory_counts("productId");
CREATE INDEX idx_inventory_counts_batchNo ON inventory_counts("batchNo");

-- ============================================
-- TABLE: notifications
-- ============================================
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT,
    type VARCHAR(50) NOT NULL DEFAULT 'info',
    "isRead" BOOLEAN NOT NULL DEFAULT false,
    "relatedId" UUID,
    "relatedType" VARCHAR(255),
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_notification_user FOREIGN KEY ("userId") 
        REFERENCES users(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT chk_notification_type CHECK (type IN ('success', 'warning', 'error', 'info'))
);

CREATE INDEX idx_notifications_userId_isRead ON notifications("userId", "isRead");
CREATE INDEX idx_notifications_createdAt ON notifications("createdAt");

-- ============================================
-- TABLE: quality_checks
-- ============================================
CREATE TABLE quality_checks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "qcNo" VARCHAR(255) NOT NULL UNIQUE,
    "inboundId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "batchNo" VARCHAR(255),
    "expectedQty" DECIMAL(10, 2) NOT NULL,
    "receivedQty" DECIMAL(10, 2) NOT NULL,
    "acceptedQty" DECIMAL(10, 2) DEFAULT 0,
    "rejectedQty" DECIMAL(10, 2) DEFAULT 0,
    "damagedQty" DECIMAL(10, 2) DEFAULT 0,
    "qcResult" VARCHAR(50) DEFAULT 'pending',
    "qcBy" UUID,
    "qcDate" TIMESTAMP WITH TIME ZONE,
    "defectTypes" TEXT[],
    images TEXT[],
    notes TEXT,
    status VARCHAR(50) DEFAULT 'pending',
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_qc_inbound FOREIGN KEY ("inboundId") 
        REFERENCES inbound_headers(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_qc_product FOREIGN KEY ("productId") 
        REFERENCES products(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_qc_inspector FOREIGN KEY ("qcBy") 
        REFERENCES users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT chk_qc_result CHECK ("qcResult" IN ('pending', 'passed', 'failed', 'partial')),
    CONSTRAINT chk_qc_status CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_quality_checks_inboundId ON quality_checks("inboundId");
CREATE INDEX idx_quality_checks_status ON quality_checks(status);

-- ============================================
-- TABLE: putaways
-- ============================================
CREATE TABLE putaways (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    "putawayNo" VARCHAR(255) NOT NULL UNIQUE,
    "qcId" UUID NOT NULL,
    "inboundId" UUID NOT NULL,
    "productId" UUID NOT NULL,
    "batchNo" VARCHAR(255),
    quantity DECIMAL(10, 2) NOT NULL,
    "fromLocation" VARCHAR(255),
    "toBinId" UUID,
    "suggestedBinId" UUID,
    priority VARCHAR(50) DEFAULT 'normal',
    "assignedTo" UUID,
    "assignedAt" TIMESTAMP WITH TIME ZONE,
    "startedAt" TIMESTAMP WITH TIME ZONE,
    "completedAt" TIMESTAMP WITH TIME ZONE,
    status VARCHAR(50) DEFAULT 'pending',
    notes TEXT,
    "createdAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT fk_putaway_qc FOREIGN KEY ("qcId") 
        REFERENCES quality_checks(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_putaway_inbound FOREIGN KEY ("inboundId") 
        REFERENCES inbound_headers(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_putaway_product FOREIGN KEY ("productId") 
        REFERENCES products(id) 
        ON DELETE CASCADE 
        ON UPDATE CASCADE,
    CONSTRAINT fk_putaway_bin FOREIGN KEY ("toBinId") 
        REFERENCES bins(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT fk_putaway_suggested_bin FOREIGN KEY ("suggestedBinId") 
        REFERENCES bins(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT fk_putaway_worker FOREIGN KEY ("assignedTo") 
        REFERENCES users(id) 
        ON DELETE SET NULL 
        ON UPDATE CASCADE,
    CONSTRAINT chk_putaway_priority CHECK (priority IN ('low', 'normal', 'high', 'urgent')),
    CONSTRAINT chk_putaway_status CHECK (status IN ('pending', 'assigned', 'in_progress', 'completed', 'cancelled'))
);

CREATE INDEX idx_putaways_status_priority ON putaways(status, priority);
CREATE INDEX idx_putaways_assignedTo ON putaways("assignedTo");

-- ============================================
-- TRIGGERS: Auto update updatedAt timestamp
-- ============================================
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW."updatedAt" = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply triggers to all tables with updatedAt
CREATE TRIGGER update_users_updated_at BEFORE UPDATE ON users FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_suppliers_updated_at BEFORE UPDATE ON suppliers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_products_updated_at BEFORE UPDATE ON products FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_stock_updated_at BEFORE UPDATE ON stock FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_batches_updated_at BEFORE UPDATE ON batches FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_warehouses_updated_at BEFORE UPDATE ON warehouses FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_zones_updated_at BEFORE UPDATE ON zones FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_aisles_updated_at BEFORE UPDATE ON aisles FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_racks_updated_at BEFORE UPDATE ON racks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bins_updated_at BEFORE UPDATE ON bins FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_bin_stocks_updated_at BEFORE UPDATE ON bin_stocks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inbound_headers_updated_at BEFORE UPDATE ON inbound_headers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outbound_headers_updated_at BEFORE UPDATE ON outbound_headers FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_outbound_details_updated_at BEFORE UPDATE ON outbound_details FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_inventory_sessions_updated_at BEFORE UPDATE ON inventory_sessions FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_notifications_updated_at BEFORE UPDATE ON notifications FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_quality_checks_updated_at BEFORE UPDATE ON quality_checks FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();
CREATE TRIGGER update_putaways_updated_at BEFORE UPDATE ON putaways FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ============================================
-- TRIGGERS: Auto calculate inventory difference
-- ============================================
CREATE OR REPLACE FUNCTION calculate_inventory_difference()
RETURNS TRIGGER AS $$
BEGIN
    NEW.difference = NEW."actualQty" - NEW."systemQty";
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER calculate_inventory_counts_difference
    BEFORE INSERT OR UPDATE ON inventory_counts
    FOR EACH ROW 
    EXECUTE FUNCTION calculate_inventory_difference();

-- ============================================
-- VIEWS: Useful views for reporting
-- ============================================

-- View: Stock with product info
CREATE OR REPLACE VIEW v_stock_summary AS
SELECT 
    s.id,
    s."productId",
    p.sku,
    p.name AS "productName",
    p.unit,
    s.quantity,
    s."reservedQty",
    (s.quantity - s."reservedQty") AS "availableQty",
    p.status AS "productStatus",
    p."manageBatch",
    s."updatedAt"
FROM stock s
INNER JOIN products p ON s."productId" = p.id;

-- View: Batches with expiry status
CREATE OR REPLACE VIEW v_batch_expiry_status AS
SELECT 
    b.id,
    b."batchNo",
    b."productId",
    p.sku,
    p.name AS "productName",
    b.quantity,
    b."manufactureDate",
    b."expiryDate",
    b.warehouse,
    b.location,
    b.status,
    s.name AS "supplierName",
    (b."expiryDate" - CURRENT_DATE) AS "daysUntilExpiry",
    CASE 
        WHEN b."expiryDate" < CURRENT_DATE THEN 'expired'
        WHEN (b."expiryDate" - CURRENT_DATE) <= 7 THEN 'critical'
        WHEN (b."expiryDate" - CURRENT_DATE) <= 30 THEN 'warning'
        ELSE 'normal'
    END AS "expiryStatus"
FROM batches b
INNER JOIN products p ON b."productId" = p.id
INNER JOIN suppliers s ON b."supplierId" = s.id
WHERE b.status = 'active' AND b.quantity > 0;

-- View: Inbound summary with details
CREATE OR REPLACE VIEW v_inbound_summary AS
SELECT 
    ih.id,
    ih."inboundNo",
    ih."receivedDate",
    ih.status,
    s.name AS "supplierName",
    u."fullName" AS "createdByName",
    COUNT(id_detail.id) AS "itemCount",
    SUM(id_detail.quantity) AS "totalQuantity",
    ih."createdAt",
    ih."updatedAt"
FROM inbound_headers ih
LEFT JOIN suppliers s ON ih."supplierId" = s.id
LEFT JOIN users u ON ih."createdBy" = u.id
LEFT JOIN inbound_details id_detail ON ih.id = id_detail."headerId"
GROUP BY ih.id, s.name, u."fullName";

-- View: Outbound summary with details
CREATE OR REPLACE VIEW v_outbound_summary AS
SELECT 
    oh.id,
    oh."outboundNo",
    oh."deliveryDate",
    oh.customer,
    oh.status,
    u."fullName" AS "createdByName",
    COUNT(od.id) AS "itemCount",
    SUM(od.quantity) AS "totalQuantity",
    oh."createdAt",
    oh."updatedAt"
FROM outbound_headers oh
LEFT JOIN users u ON oh."createdBy" = u.id
LEFT JOIN outbound_details od ON oh.id = od."outboundId"
GROUP BY oh.id, u."fullName";

-- ============================================
-- ANALYZE: Update statistics for query optimization
-- ============================================
ANALYZE users;
ANALYZE suppliers;
ANALYZE products;
ANALYZE stock;
ANALYZE batches;
ANALYZE warehouses;
ANALYZE zones;
ANALYZE aisles;
ANALYZE racks;
ANALYZE bins;
ANALYZE bin_stocks;
ANALYZE inbound_headers;
ANALYZE inbound_details;
ANALYZE outbound_headers;
ANALYZE outbound_details;
ANALYZE inventory_sessions;
ANALYZE inventory_counts;
ANALYZE notifications;
ANALYZE quality_checks;
ANALYZE putaways;

-- ============================================
-- VERIFICATION: Display results
-- ============================================
DO $$
DECLARE
    table_count INTEGER;
    view_count INTEGER;
    index_count INTEGER;
    trigger_count INTEGER;
BEGIN
    SELECT COUNT(*) INTO table_count
    FROM information_schema.tables 
    WHERE table_schema = 'public' 
      AND table_type = 'BASE TABLE';
    
    SELECT COUNT(*) INTO view_count
    FROM information_schema.views 
    WHERE table_schema = 'public';
    
    SELECT COUNT(*) INTO index_count
    FROM pg_indexes 
    WHERE schemaname = 'public';
    
    SELECT COUNT(*) INTO trigger_count
    FROM information_schema.triggers
    WHERE trigger_schema = 'public';
    
    RAISE NOTICE '✅ Database schema created successfully!';
    RAISE NOTICE 'Tables created: %', table_count;
    RAISE NOTICE 'Views created: %', view_count;
    RAISE NOTICE 'Indexes created: %', index_count;
    RAISE NOTICE 'Triggers created: %', trigger_count;
END $$;

-- List all tables with column count
SELECT 
    table_name,
    (SELECT COUNT(*) FROM information_schema.columns 
     WHERE table_schema = 'public' AND table_name = t.table_name) AS column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
  AND table_type = 'BASE TABLE'
ORDER BY table_name;