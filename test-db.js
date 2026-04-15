const pool = require("./src/database/db")

async function testDB() {
  try {
    const result = await pool.query("SELECT NOW()")
    console.log("DB bağlantısı başarılı:", result.rows[0])
  } catch (err) {
    console.error("DB bağlantı hatası:", err.message)
  } finally {
    process.exit()
  }
}

testDB()