const {Agent, MemorySession, run} = require('@openai/agents')
const {buildSupportInstructions} = require('./ai-instructions')
const {createTools} = require('./ai-tools')

function createSupportAgentRuntime(incidentService) {
    const sessionByHotel = new Map()
    const tools = createTools(incidentService)
    const agent = new Agent({
        name: "SupportAgent",
        model: "gpt-4o",
        tools: [tools.createIncidentTool, tools.getActiveIncidentsTool],
        instructions: buildSupportInstructions,

    })
    async function getOrCreateSession(hotelId) {
        if(sessionByHotel.has(hotelId)){
          return sessionByHotel.get(hotelId)  
        }

        const session = new MemorySession()
        sessionByHotel.set(hotelId,session)
        return session
    }

    async function handleIncomingMessage({hotel,message}){ 
        const session = await getOrCreateSession(hotel.id)
        const result = await run (agent, message, {context:{hotel}, session})
        const sonuc = result.finalOutput

        return sonuc
    }
    return {handleIncomingMessage}
    
}

module.exports = {createSupportAgentRuntime}