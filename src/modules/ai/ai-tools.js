const {tool} = require('@openai/agents')
const {z} = require('zod')

function createTools(incidentService){
    const createIncidentToolParameters = z.object({
    title: z.string().trim().min(3),
    description: z.string().trim().min(5),
    category: z.enum(['hardware','software','network','other']),
    priority: z.enum(['low','medium','high'])
})

const createIncidentTool = tool({
    name: "create_incident_from_whatsapp",
    description: "Creates incident from WhatsApp messages",
    parameters: createIncidentToolParameters,
    execute: (input,runContext) => {
        const hotelId= runContext.context.hotel.id;
        const incident = incidentService.createIncident({
            hotelId,
            title: input.title,
            description: input.description,
            category: input.category,
            priority: input.priority
        })
        return incident
    }
})

const getActiveIncidentsToolParameters = z.object({}) 

const getActiveIncidentsTool = tool({
    name: "get_active_incidents_by_hotel",
    description: "Gets active incidents by hotel",
    parameters: getActiveIncidentsToolParameters,
    execute: (_input,runContext) => {
        const hotelId = runContext.context.hotel.id;

        return incidentService.getActiveIncidentsByHotel(hotelId)
    }
})
    return {createIncidentTool,getActiveIncidentsTool}
}
 
module.exports = {createTools}
