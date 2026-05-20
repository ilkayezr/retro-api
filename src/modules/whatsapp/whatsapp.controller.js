const pool = require('../../database/db')
const incidentService = require('../incidents/incident.service')
const{createSupportAgentRuntime} = require('../ai/ai-runtime')
const supportAgentRuntime =createSupportAgentRuntime(incidentService)

async function handleIncomingWhatsappMessage(req,res) {
    
    try {
        const phoneNumber = req.body.phoneNumber
        const reply = await supportAgentRuntime.handleIncomingMessage({hotel: req.hotel,phoneNumber, message: req.body.message})
        return res.status(200).json(reply)
        
    } catch (error) {
        console.error("ERROR:",error)
        return res.status(500).json({message:"mesaj işlenirken hata oluştu"})
    }
}

function verifyWhatsappWebhook(req,res){
    try {

        const mode = req.query['hub.mode']
        const token = req.query['hub.verify_token']
        const challenge = req.query['hub.challenge']
        const expectedToken = process.env.WHATSAPP_VERIFY_TOKEN

        if (mode === 'subscribe' && token === expectedToken) {
            return res.status(200).send(challenge) 
        }
        return res.status(403).json({message:"webhook doğrulama başarısız"})
        
    } catch (error) {
        return res.status(500).json({message:"webhook verify error"})
    }
}

async function sendWhatsappTextMessage(to,text){
    const accessToken = process.env.WHATSAPP_ACCESS_TOKEN
    const phoneNumberId = process.env.WHATSAPP_PHONE_NUMBER_ID

    if(!accessToken || !phoneNumberId){
        console.warn("WhatsApp access token or phone number ID not configured")
        return 
    }
    const url = "https://graph.facebook.com/v22.0/" + phoneNumberId + "/messages"

    const response = await fetch(url,{
        method: "POST",
        headers: {
            Authorization: "Bearer " + accessToken,
            "Content-Type": "application/json"
        },
        body: JSON.stringify({
            messaging_product: "whatsapp",
            to,
            type:"text",
            text: {body:text}
        })
    })
    if(!response.ok){
        const errorBody = await response.text().catch(() => "")
        console.error("WhatsApp API error:", response.status, errorBody)
        throw new Error("Whatsapp mesaj gönderimi başarısız: " + response.status)
    }
}

async function handleWhatsappWebhookEvent(req,res){


    try {
        const entry = req.body?.entry?.[0]
        const change = entry?.changes?.[0]
        const value = change?.value
        const messageObj = value?.messages?.[0]

        if(!messageObj){
            return res.status(200).json({message:"no message event"})
        }
        if(messageObj.type !== "text"){
            return res.status(200).json({message:"unsupported message type"})
        }

        const phoneNumber = messageObj.from
        const messageText = messageObj.text?.body
        

        if(!phoneNumber || !messageText ){
            return res.status(200).json({message:"insufficient message data"})
        }
        
        const query =`SELECT * FROM hotels WHERE phone_number = $1`
        const result = await pool.query(query,[phoneNumber])
        const hotel = result.rows[0]
        if(!hotel){
            return res.status(200).json({message:"hotel not found"})
        }
    
        const reply = await supportAgentRuntime.handleIncomingMessage({
            hotel,
            phoneNumber,
            message: messageText   
        })
        if (typeof reply === "string" && reply.trim()){
            await sendWhatsappTextMessage(phoneNumber,reply)
        }
    
        return res.status(200).json({message:"event processed"})
    } catch (error) {
        console.error("ERROR:",error)
        return res.status(500).json({message:"webhook event error"})
    }
}

module.exports = {handleIncomingWhatsappMessage,verifyWhatsappWebhook, handleWhatsappWebhookEvent}