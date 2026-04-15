const pool = require("../../database/db")
const { ParseIncidentSchema, CreateIncidentSchema, INCIDENT_TYPES } = require("./agentConfig")

async function parse_incident(message) {
    try {
        let detectedCategory = null
        
        for (const [category, data] of Object.entries(INCIDENT_TYPES)) {
            for (const type of data.types) {
                if (message.toLowerCase().includes(type.toLowerCase())) {
                    detectedCategory = category
                    break
                }
            }
            if (detectedCategory) break
        }

        const category = detectedCategory || "other"
        const priority = INCIDENT_TYPES[category].defaultPriority

        const title = message.substring(0, 50).trim()
        const description = message

        const result = ParseIncidentSchema.safeParse({
            title,
            description,
            priority,
            category
        })

        if (!result.success) {
            return { success: false, error: result.error.flatten() }
        }

        return { success: true, data: result.data }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function create_incident(data) {
    try {

        const validated = CreateIncidentSchema.safeParse(data)
        if (!validated.success) {
            return { success: false, error: validated.error.flatten() }
        }

        const query = `
            INSERT INTO incidents (title, description, priority, category, hotel_id, status)
            VALUES ($1, $2, $3, $4, $5, 'pending')
            RETURNING *
        `

        const values = [
            validated.data.title,
            validated.data.description,
            validated.data.priority,
            validated.data.category,
            validated.data.hotelId
        ]

        const result = await pool.query(query, values)
        
        return {
            success: true,
            data: result.rows[0],
            message: `Arıza kaydedildi: ${result.rows[0].title}`
        }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function log_message(message, hotelId) {
    try {
        const query = `
            INSERT INTO incoming_messages (hotel_id, raw_message, created_at)
            VALUES ($1, $2, NOW())
            RETURNING *
        `

        const result = await pool.query(query, [hotelId, message])

        return {
            success: true,
            data: result.rows[0]
        }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function query_incidents(hotelId, limit = 10) {
    try {
        const query = `
            SELECT * FROM incidents
            WHERE hotel_id = $1 AND status = 'pending'
            ORDER BY created_at DESC
            LIMIT $2
        `

        const result = await pool.query(query, [hotelId, limit])

        return {
            success: true,
            count: result.rows.length,
            data: result.rows
        }
    } catch (error) {
        return { success: false, error: error.message }
    }
}

async function executeTool(toolName, toolInput) {
    console.log(`[TOOL] Executing: ${toolName} with:`, toolInput)

    try {
        let result
        switch (toolName) {
            case "parse_incident":
                result = await parse_incident(toolInput.message)
                break
            case "create_incident":
                result = await create_incident(toolInput)
                break
            case "log_message":
                result = await log_message(toolInput.message, toolInput.hotelId)
                break
            case "query_incidents":
                result = await query_incidents(toolInput.hotelId, toolInput.limit)
                break
            default:
                result = { success: false, error: `Unknown tool: ${toolName}` }
        }

        console.log(`[TOOL] Result:`, result)
        return result
    } catch (error) {
        console.error(`[TOOL ERROR] ${toolName}:`, error)
        return { success: false, error: error.message }
    }
}

module.exports = {
    parse_incident,
    create_incident,
    log_message,
    query_incidents,
    executeTool
}