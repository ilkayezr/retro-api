
const authService = require("./auth.service")
const {loginSchema} = require("./auth.schema")

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

module.exports = {login}