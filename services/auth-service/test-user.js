const assert = require("node:assert/strict");
const { randomUUID } = require("node:crypto");
const User = require("./src/domain/entities/User");

const user = new User({
    id: randomUUID(),
    email: "  TEST@EXAMPLE.COM  ",
    passwordHash: "sample-hash"
});

assert.equal(user.email, "test@example.com");
assert.equal(user.role, "customer");
assert.equal(user.toPublicJSON().passwordHash, undefined);

assert.throws(
    () => new User({
        id: randomUUID(),
        email: "test@example.com",
        passwordHash: "sample-hash",
        role: "invalid"
    }),
    /Invalid user role/
);

console.log("PASS: USER ENTITY");
console.log(user.toPublicJSON());
