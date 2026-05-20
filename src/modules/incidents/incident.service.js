const pool = require("../../database/db")

const assignmentActions = new Set ([
    "self_assigned",
    "admin_assigned",
    "auto_assigned"
])
function solutionLabel(totalMinutes){
    if(totalMinutes == null){
        return null
    }
    const days = Math.floor(totalMinutes / (24 * 60))
    const hours = Math.floor((totalMinutes % (24 * 60)) / 60)
    const minutes = totalMinutes % 60

    const parts = []
    if(days > 0){
        parts.push(`${days} gün`)
    }
    if(hours > 0){
        parts.push(`${hours} saat`)
    }
    if(minutes > 0 || parts.length === 0){
        parts.push(`${minutes} dakika`)
    }

    return parts.join(" ")
}

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

async function getIncidents(userId, role, sortBy,order) {
    const orderDirection = String(order).toLowerCase()==="asc"?"ASC":"DESC"
    let orderedByClause = `created_at ${orderDirection}`

    if(sortBy === "updated_at"){
        orderedByClause = `updated_at ${orderDirection}`
    }
    if(sortBy === "created_at"){
        orderedByClause = `created_at ${orderDirection}`
    }
    if(sortBy === "priority"){
        orderedByClause = 
        `CASE priority
        WHEN 'high' THEN 3
        WHEN 'medium' THEN 2
        WHEN 'low' THEN 1
        END ${orderDirection}
        `
    }

    if (role === "admin"){
        const query = `
        SELECT * FROM incidents ORDER BY ${orderedByClause}`
        const result = await pool.query(query)

        return result.rows
    }

    if(role === "technician"){
        const query = `
        SELECT * FROM incidents
        WHERE status = 'pending'
        OR assigned_to = $1
        ORDER BY ${orderedByClause}`

        const result = await pool.query(query, [userId])
        return result.rows

    }

    throw new Error("Geçersiz kullanıcı rolü")
    
}

async function getIncidentById(incidentId, userId, role) {

    const query = `
    SELECT incidents. *,hotels.name AS hotel_name, users.full_name AS technician_name 
    FROM incidents
    JOIN hotels ON incidents.hotel_id = hotels.id
    LEFT JOIN users ON incidents.assigned_to = users.id
    WHERE incidents.id = $1`

    const result = await pool.query(query,[incidentId]) 
    const incident = result.rows[0]


    if(!incident){
        return null
    }
    
    const logQuery = `
    SELECT
    il.action,
    il.note,
    il.created_at,
    il.performed_by,
    u.full_name AS performed_by_name
    FROM incident_logs il
    LEFT JOIN users u ON il.performed_by = u.id
    WHERE il.incident_id = $1
    AND il.action IN ('self_assigned','admin_assigned','auto_assigned','status_updated','admin_status_update')
    ORDER BY il.created_at DESC
    `
    const logResult = await pool.query(logQuery,[incidentId])
    const logs = logResult.rows
    const assignmentLogs = logs.filter(log => assignmentActions.has(log.action))
    const lastAssignedLog = assignmentLogs[0] || null
    const transitionLogs = logs.filter(log =>
        (log.action === "status_updated" || log.action === "admin_status_update")
        && typeof log.note === "string"
    )
    const workStartedLog = transitionLogs.find(log => log.note.includes("-> in_progress")) || null

    const resolvedLog = transitionLogs.find(log => log.note.includes("-> resolved")) || null

    const resolutionMinutes = workStartedLog && resolvedLog ? Math.max(0,Math.round((new Date(resolvedLog.created_at) - new Date(workStartedLog.created_at))/60000 )) : null
    
    const incidentDetail = {
        ...incident,
        assignmentHistory: logs,
        createdAt: incident.created_at,
        lastAssignedAt: lastAssignedLog ? lastAssignedLog.created_at : null,
        workStartedAt: workStartedLog ? workStartedLog.created_at : null,
        resolvedAt: resolvedLog ? resolvedLog.created_at : null,
        resolutionMinutes,
        resolutionLabel: solutionLabel(resolutionMinutes)
    }
    if (role === "admin"){
        return incidentDetail
    }

    if(role === "technician"){
        if(incident.status === "pending" || incident.assigned_to === userId){
            return incidentDetail
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
    WHERE id = $2 AND status = 'pending'
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
    if(!updateResult.rows[0]){
        const error = new Error("Bu arıza artık atanamaz")
        error.statusCode = 409
        throw error
    }

    return updateResult.rows[0]

    
}

async function updatedTechnicianStatus(userId,role,incidentId,status,note) {

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

    const trimmedNote = typeof note === "string" ? note.trim() : ""
    const logNote = trimmedNote
        ? `${currentStatus} -> ${status}\n${trimmedNote}`
        : `${currentStatus} -> ${status}`

    try {
        await createIncidentLog({
            incidentId: incidentId,
            action: "status_updated",
            performedBy: userId,
            note: logNote
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
            action: "admin_assigned",
            performedBy: userId,
            note: `from:${incidentResult.assigned_to || "none"} to:${technicianId}`
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
    
    
    const statusUpdateQuery = status === 'pending'
        ? `UPDATE incidents SET status = $1, assigned_to = NULL, updated_at = NOW() WHERE id = $2 RETURNING *`
        : `UPDATE incidents SET status = $1, updated_at = NOW() WHERE id = $2 RETURNING *`

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



async function getActiveIncidents(userId,userRole,page,limit) {

    const offset = (page - 1) * limit

    let total;
    if (userRole === "admin") {
        const countResult = await pool.query(`
            SELECT COUNT(*) FROM incidents
            WHERE status IN ('pending','assigned','in_progress')
        `)
        total = parseInt(countResult.rows[0].count, 10)
    } else {
        const countResult = await pool.query(`
            SELECT COUNT(*) FROM incidents
            WHERE status = 'pending'
            OR (assigned_to = $1 AND status IN ('assigned','in_progress'))
        `, [userId])
        total = parseInt(countResult.rows[0].count, 10)
    }
    const totalPages = Math.ceil(total / limit)

    const adminQuery = `
    SELECT incidents. *, hotels.name AS hotel_name , users.full_name AS technician_name
    FROM incidents
    JOIN hotels ON incidents.hotel_id = hotels.id
    LEFT JOIN users ON incidents.assigned_to = users.id
    WHERE incidents.status IN ('pending','assigned','in_progress') 
    ORDER BY incidents.created_at DESC
    LIMIT $1 OFFSET $2`

    if(userRole === "admin"){
        const dataResult = await pool.query(adminQuery,[limit,offset]) 

        return{
            data : dataResult.rows,
            total,
            page,
            totalPages
        }
    }

    const techQuery = `
    SELECT incidents. *, hotels.name AS hotel_name , users.full_name AS technician_name
    FROM incidents
    JOIN hotels ON incidents.hotel_id = hotels.id
    LEFT JOIN users ON incidents.assigned_to = users.id
    WHERE incidents.status = 'pending'
    OR (assigned_to = $1 AND status IN('assigned','in_progress'))
    ORDER BY incidents.created_at DESC
    LIMIT $2 OFFSET $3`

    if(userRole === "technician"){
        const dataResult = await pool.query(techQuery,[userId,limit,offset])
        return {
            data : dataResult.rows,
            total,
            page,
            totalPages
        }
    }

    throw new Error("Geçersiz kullanıcı rolü")
}

async function getIncidentHistory(userId,userRole,page,limit) {

    const offset = (page-1)*limit

    let total;
    if (userRole === "admin") {
        const countResult = await pool.query(`
            SELECT COUNT(*) FROM incidents
            WHERE status = 'resolved'
        `)
        total = parseInt(countResult.rows[0].count, 10)
    } else {
        const countResult = await pool.query(`
            SELECT COUNT(*) FROM incidents
            WHERE status = 'resolved'
            AND assigned_to = $1
        `, [userId])
        total = parseInt(countResult.rows[0].count, 10)
    }
    const totalPages = Math.ceil(total / limit)

    if(userRole === "admin"){
        const adminQuery =`
        SELECT incidents. *, hotels.name AS hotel_name, users.full_name AS technician_name
        FROM incidents
        JOIN hotels ON incidents.hotel_id = hotels.id
        LEFT JOIN users ON incidents.assigned_to = users.id
        WHERE incidents.status = 'resolved'
        ORDER BY incidents.created_at DESC
        LIMIT $1 OFFSET $2`

        const dataResult = await pool.query(adminQuery,[limit,offset])
        return {
            data: dataResult.rows,
            total,
            page,
            totalPages
        }
    }

    if(userRole === "technician"){

        const techQuery = `
        SELECT incidents. *, hotels.name AS hotel_name, users.full_name AS technician_name
        FROM incidents
        JOIN hotels ON incidents.hotel_id = hotels.id
        JOIN users ON incidents.assigned_to = users.id
        WHERE incidents.status = 'resolved'
        AND assigned_to = $1
        ORDER BY incidents.created_at DESC
        LIMIT $2 OFFSET $3`

        const dataResult = await pool.query(techQuery,[userId,limit,offset])
        return {
            data: dataResult.rows,
            total,
            page,
            totalPages
        }
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

async function getActiveIncidentsByHotel(hotelId) {
    const incidentQuery= `
    SELECT * FROM incidents
    WHERE hotel_id = $1 AND status IN ('pending', 'assigned','in_progress')
    ORDER BY created_at DESC
    `
    const result = await pool.query(incidentQuery,[hotelId])
    return result.rows
}

module.exports = { createIncident, getIncidents, getIncidentById, assignIncidentToSelf,updatedTechnicianStatus,reassignIncident,adminStatus,createIncidentLog,getActiveIncidents,getIncidentHistory,getIncidentsByHotel,getActiveIncidentsByHotel}