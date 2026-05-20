
const {z} = require("zod")

const createIncidentSchema = z.object({

    title: z.string().trim().min(3,"Başlık en az 3 karakter olmalı"),
    description: z.string().trim().min(5),
    priority: z.enum(["low","medium","high"]),
    hotelId: z.number().int().positive(),
    category: z.enum(["network","hardware","software","other"]).default("other")
})

const updatedTechnicianStatusSchema = z.object({
    status: z.enum(["in_progress","resolved"]),
    note: z.string().trim().min(1).optional()
})

const reassignschema = z.object({
   technicianId: z.number().int().positive()
})

const adminStatusSchema = z.object({
    status: z.enum(["pending","assigned","in_progress","resolved"])
})

module.exports = {createIncidentSchema,updatedTechnicianStatusSchema,reassignschema,adminStatusSchema}