const productDB = db.getSiblingDB("product_db");
const shipmentDB = db.getSiblingDB("shipment_db");

if (!productDB.getCollectionNames().includes("products")) {
    productDB.createCollection("products");
}

if (!shipmentDB.getCollectionNames().includes("shipments")) {
    shipmentDB.createCollection("shipments");
}

print("TAO DATABASES THANH CONG");

print("product_db: " + productDB.getCollectionNames().join(", "));
print("shipment_db: " + shipmentDB.getCollectionNames().join(", "));
