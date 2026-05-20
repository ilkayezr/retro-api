
const authService = require("./auth.service")
const {loginSchema, forgotPasswordSchema, resetPasswordSchema} = require("./auth.schema")

async function getTechnicians(req, res) {
    try {
        const technicians = await authService.getTechnicians()
        return res.status(200).json(technicians)
    } catch (error) {
        return res.status(500).json({message: "Teknisyenler alınamadı"})
    }
}

async function login(req,res) {

    const result = loginSchema.safeParse(req.body)

    if(!result.success){
        return res.status(400).json({
            message: "Validation failed",
            errors: result.error.issues
        })
    }
    
    try{
        const {username,password} = result.data
        const data = await authService.login(username,password)
        return res.status(200).json(data)
    }catch(error){
        return res.status(401).json({
            message:"Geçersiz kullanıcı adı ya da şifre"
        })
    }
           
}

async function forgotPassword(req,res) {
    const result = forgotPasswordSchema.safeParse(req.body)
    if(!result.success){
        return res.status(400).json({
            message:"Validation failed",
            errors: result.error.issues
        })
    }
    try {
        const {email} = result.data
        const data = await authService.forgotPassword(email)
        return res.status(200).json(data)
    } catch (error) {
        return res.status(500).json({
            message:"Şifre sıfırlama sırasında bir hata oluştu"
        })
    }
}

async function resetPassword(req,res) {
    const result = resetPasswordSchema.safeParse(req.body)
    if(!result.success){
        return res.status(400).json({
            message:"Validation failed",
            errors: result.error.issues
        })
    }
    try {
        const {token, newPassword} = result.data
        const data = await authService.resetPassword(token,newPassword)
        return res.status(200).json(data)
    } catch (error) {
        return res.status(400).json({
            message: error.message || "Şifre sıfırlama başarısız!"
        })
    }
}

module.exports = {login, getTechnicians, forgotPassword, resetPassword}