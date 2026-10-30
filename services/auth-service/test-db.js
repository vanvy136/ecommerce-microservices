const pool = require("./src/infrastructure/database/postgres");

async function main() {
    try {
        const result = await pool.query(
            "SELECT current_database() AS database_name, 1 AS connected"
        );

        console.log("PASS: POSTGRESQL CONNECTION");
        console.log(result.rows[0]);
    } catch (error) {
        console.error("FAIL: POSTGRESQL CONNECTION");
        console.error(error.message);
        process.exitCode = 1;
    } finally {
        await pool.end();
    }
}

main();
