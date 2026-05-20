
const {z} = require("zod")

const loginSchema = z.object({

    username: z.string().trim().min(3,"Kullanıcı adı en az 3 karakter olmalı"),
    password: z.string().trim().min(6,"Şifre en az 6 karakter olmalı")

})
const forgotPasswordSchema = z.object({
    email: z.string().trim().email("Geçerli bir mail adresi giriniz")
})
const resetPasswordSchema = z.object({
    token: z.string().trim().regex(/^\d{6}$/,"Mailinize gönderilen kodu giriniz"),
    newPassword: z.string().trim().min(6,"Yeni şifre en az 6 karakter olmalı")
})

module.exports = {loginSchema,forgotPasswordSchema,resetPasswordSchema}