const whatsappService = require("./whatsapp.service")
const {parseMessage} = require("./aiService")

async function receiveWhatsAppMessage(req,res) {
    try {
        const entry = req.body.entry[0]
        const message = entry.changes[0].value.messages[0]
        const from = message.from
        const text = message.text.body
        const hotelId = req.hotelId

        await whatsappService.processIncomingMessage(from, text, hotelId,from)

        return res.status((200)).json({
            message: "Message received"
        })
    } catch (error) {
        return res.status(500).json({
            message: "Webhook error"
        })
    }
}

async function handleIncomingMessage(req, res) {
    try {
        const { hotelId, phoneNumber } = req 
        const text = req.body.text
        
        const incident = await parseMessage(text, hotelId, phoneNumber)
        
        res.status(201).json({
            message: incident.message,
            incident: incident.incident
        })
    } catch (error) {
        res.status(500).json({ message: "Error" })
    }
}
module.exports = { receiveWhatsAppMessage, handleIncomingMessage }