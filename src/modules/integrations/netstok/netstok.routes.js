const express = require("express")
const authMiddleware = require("../../../middleware/auth.middleware")
const netstokController = require("./netstok.controller")

const router = express.Router()

router.get("/products", authMiddleware, netstokController.getProducts)
router.get("/stocks", authMiddleware, netstokController.getStocks)
router.get("/products-with-stock", authMiddleware, netstokController.getProductsWithStock)
// Stok ayarlama (düşüm/arttırma) endpointi
router.patch("/stocks/:id/adjust", authMiddleware, netstokController.adjustStock)

module.exports = router
