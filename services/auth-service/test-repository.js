const PostgresUserRepository = require("./src/infrastructure/repositories/PostgresUserRepository");
const pool = require("./src/infrastructure/database/postgres");

async function main() {
    try {
        const repository = new PostgresUserRepository();

        const user = await repository.findByEmail(
            "notfound@example.com"
        );

        if (user === null) {
            console.log("PASS: FIND USER BY EMAIL");
        } else {
            console.log("INFO: USER EXISTS");
            console.log(user.toPublicJSON());
        }

        const result = await pool.query(
            "SELECT COUNT(*) AS total FROM users"
        );

        console.log("TOTAL USERS:", result.rows[0].total);
        console.log("PASS: POSTGRES USER REPOSITORY");
    } catch (error) {
        console.error("FAIL:", error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
