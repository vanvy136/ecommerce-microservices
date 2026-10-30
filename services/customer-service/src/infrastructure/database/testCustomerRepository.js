const { randomUUID } = require("crypto");

const Customer = require("../../domain/entities/Customer");
const PostgresCustomerRepository = require("../repositories/PostgresCustomerRepository");
const pool = require("./postgres");

async function runTest() {
    const repository = new PostgresCustomerRepository();
    const authUserId = randomUUID();
    let createdId = null;

    try {
        // TEST 1: Tạo khách hàng
        const customer = new Customer({
            authUserId,
            fullName: "Nguyen Van A",
            phone: "0901234567"
        });

        const created = await repository.create(customer);
        createdId = created.id;

        console.log("PASS 1: Create Customer");

        // TEST 2: Tìm theo ID
        const found = await repository.findById(created.id);

        if (!found || found.fullName !== "Nguyen Van A") {
            throw new Error("FindById failed");
        }

        console.log("PASS 2: Find Customer By ID");

        // TEST 3: Tìm theo Auth User ID
        const foundByAuth = await repository.findByAuthUserId(authUserId);

        if (!foundByAuth || foundByAuth.id !== created.id) {
            throw new Error("FindByAuthUserId failed");
        }

        console.log("PASS 3: Find Customer By Auth User ID");

        // TEST 4: Cập nhật điểm
        found.addPoints(100);
        found.redeemPoints(30);

        const updated = await repository.update(found);

        if (!updated || updated.loyaltyPoints !== 70) {
            throw new Error("Update Customer failed");
        }

        console.log("PASS 4: Update Customer");
        console.log("Points:", updated.loyaltyPoints);
        console.log("Tier:", updated.membershipTier);

        console.log("PASS: Customer Repository Database Test");

    } catch (error) {
        console.error("FAIL:", error.message);
        process.exitCode = 1;

    } finally {
        // Chỉ xóa dữ liệu kiểm thử vừa tạo
        if (createdId) {
            try {
                await pool.query(
                    "DELETE FROM customers WHERE id = $1 AND auth_user_id = $2",
                    [createdId, authUserId]
                );
            } catch (error) {
                console.error("Cleanup failed:", error.message);
                process.exitCode = 1;
            }
        }

        await pool.end();
    }
}

runTest();