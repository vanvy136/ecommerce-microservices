const assert = require("node:assert/strict");
const bcrypt = require("bcryptjs");
const LoginUser = require("./src/application/use-cases/LoginUser");
const User = require("./src/domain/entities/User");
const { randomUUID } = require("node:crypto");

async function main() {
    const password = "TestPassword123!";
    const passwordHash = await bcrypt.hash(password, 10);

    const user = new User({
        id: randomUUID(),
        email: "test@example.com",
        passwordHash,
        role: "customer"
    });

    const fakeRepository = {
        async findByEmail(email) {
            return email === user.email ? user : null;
        }
    };

    const loginUser = new LoginUser(fakeRepository);

    try {
        console.log("=== TEST LOGIN USER ===");

        const result = await loginUser.execute({
            email: "TEST@EXAMPLE.COM",
            password
        });

        assert.equal(result.email, "test@example.com");
        assert.equal(result.role, "customer");
        assert.equal(result.passwordHash, undefined);

        console.log("PASS: LOGIN SUCCESS");

        await assert.rejects(
            loginUser.execute({
                email: "test@example.com",
                password: "WrongPassword123!"
            }),
            /Invalid email or password/
        );

        console.log("PASS: WRONG PASSWORD");

        await assert.rejects(
            loginUser.execute({
                email: "notfound@example.com",
                password
            }),
            /Invalid email or password/
        );

        console.log("PASS: USER NOT FOUND");

        await assert.rejects(
            loginUser.execute({
                email: "",
                password: ""
            }),
            /Email and password are required/
        );

        console.log("PASS: MISSING CREDENTIALS");
        console.log("PASS: LOGIN USE CASE");
    } catch (error) {
        console.error("FAIL:", error.message);
        process.exitCode = 1;
    }
}

main();
