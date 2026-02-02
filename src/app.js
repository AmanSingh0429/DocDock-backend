import express from "express"
import cors from "cors"
import cookieParser from "cookie-parser"
import userRouter from "./routes/user.routes.js"
import errorHandler from "../middleware/error.middleware.js"


const app = express()


app.use(express.json())
app.use(cors({
  origin: process.env.CLIENT_URL
}))
app.use(express.static("public"))
app.use(cookieParser())

app.get("/", (req, res) => {
  res.json({ message: "API is running 🚀" });
});


app.use("/api/v1/user", userRouter)

app.use(errorHandler)

export default app