const incidentService = require('../incidents/incident.service')
const{createSupportAgentRuntime} = require('../ai/ai-runtime')
const supportAgentRuntime =createSupportAgentRuntime(incidentService)

async function handleIncomingWhatsappMessage(req,res) {
    try {
        const reply = await supportAgentRuntime.handleIncomingMessage({hotel: req.hotel, message: req.body.message})
        return res.status(200).json(reply)
        
    } catch (error) {
        console.error("ERROR:",error)
        return res.status(500).json({message:"mesaj işlenirken hata oluştu"})
    }
}

module.exports = {handleIncomingWhatsappMessage}