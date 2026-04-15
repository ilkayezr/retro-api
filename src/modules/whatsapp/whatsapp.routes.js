const express = require("express")
const router = express.Router()
const {receiveWhatsAppMessage} = require("./whatsapp.controller")
const pool = require("../../database/db")

async function getHotelFromApiKey(req, res, next) {
    try {
        const apiKey = req.header("x-api-key")
        if (!apiKey) {
            return res.status(401).json({message: "API key gerekli"})
        }
        
        const result = await pool.query(
            "SELECT id FROM hotels WHERE api_key = $1",
            [apiKey]
        )
        
        if (result.rows.length === 0) {
            return res.status(401).json({message: "Invalid API key"})
        }
        
        req.hotelId = result.rows[0].id
        next()
    } catch (error) {
        return res.status(500).json({message: "Auth error"})
    }
}

router.post("/webhook", getHotelFromApiKey, receiveWhatsAppMessage)
module.exports = router