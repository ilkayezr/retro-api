const { verifyToken} = require("../utils/jwt")

function authMiddleware(req,res,next){

    const header = req.headers.authorization

    if(!header){
        return res.status(401).json({message:"header bulunamadı"})
    }

    const tokenSplit = header.split(" ")
    const scheme = tokenSplit[0]
    const token =tokenSplit[1]

    if(scheme != "Bearer" || !token){
        return res.status(401).json({message:"format hatalı"})
    }

    try{
        const decoded = verifyToken(token)
        req.user = decoded
        next()

    }catch(err){
        return res.status(401).json({message:"token geçersiz"})
    }
}



module.exports = authMiddleware