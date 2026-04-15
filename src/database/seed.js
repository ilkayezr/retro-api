
const bcrypt = require("bcrypt")
const pool = require("./db")

async function seed() {

  const adminPasswordHash = await bcrypt.hash("admin123",10)
  const techPasswordHash = await bcrypt.hash("tech123",10)
  const teknPasswordHash = await bcrypt.hash("tekn123",10)
  
  const userQuery = `
  INSERT INTO users(full_name, phone, username, password_hash,role, is_active)
  VALUES ($1, $2, $3,$4,$5,$6)
  ON CONFLICT (username) DO NOTHING `

  await pool.query(userQuery,[
    "Admin Deneme",
    "04444444443",
    "admin2",
    adminPasswordHash,
    "admin",
    true
  ])

  await pool.query(userQuery,[
    "Tech Deneme",
    "03333333332",
    "tech2",
    techPasswordHash,
    "technician",
    true
  ])

  await pool.query(userQuery,[
    "teknisyen tech",
    "06677733332",
    "teknisyen_07",
    teknPasswordHash,
    "technician",
    true
  ])

  const hotelQuery= `
  INSERT INTO hotels(name,api_key,is_active)
  VALUES ($1,$2,$3)
  ON CONFLICT (api_key) DO NOTHING`

  await pool.query(hotelQuery,[
    "ABC Otel",
    "abc-api-key",
    true
  ])

  const incidentQuery =`
  INSERT INTO incidents(title, description, priority,status,hotel_id,assigned_to)
  VALUES ($1,$2,$3,$4,$5,$6)`

  await pool.query(incidentQuery,[
    "cihaz sorunu",
    "2. katta cihaz bozuldu",
    "low",
    "resolved",
    2,
    4

  ])
}

module.exports = seed