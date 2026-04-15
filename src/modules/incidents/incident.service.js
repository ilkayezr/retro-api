const pool = require("../../database/db")

async function createIncident(data) {
    const query = `
    INSERT INTO incidents (title, description, priority, hotel_id, category)
    VALUES ($1,$2,$3,$4,$5)
    RETURNING * 
    `
    const values = [
        data.title,
        data.description,
        data.priority,
        data.hotelId,
        data.category
    ]

    const result = await pool.query(query, values)

    return result.rows[0]
}

async function getIncidents(userId, role) {

    if (role === "admin"){
        const query = `
        SELECT * FROM incidents ORDER BY created_at DESC`
        const result = await pool.query(query)

        return result.rows
    }

    if(role === "technician"){
        const query = `
        SELECT * FROM incidents
        WHERE status = 'pending'
        OR assigned_to = $1
        ORDER BY created_at DESC`

        const result = await pool.query(query, [userId])
        return result.rows

    }

    throw new Error("Geçersiz kullanıcı rolü")
    
}

async function getIncidentById(incidentId, userId, role) {

    const query = `
    SELECT * FROM incidents
    WHERE id = $1`

    const result = await pool.query(query,[incidentId])
    const incident = result.rows[0]

    if(!incident){
        return null
    }
    
    if (role === "admin"){
        return incident
    }

    if(role === "technician"){
        if(incident.status === "pending" || incident.assigned_to === userId){
            return incident
        }

        return null
       
    } 
    throw new Error("Geçersiz kullanıcı rolü")
    
}

async function assignIncidentToSelf(incidentId,userId,role) {

    if(role !== "technician"){
        const error = new Error("Sadece teknisyen kendine atama yapabilir")
        error.statusCode = 403
        throw error
    }

    const query = `
    SELECT * FROM incidents
    WHERE id = $1`

    const result = await pool.query(query,[incidentId])
    const incident = result.rows[0]

    if(!incident){
        const error = new Error("Arıza kaydı bulunamadı")
        error.statusCode = 404
        throw error
    }

    if(incident.status !== "pending"){
        const error = new Error("Bu arızaya atama yapılamaz")
        error.statusCode = 400
        throw error
    }

    const updateQuery = `
    UPDATE incidents 
    SET assigned_to = $1,
        status = 'assigned',
        updated_at = NOW()
    WHERE id = $2
    RETURNING *

    `

    const updateResult = await pool.query(updateQuery,[userId, incidentId])

    try {
        await createIncidentLog({
        incidentId: incidentId,
        action: "self_assigned",
        performedBy: userId,
        note: "pending -> assigned"
    })
    } catch (e) {
        console.error("incident log error:",e)
    }

    return updateResult.rows[0]

    
}

async function updatedTechnicianStatus(userId,role,incidentId,status) {

    if(role !== "technician"){
        const error = new Error("Bu işlemi sadece teknisyen yapabilir")
        error.statusCode = 403
        throw error
    }

    const query =`
    SELECT * FROM incidents
    WHERE id = $1`

    const incident = await pool.query(query,[incidentId])
    const incidentResult = incident.rows[0]



    if(!incidentResult){
        const error = new Error("Arıza kaydı bulunamadı")
        error.statusCode = 404
        throw error
    }

    if(incidentResult.assigned_to !== userId){
        const error = new Error("Sadece arızaya atanmış teknisyen güncelleme yapabilir!")
        error.statusCode = 403
        throw error
    }

    const currentStatus = incidentResult.status
    const allowedTransitions = {
        assigned: ["in_progress"],
        in_progress: ["resolved"]
    }
    
    const allowedNextStatus = allowedTransitions[currentStatus]
    if(!allowedNextStatus || !allowedNextStatus.includes(status)){
        const error = new Error("Hatalı durum güncellemesi")
        error.statusCode = 409
        throw error
    }

    const statusQuery = `
    UPDATE incidents
    SET status = $1,
    updated_at = NOW()
    WHERE id = $2
    RETURNING * `

    const result = await pool.query(statusQuery,[status,incidentId])

    try {
        await createIncidentLog({
            incidentId: incidentId,
            action: "status_updated",
            performedBy: userId,
            note: `${currentStatus} -> ${status}`
        })
    } catch (e) {
        console.error("incident log error:",e)
    }

    return result.rows[0]
    
}

async function reassignIncident(userId,role,incidentId,technicianId) {

    if(role !== "admin"){
        const error = new Error("Bu işlemi sadece admin yapabilir")
        error.statusCode = 403
        throw error
    }
    
    const query = `
    SELECT * FROM incidents
    WHERE id = $1
    `
    const incident = await pool.query(query,[incidentId])
    const incidentResult = incident.rows[0]

    if(!incidentResult){
        const error = new Error("Arıza kaydı bulunamadı")
        error.statusCode = 404
        throw error
    }

    const technicianQuery = `
    SELECT * FROM users
    WHERE id = $1`

    const technicianResult = await pool.query(technicianQuery,[technicianId])
    const technician = technicianResult.rows[0]

    if(!technician){
        const error = new Error("Teknisyen bulunamadı")
        error.statusCode = 404
        throw error
    }

    if(technician.role !== "technician"){
        const error = new Error("Atanacak kullanıcı teknisyen olmalı")
        error.statusCode = 400
        throw error
    }

    const assignQuery = `
    UPDATE incidents
    SET assigned_to = $1,
    status = 'assigned',
    updated_at = NOW()
    WHERE id = $2
    RETURNING *`

    const result = await pool.query(assignQuery,[technicianId,incidentId])

    try {
        await createIncidentLog({
            incidentId: incidentId,
            action: "reassigned",
            performedBy: userId,
            note: `${incidentResult.assigned_to} -> ${technicianId}`
        })
    } catch (error) {
        console.error("incident log error:",error)
    }

    return result.rows[0]

}

async function adminStatus(userId,userRole,incidentId,status) {

    if(userRole !== "admin"){
        const error = new Error("Bu işlemi sadece admin yapabilir")
        error.statusCode = 403
        throw error
    }

    const query = `
    SELECT * FROM incidents
    WHERE id = $1
    `
    const incident = await pool.query(query,[incidentId])
    const result = incident.rows[0]

    if(!result){
        const error = new Error("Arıza kaydı bulunamadı")
        error.statusCode = 404
        throw error
    }
    
    const statusUpdateQuery = `
    UPDATE incidents
    SET status = $1,
    updated_at = NOW()
    WHERE id = $2
    RETURNING * `

    const queryResult = await pool.query(statusUpdateQuery,[status,incidentId])

    try {
        await createIncidentLog({
            incidentId: incidentId,
            action: "admin_status_update",
            performedBy: userId,
            note: `${result.status} -> ${status}`
        })
    } catch (error) {
        console.error("incident log error:", error)
    }

    return queryResult.rows[0]
    
}

async function createIncidentLog(data) {

    if(!data.incidentId || !data.action || !data.performedBy){
        return null 
    }

    const logQuery = `
    INSERT INTO incident_logs(incident_id,action,performed_by,note)
    VALUES($1,$2,$3,$4)
    RETURNING *
    `
    const values = [
        data.incidentId,
        data.action,
        data.performedBy,
        data.note || null
    ]

    const result = await pool.query(logQuery,values)
    return result.rows[0]
    
}



async function getActiveIncidents(userId,userRole) {

    const adminQuery = `
    SELECT * FROM incidents
    WHERE status IN ('pending','assigned','in_progress')
    ORDER BY created_at DESC`

    if(userRole === "admin"){
        const result = await pool.query(adminQuery)
        return result.rows
    }

    const techQuery = `
    SELECT * FROM incidents
    WHERE status = 'pending'
    OR (assigned_to = $1 AND status IN('assigned','in_progress'))
    ORDER BY created_at DESC`

    if(userRole === "technician"){
        const result = await pool.query(techQuery,[userId])
        return result.rows
    }

    throw new Error("Geçersiz kullanıcı rolü")
}

async function getIncidentHistory(userId,userRole) {
    
    if(userRole === "admin"){
        const adminQuery =`
        SELECT * FROM incidents
        WHERE status = 'resolved'
        ORDER BY created_at DESC`

        const result = await pool.query(adminQuery)
        return result.rows
    }

    if(userRole === "technician"){

        const techQuery = `
        SELECT * FROM incidents
        WHERE status = 'resolved'
        AND assigned_to = $1
        ORDER BY created_at DESC`

        const result = await pool.query(techQuery,[userId])
        return result.rows
    }

    throw new Error("Bu işlem için yetkiniz yok")
}

async function getIncidentsByHotel(userId,userRole,hotelId) {
    
    if(userRole === "admin"){

        const adminQuery= `
        SELECT * FROM incidents
        WHERE hotel_id = $1
        ORDER BY created_at DESC`

        const result = await pool.query(adminQuery,[hotelId])
        return result.rows
    }

    if(userRole === "technician"){

        const techQuery = `
        SELECT * FROM incidents
        WHERE hotel_id = $1 AND assigned_to = $2
        ORDER BY created_at DESC`

        const result = await pool.query(techQuery,[hotelId,userId])
        return result.rows
    }

    throw new Error("Listeleme sırasında hata oluştu")
}

module.exports = { createIncident, getIncidents, getIncidentById, assignIncidentToSelf,updatedTechnicianStatus,reassignIncident,adminStatus,createIncidentLog,getActiveIncidents,getIncidentHistory,getIncidentsByHotel}