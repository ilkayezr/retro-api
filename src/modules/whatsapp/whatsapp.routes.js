const express = require('express');
const router = express.Router(); 
const hotelApiKey = require('../../middleware/hotelApiKey.middleware');
const {validate} = require('../../middleware/validate');
const {whatsappMessageSchema} = require('./whatsapp.schema');
const {handleIncomingWhatsappMessage,verifyWhatsappWebhook,handleWhatsappWebhookEvent} = require('./whatsapp.controller')
router.get("/webhook",verifyWhatsappWebhook)
router.post("/message",hotelApiKey,validate(whatsappMessageSchema),handleIncomingWhatsappMessage)
router.post("/webhook",handleWhatsappWebhookEvent)


module.exports= router   