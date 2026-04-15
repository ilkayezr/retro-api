const express = require("express")
const router = express.Router()
const {createIncident, getIncidents, getIncidentById,assignIncidentToSelf, updatedTechnicianStatus, reassignIncident, adminStatus,getActiveIncidents,getIncidentHistory,getIncidentsByHotel} = require("./incident.controller")
const authMiddleware = require("../../middleware/auth.middleware")
const requireRole = require("../../middleware/requireRole.middleware")

router.get("/active",authMiddleware, getActiveIncidents)
router.get("/history",authMiddleware,getIncidentHistory)
router.get("/hotel/:hotelId",authMiddleware,getIncidentsByHotel)
router.post("/",authMiddleware,createIncident)
router.get("/",authMiddleware,getIncidents)
router.get("/:id",authMiddleware,getIncidentById)
router.patch("/:id/assign-self", authMiddleware,requireRole("technician") ,assignIncidentToSelf)
router.patch("/:id/status",authMiddleware,requireRole("technician"),updatedTechnicianStatus)
router.patch("/:id/reassign",authMiddleware,requireRole("admin"),reassignIncident)
router.patch("/:id/admin-status",authMiddleware,requireRole("admin"),adminStatus)



module.exports = router

