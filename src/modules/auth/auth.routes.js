const express = require("express")
const router = express.Router()
const {login, getTechnicians, forgotPassword,resetPassword} = require("./auth.controller")
const authMiddleware = require("../../middleware/auth.middleware")
const {requireRole} = require("../../middleware/role.middleware")

router.post("/login",login)

router.get("/admin-test", authMiddleware,requireRole("admin"), (req,res) => {
    res.json({message:"admin erişimi başarılı"})
})

router.get("/me",authMiddleware,(req,res) => {
    res.json(req.user)
})

router.get("/technicians", authMiddleware, requireRole("admin"), getTechnicians)
router.post("/forgot-password",forgotPassword)
router.post("/reset-password",resetPassword)

module.exports = router