const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const bcrypt = require("bcryptjs");

const RegisterUser = require("./src/application/use-cases/RegisterUser");
const PostgresUserRepository = require("./src/infrastructure/repositories/PostgresUserRepository");
const pool = require("./src/infrastructure/database/postgres");

async function main() {
    const repository = new PostgresUserRepository();
    const registerUser = new RegisterUser(repository);

    const email = `test-${randomUUID()}@example.com`;
    const password = "TestPassword123!";

    try {
        console.log("=== TEST REGISTER USER ===");

        const result = await registerUser.execute({
            email: email.toUpperCase(),
            password
        });

        assert.equal(result.email, email);
        assert.equal(result.role, "customer");
        assert.equal(result.passwordHash, undefined);

        console.log("PASS: REGISTER USER");

        const savedUser = await repository.findByEmail(email);

        assert.ok(savedUser);
        assert.equal(savedUser.id, result.id);
        assert.equal(
            await bcrypt.compare(password, savedUser.passwordHash),
            true
        );

        console.log("PASS: PASSWORD HASH");

        await assert.rejects(
            registerUser.execute({ email, password }),
            /Email already registered/
        );

        console.log("PASS: DUPLICATE EMAIL");

        await assert.rejects(
            registerUser.execute({
                email: "invalid-email",
                password
            }),
            /Invalid email format/
        );

        console.log("PASS: INVALID EMAIL");

        await assert.rejects(
            registerUser.execute({
                email: "new@example.com",
                password: "123"
            }),
            /Password must have at least 8 characters/
        );

        console.log("PASS: SHORT PASSWORD");
        console.log("PASS: REGISTER USE CASE");
    } catch (error) {
        console.error("FAIL:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
