const pool = require("./postgres");

async function testConnection() {
    try {
        const result = await pool.query(`
            SELECT
                current_database() AS database_name,
                current_user AS username
        `);

        console.log("PASS: PostgreSQL connected");
        console.log("Database:", result.rows[0].database_name);
        console.log("User:", result.rows[0].username);

    } catch (error) {
        console.error("FAIL: PostgreSQL connection");
        console.error("Error:", error.message);
        process.exitCode = 1;

    } finally {
        await pool.end();
    }
}

testConnection();