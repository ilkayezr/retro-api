const app = require("./app")
const  port = 3000

async function start(){

    app.listen(port,() => {
    console.log(`server ${port} çalışıyor`);
    
})
}
start()

