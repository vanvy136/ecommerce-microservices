require("dotenv").config();

const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const JwtService = require("./src/infrastructure/security/JwtService");

function main() {
    const jwtService = new JwtService();

    const user = {
        id: randomUUID(),
        email: "test@example.com",
        role: "customer"
    };

    console.log("=== TEST JWT SERVICE ===");

    const token = jwtService.generateAccessToken(user);

    assert.equal(typeof token, "string");
    assert.equal(token.split(".").length, 3);

    console.log("PASS: GENERATE ACCESS TOKEN");

    const payload = jwtService.verifyAccessToken(token);

    assert.equal(payload.sub, user.id);
    assert.equal(payload.role, "customer");
    assert.equal(payload.iss, process.env.JWT_ISSUER);
    assert.equal(payload.aud, process.env.JWT_AUDIENCE);
    assert.ok(payload.exp > payload.iat);

    console.log("PASS: VERIFY ACCESS TOKEN");
    console.log("PASS: USER ID");
    console.log("PASS: USER ROLE");
    console.log("PASS: TOKEN EXPIRATION");

    assert.equal(payload.email, undefined);
    assert.equal(payload.passwordHash, undefined);

    console.log("PASS: NO SENSITIVE DATA");

    const parts = token.split(".");
    const signature = parts[2];
    const changedCharacter = signature[0] === "A" ? "B" : "A";

    const tamperedToken = [
        parts[0],
        parts[1],
        changedCharacter + signature.slice(1)
    ].join(".");

    assert.throws(
        () => jwtService.verifyAccessToken(tamperedToken)
    );

    console.log("PASS: TAMPERED TOKEN REJECTED");

    assert.throws(
        () => jwtService.verifyAccessToken("")
    );

    console.log("PASS: EMPTY TOKEN REJECTED");
    console.log("PASS: JWT SERVICE");
}

try {
    main();
} catch (error) {
    console.error("FAIL:", error.message);
    process.exitCode = 1;
}
