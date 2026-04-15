function requireRole(role){
    return (req,res,next) => {
        if(req.user.role !== role){
            return res.status(403).json({
                message:"Yetkiniz yok"
            })
        }
        next()
    }
}
module.exports = {requireRole}