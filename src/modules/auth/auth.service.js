const bcrypt = require("bcrypt")
const {generateToken} = require("../../utils/jwt")
const pool = require("../../database/db")


async function login(username,password){
    const query = `
    SELECT * FROM users WHERE username = $1 AND is_active = true`
    const result = await pool.query(query,[username])
    const user = result.rows[0]


    if(!user) {
        throw new Error("geçersiz kullanıcı adı ya da şifre")
    }

    const sonuc = await bcrypt.compare(password, user.password_hash)

        console.log("bcrypt result", sonuc)
    

        if(!sonuc){
            throw new Error("Geçersiz kullanıcı adı ya da şifre")
        }
        const token = generateToken({
                id: user.id,
                role: user.role,
                username: user.username
            })
            return {token}
}
module.exports = {login}