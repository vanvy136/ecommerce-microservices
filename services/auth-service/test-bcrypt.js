const bcrypt = require("bcryptjs");

const password = "TestPassword123!";
const hash = bcrypt.hashSync(password, 10);

console.log("=== TEST BCRYPTJS ===");
console.log("HASH:", hash);
console.log("VERIFY:", bcrypt.compareSync(password, hash));
console.log("WRONG PASSWORD:", bcrypt.compareSync("WrongPassword", hash));
