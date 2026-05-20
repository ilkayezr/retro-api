// Stok ayarlama (düşüm/arttırma) endpoint controller
async function adjustStock(req, res) {
    const stockId = req.params.id;
    const { delta, note } = req.body;
    try {
        const data = await netstokService.adjustStock(stockId, delta, note);
        return res.status(200).json(data);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || "Stok ayarlama işlemi başarısız"
        });
    }
}
const netstokService = require("./netstok.service")

async function getProducts(req, res) {
    const filters = {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        type: req.query.type,
        category: req.query.category,
        isActive: req.query.isActive
    }

    try {
        const data = await netstokService.getProducts(filters)
        return res.status(200).json(data)
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || "Stok ürünleri alınamadı"
        })
    }
}

    async function getStocks(req, res) {
        const filters = {
            page: req.query.page,
            limit: req.query.limit,
            productId: req.query.productId,
            locationType: req.query.locationType,
            locationId: req.query.locationId
        }

        try {
            const data = await netstokService.getStocks(filters)
            return res.status(200).json(data)
        } catch (error) {
            return res.status(error.statusCode || 500).json({
                message: error.message || "Stok kayıtları alınamadı"
            })
        }
    }

// Ürün+stok birleştiren endpoint controller
async function getProductsWithStock(req, res) {
    const filters = {
        page: req.query.page,
        limit: req.query.limit,
        search: req.query.search,
        type: req.query.type,
        category: req.query.category,
        isActive: req.query.isActive
    };
    try {
        const data = await netstokService.getProductsWithStock(filters);
        return res.status(200).json(data);
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || "Ürün+stok listesi alınamadı"
        });
    }
}

module.exports = {
    getStocks,
    getProducts,
    getProductsWithStock,
    adjustStock
}
