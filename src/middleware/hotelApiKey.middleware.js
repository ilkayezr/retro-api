const pool = require('../database/db');
async function hotelApiKey(req,res,next) {
    try { 
        const apiKey = req.headers['x-api-key']
        if(!apiKey){
            return res.status(401).json({message:"header bulunamadı"})
        }

        const hotelQuery = `
        SELECT * FROM hotels
        WHERE api_key = $1
        `
        const result = await pool.query(hotelQuery,[apiKey])
        const hotel = result.rows[0]

        if(!hotel){
            return res.status(401).json({message: "Geçersiz API key"})
        }
        if(!hotel.is_active){
            return res.status(403).json({message:"Otel aktif değil"})
        }
        req.hotel = hotel
        next()

    } catch (error) {
        return res.status(500).json({message: "Server error"})
    }

}
module.exports=hotelApiKey 