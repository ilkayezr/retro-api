const app = require("./app")
const seed = require("./database/seed")
const  port = 3000

async function start(){
    await seed()

    app.listen(port,() => {
    console.log(`server ${port} çalışıyor`);
    
})
}
start()

