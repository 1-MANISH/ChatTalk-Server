import express from "express";
import { adminLogin, adminLogout, getAdminData, getAllChats, getAllMessages, getAllUsers, getDashboardStats } from "../controllers/admin.js";
import { adminLoginValidator, validateHandler } from "../lib/validators.js";
import { isAdminAuthenticated } from "../middlewares/auth.js";

const app = express.Router();


app.post("/verify",adminLoginValidator(),validateHandler,adminLogin)



// only admin can access this routes with this middleware - where we check if user is admin and logged in
app.get("/logout",isAdminAuthenticated,adminLogout)
app.get("/",isAdminAuthenticated,getAdminData)

app.get('/users',isAdminAuthenticated,getAllUsers)
app.get('/chats',isAdminAuthenticated,getAllChats)
app.get('/messages',isAdminAuthenticated,getAllMessages)
app.get('/stats',isAdminAuthenticated,getDashboardStats)


export default app