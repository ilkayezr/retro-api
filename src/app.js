require("dotenv").config()
const express = require("express")
const cors = require("cors")
const authRoutes = require("./modules/auth/auth.routes")
const incidentRoutes = require("./modules/incidents/incident.routes")
const netstokRoutes = require("./modules/integrations/netstok/netstok.routes")
const whatsappRoutes = require("./modules/whatsapp/whatsapp.routes")
const optimizationRoutes = require("./modules/optimization/optimization.router")

const app =express()

app.use(cors())
app.use(express.json())
app.use("/api/auth", authRoutes)
app.use("/api/incidents",incidentRoutes)
app.use("/api/integrations/netstok", netstokRoutes)
app.use("/api/whatsapp", whatsappRoutes)
app.use("/api/optimize-routes", optimizationRoutes)
module.exports = app
