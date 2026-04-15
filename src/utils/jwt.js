const jwt = require("jsonwebtoken")
const SECRET = "string"
const EXPIRES_IN = "1d"

function generateToken(payload){
    return jwt.sign(payload,SECRET,{expiresIn: EXPIRES_IN})
}

function verifyToken(token){
    return jwt.verify(token,SECRET)
}
module.exports = {generateToken,verifyToken}