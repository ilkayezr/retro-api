class SessionMemory {
    constructor() {
        this.sessions = new Map()  
        this.maxSessionAge = 24 * 60 * 60 * 1000 
        this.cleanupInterval = 60 * 60 * 1000
        this.startCleanupTimer()
    }

    getSessionKey(hotelId, phoneNumber) {
        return `${hotelId}:${phoneNumber}`
    }

    getOrCreateSession(hotelId, phoneNumber) {
        const key = this.getSessionKey(hotelId, phoneNumber)
        
        if (this.sessions.has(key)) {
            const session = this.sessions.get(key)
            session.lastActive = Date.now()
            return session
        }

        const newSession = {
            hotelId,
            phoneNumber,
            messages: [],
            context: {
                lastParsedIncident: null,
                lastCreatedIncidentId: null,
                pendingIncidentCount: 0,
                totalMessagesProcessed: 0
            },
            createdAt: Date.now(),
            lastActive: Date.now()
        }

        this.sessions.set(key, newSession)
        console.log(`[MEMORY] Yeni session oluşturuldu: ${key}`)
        
        return newSession
    }

    addMessage(hotelId, phoneNumber, role, message, metadata = {}) {
        const session = this.getOrCreateSession(hotelId, phoneNumber)
        
        session.messages.push({
            role,
            message,
            timestamp: Date.now(),
            ...metadata
        })

        if (session.messages.length > 50) {
            session.messages = session.messages.slice(-50)
        }

        session.context.totalMessagesProcessed++
    }

    updateContext(hotelId, phoneNumber, contextData) {
        const session = this.getOrCreateSession(hotelId, phoneNumber)
        session.context = { ...session.context, ...contextData }
    }

    getSession(hotelId, phoneNumber) {
        return this.sessions.get(this.getSessionKey(hotelId, phoneNumber))
    }

    getConversationContext(hotelId, phoneNumber) {
        const session = this.getSession(hotelId, phoneNumber)
        if (!session) return []

        return session.messages.slice(-10).map(msg => ({
            role: msg.role,
            content: msg.message
        }))
    }

    clearSession(hotelId, phoneNumber) {
        const key = this.getSessionKey(hotelId, phoneNumber)
        this.sessions.delete(key)
        console.log(`[MEMORY] Session silindi: ${key}`)
    }

    clearAll() {
        this.sessions.clear()
    }

    startCleanupTimer() {
        setInterval(() => {
            const now = Date.now()
            let cleaned = 0

            for (const [key, session] of this.sessions.entries()) {
                if (now - session.lastActive > this.maxSessionAge) {
                    this.sessions.delete(key)
                    cleaned++
                }
            }

            if (cleaned > 0) {
                console.log(`[MEMORY] ${cleaned} eski session temizlendi`)
            }
        }, this.cleanupInterval)
    }

    getStats() {
        const stats = {
            totalSessions: this.sessions.size,
            sessions: []
        }

        for (const [key, session] of this.sessions.entries()) {
            stats.sessions.push({
                key,
                messagesCount: session.messages.length,
                hotelId: session.hotelId,
                phoneNumber: session.phoneNumber,
                context: session.context,
                createdAt: new Date(session.createdAt),
                lastActive: new Date(session.lastActive)
            })
        }

        return stats
    }
}

const memoryManager = new SessionMemory()

module.exports = {SessionMemory,memoryManager}