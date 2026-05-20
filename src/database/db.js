const { Pool } = require("pg")

const isProduction = process.env.NODE_ENV === "production"

const pool = process.env.DATABASE_URL
  ? new Pool({
      connectionString: process.env.DATABASE_URL,
      ssl: isProduction ? { rejectUnauthorized: false } : false,
    })
  : new Pool({
      user: process.env.PGUSER || "postgres",
      host: process.env.PGHOST || "localhost",
      database: process.env.PGDATABASE || "retro_system",
      password: process.env.PGPASSWORD || "postgres",
      port: Number(process.env.PGPORT || 5432),
    })

module.exports = pool