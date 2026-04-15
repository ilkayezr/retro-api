
const pool = require("../../database/db")
const {parseMessage} = require("./aiService")

async function processIncomingMessage(from, text, hotelId,phoneNumber) {
    try {
        const logQuery = `
        INSERT INTO incoming_messages (hotel_id,raw_message, created_at)
        VALUES ($1, $2, NOW())
        RETURNING * `

        const logResult = await pool.query(logQuery,[hotelId,text])
        const incident = await parseMessage(text, hotelId,phoneNumber)

        return {rawMessage: logResult.rows[0], incident}
    } catch (error) {
        console.error("Whatsapp processing error:", error)
        throw error
    }
}

async function getIncomingMessages() {
    const query = `
        SELECT 
            im.id,
            im.raw_message,
            im.created_at,
            h.id as hotel_id,
            h.name as hotel_name
        FROM incoming_messages im
        JOIN hotels h ON im.hotel_id = h.id
        ORDER BY im.created_at DESC
    `;

    const result = await pool.query(query);
    return result.rows;
}

module.exports = {processIncomingMessage,getIncomingMessages}
