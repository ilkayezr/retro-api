const express = require("express")
const router = express.Router()
const {login} = require("./auth.controller")
const authMiddleware = require("../../middleware/auth.middleware")
const {requireRole} = require("../../middleware/role.middleware")

router.post("/login",login)

router.get("/admin-test", authMiddleware,requireRole("admin"), (req,res) => {
    res.json({message:"admin erişimi başarılı"})
})

router.get("/me",authMiddleware,(req,res) => {
    res.json(req.user)
})


module.exports = router