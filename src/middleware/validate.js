const validate = (schema) => (req,res,next) => {
    const result = schema.safeParse(req.body)

    if(!result.success){
        const errors = result.error.issues.map((i) => ({
            path: i.path.join("."),
            message: i.message,
        }))

        return res.status(400).json({
            message: "Alanlar eksik ya da yanlış dolduruldu"
        })
    }
}