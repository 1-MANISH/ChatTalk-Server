import express from "express";
import { connectDatabase } from "./utils/features.js";
import dotenv from "dotenv";
import { errorMiddleware } from "./middlewares/error.js";
import cookieParser from "cookie-parser";
import { Server } from "socket.io";
import { createServer } from "http";
import {v4 as uuid} from "uuid";
import { CHAT_JOINED, CHAT_LEAVED, NEW_MESSAGE, NEW_MESSAGE_ALERT, ONLINE_USERS, START_TYPING, STOP_TYPING } from "./constants/events.js";
import { getSockets } from "./lib/helper.js";
import cors from "cors"
import {v2 as cloudinary} from "cloudinary"
import { Message } from "./models/message.js";
import { corsOptions } from "./constants/config.js";
import { socketAuthenticator } from "./middlewares/auth.js";



// Routes import
import userRoutes from "./routes/user.js";
import chatRoutes from "./routes/chat.js";
import adminRoute from "./routes/admin.js"




// configuration
dotenv.config({
    path:"./.env"
});
cloudinary.config({
    cloud_name:process.env.CLOUDINARY_CLOUD_NAME,
    api_key:process.env.CLOUDINARY_API_KEY,
    api_secret:process.env.CLOUDINARY_API_SECRET
})

//  variables
const MONGODB_URL = process.env.MONGODB_URL
const PORT = process.env.PORT || 3000
const envMode = process.env.NODE_ENV.trim() || "PRODUCTION"
const userSocketIDS = new Map()
const onlineUsers = new Set()


const app = express()
const server = createServer(app) // create a http server with same instance as socket
const io = new Server(server,{
    cors: corsOptions,
}) // pass http server as argument - create a socket server

// setInstance of io for later use - const io = req.get("io")
app.set("io",io)

// middlewares
app.use(express.json());
// app.use(express.urlencoded({ extended: true })); // form data -now using multer
app.use(cookieParser({
    sameSite:"none",
    secure:true,
    httpOnly:true
}))
app.use(cors(corsOptions))

// connect to database
connectDatabase(MONGODB_URL);


// routes
app.use("/api/v1/user", userRoutes)
app.use("/api/v1/chat", chatRoutes)
app.use("/api/v1/admin",adminRoute)


// home route
app.get("/", (req, res) => {
    res.send("Everything working fine");
});



// socket io

// socket middleware for auth - after we connect with frontend
io.use((socket,next)=>{
    // console.log(socket.handshake.query.token);
    cookieParser()(socket.request,socket.request.res,async (err)=>{
        await socketAuthenticator(err,socket,next)
    })
    
})


// on socket connection
io.on("connection",(socket)=>{

    // console.log(`a user connected : ${socket.id}`);

    // assume that user is logged in and we have a user object
    const user = socket.user
    userSocketIDS.set(user._id.toString(),socket.id)
    
    // for new message
    socket.on(NEW_MESSAGE,async({chatId,members,message})=>{

        const messageForRealTime = {
            content:message,
            _id:uuid(),
            sender:{
                _id:user._id,
                name:user.name,
                avatar:user.avatar.url
            },
            chatId,
            createdAt:new Date().toISOString()
        }
        const messageForDatabase = {
            content:message,
            sender:user._id,
            chat:chatId,
        }
        
        const membersSockets = getSockets(members)
        
        io.to(membersSockets).emit(NEW_MESSAGE,{
            chatId,
            message:messageForRealTime
        });
        io.to(membersSockets).emit(NEW_MESSAGE_ALERT,{chatId});

        // save to database
        try {
            await Message.create(messageForDatabase)
        } catch (error) {
           throw new Error(error)
            
        }
    })

    // for typing
    socket.on(START_TYPING,({members,chatId})=>{

        const membersSockets = getSockets(members)

        socket.to(membersSockets).emit(START_TYPING,{chatId})
    })
    socket.on(STOP_TYPING,({members,chatId})=>{

        const membersSockets = getSockets(members)

        socket.to(membersSockets).emit(STOP_TYPING,{chatId})
    })

    // for online users show
    socket.on(CHAT_JOINED,({userId,members})=>{
        onlineUsers.add(userId.toString())

        const membersSockets = getSockets(members)
        io.to(membersSockets).emit(ONLINE_USERS,Array.from(onlineUsers))
    })
    socket.on(CHAT_LEAVED,({userId,members})=>{
      onlineUsers.delete(userId.toString()) 

      const membersSockets = getSockets(members)
      io.to(membersSockets).emit(ONLINE_USERS,Array.from(onlineUsers))
    })


    socket.on("disconnect",()=>{
        // console.log(`a user disconnected : ${socket.id}`);
        userSocketIDS.delete(user._id.toString())
        onlineUsers.delete(user._id.toString())
        socket.broadcast.emit(ONLINE_USERS,Array.from(onlineUsers))
    })
    
})




// error middleware - called every time an error occurs for any route
app.use(errorMiddleware)

// server start - now we added socket as replacement of app->server
server.listen(PORT, () => {
    console.log(`Server is running 👊 on PORT ${PORT} in ${envMode} Mode`)
});


// -------------------------------


// global error handler
// global error handler for undefined variables
// handle un cought exceptions

// export variables
export {
    envMode,
    userSocketIDS
}