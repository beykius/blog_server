const cors = require("cors")
const mainRouter = require("./router/routes")
const express = require("express")
const mongoose = require("mongoose");
const app = express()
const sockets = require("./modules/sockets")

sockets.listen(3005)
require("dotenv").config()

app.use(cors())
app.use(express.json())

app.use("/", mainRouter)


mongoose.connect(process.env.MONGO_KEY)
    .then(() => {
        console.log("Connected to MongoDB")
    })
    .catch((err) => {
        console.log(err)
    })

app.listen(2002)
console.log('Server runs on port 2002')


const jwt = require("jsonwebtoken")