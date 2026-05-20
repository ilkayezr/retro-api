const authMiddleware = require("../../middleware/auth.middleware")
const requireRole = require("../../middleware/requireRole.middleware")
const express = require("express")
const router = express.Router()
const { getOptimizedRoutes, applyRoutes } = require("./optimization.controller")

router.get("/", authMiddleware, requireRole("admin"), getOptimizedRoutes)
router.post("/apply", authMiddleware, requireRole("admin"), applyRoutes)

module.exports = router
