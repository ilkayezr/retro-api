const bcrypt = require("bcrypt")
const crypto = require("crypto")
const nodemailer = require("nodemailer")
const {generateToken} = require("../../utils/jwt")
const pool = require("../../database/db")

function createTransporter(){
    return nodemailer.createTransport({
        service: "gmail",
        auth: {
            user: process.env.SMTP_USER,
            pass: process.env.SMTP_PASS
        }
    })
}

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
async function getTechnicians() {
    const query = `SELECT id, full_name FROM users WHERE role = 'technician' AND is_active = true ORDER BY full_name ASC`
    const result = await pool.query(query)
    return result.rows
}

async function forgotPassword(email) {
    const query = `SELECT * FROM users WHERE email = $1 AND is_active = true `
    const result = await pool.query(query,[email])
    const user = result.rows[0]

    if(!user){
        throw new Error("Geçersiz e-posta adresi")
    }
    const resetCode= crypto.randomInt(0,1000000).toString().padStart(6,"0")
    const tokenHash = crypto.createHash("sha256").update(resetCode).digest("hex")
    const expiresAt = new Date(Date.now() + 1000 * 60 * 30)

    const resetQuery = `UPDATE users SET reset_token = $1,
    reset_token_expires_at =$2
    WHERE id = $3`
    await pool.query(resetQuery,[tokenHash,expiresAt,user.id])
    
    const transporter= createTransporter()
    await transporter.sendMail({
        from: "Retro Mühendislik Destek <ezerilkay5@gmail.com>",
        to: user.email,
        subject: "Şifre Sıfırlama",
        text:
        "Şifre Sıfırlama kodunuz: " + resetCode + "\nBu kod 30 dakika geçerlidir."
    })
    return {message: "Mailinize şifre sıfırlama kodu gönderilmiştir"}
    
}

async function resetPassword(token, newPassword) {
    const tokenHash = crypto.createHash("sha256").update(token).digest("hex")
    const findUSerQuery =`
    SELECT id FROM users
    WHERE reset_token = $1 AND reset_token_expires_at > NOW()
    AND is_active = true LIMIT 1`

    const result = await pool.query(findUSerQuery,[tokenHash])
    const user =result.rows[0]

    if(!user){
        throw new Error("Kod geçersiz veya süresi dolmuş")
    }
    const passwordHash= await bcrypt.hash(newPassword,10)

    const updateQuery = `
    UPDATE users SET password_hash =$1, reset_token = NULL ,
    reset_token_expires_at = NULL WHERE id = $2`

    await pool.query(updateQuery,[passwordHash,user.id])
    return {message: "Şifreniz başarıyla güncellenmiştir"}
    
}

module.exports = {login, getTechnicians,forgotPassword,resetPassword}