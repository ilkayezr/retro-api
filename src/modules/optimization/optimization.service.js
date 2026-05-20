const pool = require("../../database/db")
const { createIncidentLog } = require("../incidents/incident.service")

async function applyOptimizedRoutes(routes, adminId = 1) {
    const techsResult = await pool.query(`
        SELECT u.id, u.full_name, COUNT(i.id) as workload
        FROM users u
        LEFT JOIN incidents i ON i.assigned_to = u.id 
          AND i.status IN ('pending', 'assigned', 'in_progress')
        WHERE u.role = 'technician'
        GROUP BY u.id, u.full_name
        ORDER BY workload ASC
    `)

    const technicians = techsResult.rows
    if (technicians.length === 0) {
        throw new Error("Atanacak teknisyen bulunamadı")
    }

    const results = []

    for (let i = 0; i < routes.length; i++) {
        const route = routes[i]
        const technicianIdx = i % technicians.length
        const technician = technicians[technicianIdx]
        const technicianId = technician.id

        if (!Array.isArray(route.incident_ids)) {
            throw new Error(`Rota ${i + 1} için incident_ids formatı hatalı`)
        }

        // Empty route is valid when total active incidents are fewer than route capacity.
        if (route.incident_ids.length === 0) {
            continue
        }

        await pool.query(
            `UPDATE incidents SET assigned_to = $1, status = 'assigned' WHERE id = ANY($2)`,
            [technicianId, route.incident_ids]
        )

        // Log each auto-assignment
        for (const incidentId of route.incident_ids) {
            try {
                await createIncidentLog({
                    incidentId: incidentId,
                    action: "auto_assigned",
                    performedBy: adminId,
                    note: `Otomatik atama: ${technician.full_name}`
                })
            } catch (error) {
                console.error("auto-assignment log error:", error)
            }
        }

        results.push({
            routeNumber: route.route_number,
            incidentCount: route.incident_ids.length,
            technicianId: technicianId,
            technicianName: technician.full_name,
            stops: route.stops
        })
    }

    return { 
        message: "Rotalar başarıyla atandı", 
        routesApplied: results.length,
        assignments: results
    }
}

module.exports = { applyOptimizedRoutes }
