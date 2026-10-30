const { randomUUID } = require("crypto");
const Customer = require("../../domain/entities/Customer");
const ManageLoyaltyPoints = require("../../application/use-cases/ManageLoyaltyPoints");
const PostgresCustomerRepository = require("../repositories/PostgresCustomerRepository");
const pool = require("./postgres");

async function test() {
    const repository = new PostgresCustomerRepository();
    const useCase = new ManageLoyaltyPoints(repository);
    const authUserId = randomUUID();

    try {
        const customer = await repository.create(new Customer({
            authUserId,
            fullName: "Loyalty Test"
        }));

        const added = await useCase.execute({
            customerId: customer.id,
            action: "ADD",
            points: 100
        });

        if (added.loyaltyPoints !== 100) {
            throw new Error("Add points failed");
        }
        console.log("PASS 1: Add 100 Points");

        const redeemed = await useCase.execute({
            customerId: customer.id,
            action: "REDEEM",
            points: 30
        });

        if (redeemed.loyaltyPoints !== 70) {
            throw new Error("Redeem points failed");
        }
        console.log("PASS 2: Redeem 30 Points");

        const saved = await repository.findById(customer.id);

        if (saved.loyaltyPoints !== 70) {
            throw new Error("Points not persisted");
        }
        console.log("PASS 3: Points Saved In PostgreSQL");

        let rejected = false;

        try {
            await useCase.execute({
                customerId: customer.id,
                action: "REDEEM",
                points: 100
            });
        } catch (error) {
            if (error.message === "Insufficient loyalty points") {
                rejected = true;
            } else {
                throw error;
            }
        }

        if (!rejected) {
            throw new Error("Insufficient points accepted");
        }

        const unchanged = await repository.findById(customer.id);

        if (unchanged.loyaltyPoints !== 70) {
            throw new Error("Points changed after rejection");
        }

        console.log("PASS 4: Insufficient Points Rejected");
        console.log("PASS: Loyalty PostgreSQL Test");

    } catch (error) {
        console.error("FAIL:", error.message);
        process.exitCode = 1;

    } finally {
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

test();
