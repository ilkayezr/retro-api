const {z} = require('zod');

const whatsappMessageSchema = z.object({
    phoneNumber: z.string().trim().min(10),
    message: z.string().trim().min(1),
})

module.exports = {whatsappMessageSchema}