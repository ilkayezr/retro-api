// Stok ayarlama (düşüm/arttırma) fonksiyonu
async function adjustStock(stockId, delta, note) {
    if (!stockId || typeof delta !== 'number' || !note || !note.trim()) {
        const error = new Error("Eksik veya hatalı parametre: stockId, delta, note zorunlu.");
        error.statusCode = 400;
        throw error;
    }
    const token = await getAccessToken();
    const path = `/stocks/${stockId}/adjust`;
    const body = JSON.stringify({ delta, note });
    const response = await request(path, {
        method: "PATCH",
        headers: getAuthHeaders(token),
        body
    });
    return response;
}
const DEFAULT_BASE_URL = "https://backend-production-d62a.up.railway.app/api"

let accessToken = null
let refreshToken = null
let accessTokenExpiresAt = 0

function getBaseUrl() {
    return (process.env.NETSTOK_API_BASE_URL || DEFAULT_BASE_URL).replace(/\/$/, "")
}

function getCredentials() {
    const email = process.env.NETSTOK_EMAIL
    const password = process.env.NETSTOK_PASSWORD

    if (!email || !password) {
        const error = new Error("entegrasyon bilgileri eksik")
        error.statusCode = 500
        throw error
    }

    return { email, password }
}

function ensureFetch() {
    if (typeof fetch !== "function") {
        const error = new Error("Bu Node sürümünde fetch desteklenmiyor")
        error.statusCode = 500
        throw error
    }
}

function getAuthHeaders(token) {
    return {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json"
    }
}

function getErrorMessage(body, fallback) {
    if (!body) return fallback

    const { message } = body
    if (Array.isArray(message)) {
        return message.join(", ")
    }
    if (typeof message === "string" && message.trim()) {
        return message
    }
    return fallback
}

async function parseJsonResponse(response) {
    const text = await response.text()
    if (!text) {
        return null
    }

    try {
        return JSON.parse(text)
    } catch (_) {
        return null
    }
}

async function request(path, options = {}) {
    ensureFetch()

    const response = await fetch(`${getBaseUrl()}${path}`, options)
    const body = await parseJsonResponse(response)

    if (!response.ok) {
        const error = new Error(getErrorMessage(body, "NetStok isteği başarısız oldu"))
        error.statusCode = response.status
        error.details = body
        throw error
    }

    return body
}

async function login() {
    const credentials = getCredentials()
    const body = await request("/auth/login", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify(credentials)
    })

    accessToken = body?.accessToken || null
    refreshToken = body?.refreshToken || null
    accessTokenExpiresAt = Date.now() + 14 * 60 * 1000

    if (!accessToken) {
        const error = new Error("NetStok access token alınamadı")
        error.statusCode = 502
        throw error
    }

    return accessToken
}

async function refreshAccessToken() {
    if (!refreshToken) {
        return login()
    }

    const body = await request("/auth/refresh", {
        method: "POST",
        headers: {
            "Content-Type": "application/json"
        },
        body: JSON.stringify({ refreshToken })
    })

    accessToken = body?.accessToken || null
    refreshToken = body?.refreshToken || refreshToken
    accessTokenExpiresAt = Date.now() + 14 * 60 * 1000

    if (!accessToken) {
        const error = new Error("NetStok refresh işlemi başarısız")
        error.statusCode = 502
        throw error
    }

    return accessToken
}

async function getAccessToken() {
    if (accessToken && Date.now() < accessTokenExpiresAt) {
        return accessToken
    }

    if (refreshToken) {
        try {
            return await refreshAccessToken()
        } catch (_) {
            accessToken = null
            refreshToken = null
            accessTokenExpiresAt = 0
        }
    }

    return login()
}

function buildProductsQuery(filters = {}) {
    const params = new URLSearchParams()

    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === "") {
            continue
        }
        params.set(key, String(value))
    }

    const query = params.toString()
    return query ? `/products?${query}` : "/products"
}

function buildStocksQuery(filters = {}) {
    const params = new URLSearchParams()

    for (const [key, value] of Object.entries(filters)) {
        if (value === undefined || value === null || value === "") {
            continue
        }
        params.set(key, String(value))
    }

    const query = params.toString()
    return query ? `/stocks?${query}` : "/stocks"
}

async function requestWithAuth(path) {
    let token = await getAccessToken()

    try {
        return await request(path, {
            method: "GET",
            headers: getAuthHeaders(token)
        })
    } catch (error) {
        if (error.statusCode !== 401) {
            throw error
        }

        token = await login()
        return request(path, {
            method: "GET",
            headers: getAuthHeaders(token)
        })
    }
}

async function getProducts(filters = {}) {
    return requestWithAuth(buildProductsQuery(filters))
}

async function getStocks(filters = {}) {
    return requestWithAuth(buildStocksQuery(filters))
}

// Ürün ve stokları birleştirip tek response dönen fonksiyon
async function getProductsWithStock(filters = {}) {
    // Ürünleri ve stokları paralel çek
    const [productsRes, stocksRes] = await Promise.all([
        getProducts(filters),
        getStocks({})
    ])

    // productsRes ve stocksRes'in data property'leri varsa onları kullan
    const products = productsRes.data || productsRes || [];
    const stocks = stocksRes.data || stocksRes || [];

    // Stokları productId'ye göre grupla
    const stockMap = {};
    for (const stock of stocks) {
        const pid = stock.productId || stock.product_id || stock.productID;
        if (!pid) continue;
        if (!stockMap[pid]) stockMap[pid] = [];
        stockMap[pid].push(stock);
    }

    // Her ürüne stok miktarını ekle
    const merged = products.map(product => {
        const pid = product.id || product.productId || product.product_id;
        const productStocks = stockMap[pid] || [];
        // Toplam miktar veya detaylı stoklar
        const totalStock = productStocks.reduce((sum, s) => sum + (s.quantity || s.qty || s.amount || 0), 0);
        return {
            ...product,
            stocks: productStocks,
            totalStock
        };
    });

    return merged;
}

module.exports = {
    getStocks,
    getProducts,
    getProductsWithStock,
    adjustStock,
    login,
    refreshAccessToken
}
