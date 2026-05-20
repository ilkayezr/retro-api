const {createIncidentSchema, updatedTechnicianStatusSchema, reassignschema, adminStatusSchema} = require("./incident.schema")
const incidentService = require("./incident.service")

async function createIncident(req,res){
    const result = createIncidentSchema.safeParse(req.body)

    if(!result.success){
        return res.status(400).json({
            message: "Validation Error",
            errors: result.error.issues
        })
    }
    try{
        const incident = await incidentService.createIncident(result.data)
        return res.status(201).json(incident)

    }catch (error){
        return res.status(500).json({
            message: "Arıza kaydı oluşturulurken bir hata oluştu"
        })
    }
}

async function getIncidents(req,res) {

    const userId = req.user.id
    const role = req.user.role
    const sortBy = req.query.sortBy || "created_at"
    const order = req.query.order || "desc"

    
    try {

        const incidents = await incidentService.getIncidents(userId, role, sortBy,order)
        return res.status(200).json(incidents)
        
    } catch (error) {
        
        return res.status(500).json({
            message: "Arıza kayıtları getirilirken bir hata oluştu"
        })
    }
}

async function getIncidentById(req,res) {

    const incidentId = req.params.id
    const userId = req.user.id
    const role = req.user.role

    try{
        const incident = await incidentService.getIncidentById(incidentId, userId,  role)

        if(!incident){
            return res.status(404).json({
                message: "Arıza kaydı bulunamadı"
            })
        }
        return res.status(200).json(incident)

    } catch (error){
        return res.status(500).json({
            message:" Arıza detayı getirilirken hata oluştu"
        })
    }
    
}

async function assignIncidentToSelf(req,res) {

    const incidentId = req.params.id
    const userId = req.user.id
    const role = req.user.role

    try{
        const incident = await incidentService.assignIncidentToSelf(incidentId, userId, role)

        return res.status(200).json(incident)

    }catch(error){
        return res.status(error.statusCode || 500).json({
            message: error.message || "Atama sırasında bir hata oluştu"
        })
    }
    
}

async function updatedTechnicianStatus(req,res) {
    const result = updatedTechnicianStatusSchema.safeParse(req.body)

    if(!result.success){
        return res.status(400).json({
            message:"Validation Error",
            errors: result.error.issues
        })
    }

    const userId = req.user.id
    const role = req.user.role
    const incidentId = Number(req.params.id)
    const {status, note} = result.data

    try {
        const updatedIncident = await incidentService.updatedTechnicianStatus(userId,role,incidentId,status,note)

        return res.status(200).json(updatedIncident)
        
    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || "İşlem sırasında bir hata oluştu"
        })
    }
}

async function reassignIncident(req,res) {

    const result = reassignschema.safeParse(req.body)

    if(!result.success){
        return res.status(400).json({
            message: "Validation Error",
            errors: result.error.issues
        })
    }
    const userId = req.user.id
    const role = req.user.role
    const incidentId = Number(req.params.id)
    const {technicianId} = result.data
    
    try{
        const reassignedIncident = await incidentService.reassignIncident(userId,role,incidentId,technicianId)

        return res.status(200).json(reassignedIncident)

    }catch(error){

        return res.status(error.statusCode || 500).json({
            message: error.message || "Atama sırasında bir hata oluştu"
        })

    }
}

async function adminStatus(req,res) {
    const result = adminStatusSchema.safeParse(req.body)

    if(!result.success){
        return res.status(400).json({
            message:"Validation Error",
            errors: result.error.issues
        })
    }

    const userId = req.user.id
    const userRole = req.user.role
    const incidentId = Number(req.params.id)
    const {status} = result.data

    try {
        const newStatus = await incidentService.adminStatus(userId,userRole,incidentId,status)

        return res.status(200).json(newStatus)

    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || "Durum güncellemesi sırasında bir hata oluştu"
        })
    }
}

async function getActiveIncidents(req,res) {
    const userId = req.user.id
    const userRole = req.user.role
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10

    try {
        const incident = await incidentService.getActiveIncidents(userId,userRole, page, limit)
        return res.status(200).json(incident)

    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || "Aktif arızalar getirilirken hata oluştu"
        })
    }
}

async function getIncidentHistory(req,res) {
    const userId = req.user.id
    const userRole = req.user.role
    const page = Number(req.query.page) || 1
    const limit = Number(req.query.limit) || 10


    try {
        const incidents = await incidentService.getIncidentHistory(userId,userRole, page, limit)
        return res.status(200).json(incidents)

    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || "Aktif arızalar getirilirken hata oluştu"
        })
    }
}

async function getIncidentsByHotel(req,res) {

    const userId = req.user.id
    const userRole = req.user.role
    const hotelId = req.params.hotelId
    
    try {

        const hotelsIncident = await incidentService.getIncidentsByHotel(userId,userRole,hotelId) 
        return res.status(200).json(hotelsIncident)

    } catch (error) {
        return res.status(error.statusCode || 500).json({
            message: error.message || "Arıza kayıtları getirilirken bir hata oluştu"
        })
    }
}

module.exports = {createIncident, getIncidents,getIncidentById, assignIncidentToSelf, updatedTechnicianStatus, reassignIncident,adminStatus,getActiveIncidents, getIncidentHistory, getIncidentsByHotel}
