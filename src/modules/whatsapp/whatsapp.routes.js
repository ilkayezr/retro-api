const express = require('express');
const router = express.Router(); 
const hotelApiKey = require('../../middleware/hotelApiKey.middleware');
const {validate} = require('../../middleware/validate');
const {whatsappMessageSchema} = require('./whatsapp.schema');
const {handleIncomingWhatsappMessage} = require('./whatsapp.controller')
router.post("/message",hotelApiKey,validate(whatsappMessageSchema),handleIncomingWhatsappMessage)

module.exports= router 