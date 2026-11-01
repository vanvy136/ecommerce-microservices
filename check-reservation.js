const reservationId = "order:363ab79e-bb67-4d1b-8111-129260ef0051:product:6ae4c200cb400bf315866293";

let found = false;

const databases = db.adminCommand({ listDatabases: 1 }).databases;

for (const item of databases) {
    const database = db.getSiblingDB(item.name);

    for (const collectionName of database.getCollectionNames()) {
        if (!collectionName.toLowerCase().includes("reservation")) {
            continue;
        }

        const record = database.getCollection(collectionName).findOne({
            reservationId: reservationId
        });

        if (record) {
            found = true;
            print("=== FOUND RESERVATION ===");
            print("Database: " + item.name);
            print("Collection: " + collectionName);
            printjson(record);
        }
    }
}

if (!found) {
    print("KHONG TIM THAY RESERVATION");
}
