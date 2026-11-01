
const pool = require("./postgres");

async function testConnection() {
  try {
    const result = await pool.query(
      "SELECT current_database() AS database, current_user AS username, NOW() AS server_time"
    );

    console.log("=== SHIPMENT DATABASE CONNECTION ===");
    console.log(result.rows[0]);
    console.log("RESULT: PASS");
  } catch (error) {
    console.error("RESULT: FAIL");
    console.error(error.message);
    process.exitCode = 1;
  } finally {
    await pool.end();
  }
}

testConnection();
