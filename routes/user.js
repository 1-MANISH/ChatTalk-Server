import express from "express";
import { acceptFriendRequest, getMyFriends, getMyNotifications, getMyProfile, login, logout, newUser, searchUser, sendFriendRequest } from "../controllers/user.js";
import {singleAvatar} from "../middlewares/multer.js"
import { isAuthenticated } from "../middlewares/auth.js";
import { acceptRequestValidator, loginValidator, registerValidator, sendRequestValidator, validateHandler } from "../lib/validators.js";


const app = express.Router()


app.post("/new",singleAvatar,registerValidator(),validateHandler,newUser)
app.post("/login",loginValidator(),validateHandler,login)


// After here user must be logged in to access this routes
app.get("/logout",isAuthenticated,logout)
app.get("/me",isAuthenticated,getMyProfile)
app.get('/search',isAuthenticated,searchUser)
app.put('/sendRequest',isAuthenticated,sendRequestValidator(),validateHandler,sendFriendRequest)
app.put('/acceptRequest',isAuthenticated,acceptRequestValidator(),validateHandler,acceptFriendRequest)
app.get('/notifications',isAuthenticated,getMyNotifications)
app.get("/friends",isAuthenticated,getMyFriends)
export default app