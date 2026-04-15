
const {z} = require("zod")

const loginSchema = z.object({

    username: z.string().trim().min(3,"Kullanıcı adı en az 3 karakter olmalı"),
    password: z.string().trim().min(6,"Şifre en az 6 karakter olmalı")

})

module.exports = {loginSchema}