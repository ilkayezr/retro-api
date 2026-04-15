const { AGENT_CONFIG, SYSTEM_PROMPT, ParseIncidentSchema } = require("./agentConfig")
const { executeTool } = require("./agentTools")
const { memoryManager } = require("./agentMemory")

async function parseMessage(text, hotelId, phoneNumber = "unknown") {
    try {
        console.log(`[AGENT] Processing message for hotel: ${hotelId}, phone: ${phoneNumber}`)
        const session = memoryManager.getOrCreateSession(hotelId, phoneNumber)
        console.log(`[AGENT] Logging raw message...`)
        const logResult = await executeTool("log_message", {
            message: text,
            hotelId
        })
        
        if (!logResult.success) {
            console.error(`[AGENT] log_message failed:`, logResult.error)
            throw new Error("Message logging failed")
        }

        memoryManager.addMessage(hotelId, phoneNumber, "user", text, {
            type: "incoming_whatsapp"
        })

        console.log(`[AGENT] Parsing incident...`)
        const parseResult = await executeTool("parse_incident", {
            message: text
        })
        
        if (!parseResult.success) {
            console.error(`[AGENT] parse_incident failed:`, parseResult.error)
            const errorMsg = `Mesaj parse edilemedi: ${JSON.stringify(parseResult.error)}`
            memoryManager.addMessage(hotelId, phoneNumber, "assistant", errorMsg, {
                type: "error",
                error: parseResult.error
            })
            throw new Error("Incident parsing failed")
        }

        const parsedData = parseResult.data
        console.log(`[AGENT] Parsed incident:`, parsedData)

        if (parsedData.title.length < 10 && parsedData.description.length > 50) {
            parsedData.title = parsedData.description.substring(0, 50)
        }

        console.log(`[AGENT] Creating incident in database...`)
        const createResult = await executeTool("create_incident", {
            title: parsedData.title,
            description: parsedData.description,
            priority: parsedData.priority,
            category: parsedData.category,
            hotelId
        })

        if (!createResult.success) {
            console.error(`[AGENT] create_incident failed:`, createResult.error)
            throw new Error("Incident creation failed")
        }

        const incident = createResult.data

        memoryManager.updateContext(hotelId, phoneNumber, {
            lastParsedIncident: parsedData,
            lastCreatedIncidentId: incident.id,
            pendingIncidentCount: (session.context.pendingIncidentCount || 0) + 1
        })

        const responseMsg = `Arıza kaydedildi: ${incident.title}. Hizmet verenler kısa süre içinde ulaşacak.`
        memoryManager.addMessage(hotelId, phoneNumber, "assistant", responseMsg, {
            type: "success",
            incidentId: incident.id
        })

        console.log(`[AGENT] Successfully created incident #${incident.id}`)

        return {
            success: true,
            incident,
            parsed: parsedData,
            message: responseMsg,
            session: {
                hotelId,
                phoneNumber,
                messagesProcessed: session.context.totalMessagesProcessed
            }
        }

    } catch (error) {
        console.error(`[AGENT ERROR] parseMessage:`, error)
        return {
            success: false,
            error: error.message,
            hotelId,
            phoneNumber
        }
    }
}

function getSessionMemory(hotelId, phoneNumber) {
    const session = memoryManager.getSession(hotelId, phoneNumber)
    if (!session) {
        return { error: "Session not found" }
    }
    
    return {
        context: session.context,
        messagesCount: session.messages.length,
        lastMessages: session.messages.slice(-5),
        createdAt: new Date(session.createdAt),
        lastActive: new Date(session.lastActive)
    }
}

function clearSessionMemory(hotelId, phoneNumber) {
    memoryManager.clearSession(hotelId, phoneNumber)
    return { message: "Session cleared" }
}

function getMemoryStats() {
    return memoryManager.getStats()
}

module.exports = {parseMessage,getSessionMemory,clearSessionMemory,getMemoryStats}
