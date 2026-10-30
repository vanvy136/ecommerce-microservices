const { randomUUID } = require("crypto");

const CreateCustomer = require("../../application/use-cases/CreateCustomer");
const PostgresCustomerRepository = require("../repositories/PostgresCustomerRepository");
const pool = require("./postgres");

async function runTest() {
    const repository = new PostgresCustomerRepository();
    const useCase = new CreateCustomer(repository);

    const authUserId = randomUUID();

    try {
        // TEST 1: Tạo khách hàng thành công
        const customer = await useCase.execute({
            authUserId,
            fullName: "Nguyen Van A",
            phone: "0901234567"
        });

        if (!customer.id || customer.authUserId !== authUserId) {
            throw new Error("CreateCustomer failed");
        }

        console.log("PASS 1: Create Customer");

        // TEST 2: Kiểm tra dữ liệu được lưu
        const saved = await repository.findByAuthUserId(authUserId);

        if (!saved || saved.id !== customer.id) {
            throw new Error("Customer was not saved");
        }

        console.log("PASS 2: Customer saved in PostgreSQL");

        // TEST 3: Không cho tạo khách hàng trùng
        let duplicateRejected = false;

        try {
            await useCase.execute({
                authUserId,
                fullName: "Nguyen Van B"
            });
        } catch (error) {
            if (error.message === "Customer already exists") {
                duplicateRejected = true;
            } else {
                throw error;
            }
        }

        if (!duplicateRejected) {
            throw new Error("Duplicate customer was accepted");
        }

        console.log("PASS 3: Duplicate Customer Rejected");
        console.log("PASS: CreateCustomer Use Case Database Test");

    } catch (error) {
        console.error("FAIL:", error.message);
        process.exitCode = 1;

    } finally {
        // Chỉ xóa dữ liệu thử nghiệm của lần chạy này
        try {
            await pool.query(
                "DELETE FROM customers WHERE auth_user_id = $1",
                [authUserId]
            );
        } catch (error) {
            console.error("Cleanup failed:", error.message);
            process.exitCode = 1;
        }

        await pool.end();
    }
}

runTest();