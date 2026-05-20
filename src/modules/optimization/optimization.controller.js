const OPTIMIZER_URL = process.env.OPTIMIZER_URL || "http://localhost:8000"
const { applyOptimizedRoutes } = require("./optimization.service")

async function getOptimizedRoutes(req, res) {
    try {
        const response = await fetch(`${OPTIMIZER_URL}/optimize`)

        if (!response.ok) {
            const err = await response.json().catch(() => ({}))
            return res.status(response.status).json({
                message: err.detail || "Optimizasyon servisi hata döndürdü"
            })
        }

        const data = await response.json()
        return res.status(200).json(data)

    } catch (error) {
        return res.status(503).json({
            message: "Optimizasyon servisine ulaşılamadı"
        })
    }
}

async function applyRoutes(req, res) {
    const { routes } = req.body

    if (!routes || !Array.isArray(routes) || routes.length === 0) {
        return res.status(400).json({
            message: "Routes array boş veya hatalı"
        })
    }

    try {
        const result = await applyOptimizedRoutes(routes, req.user?.id)
        return res.status(200).json(result)

    } catch (error) {
        console.error("Apply routes error:", error)
        return res.status(500).json({
            message: error.message || "Rotalar atanırken hata oluştu"
        })
    }
}

module.exports = { getOptimizedRoutes, applyRoutes }
