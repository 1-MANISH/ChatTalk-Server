import { User } from "../models/user.js";
import { ErrorHandler } from "../utils/utility.js";
import { TryCatch } from "./error.js";
import jwt from "jsonwebtoken";


const isAuthenticated = TryCatch( async (req,res,next) => {
    
    const token = req.cookies["chatTalk-token"]

    if(!token){
        return next(new ErrorHandler("Please login to access this route",401))
    }

    const decodeData =  jwt.verify( // by default throw signature error
        token,
        process.env.JWT_SECRET
    )

    const user = await User.findById(decodeData._id)
    if(!user){
        return next(new ErrorHandler("Invalid token",401))
    }
    
    req.user = decodeData._id
    
    next()
})

const isAdminAuthenticated  =TryCatch( async (req,res,next) => {

    const token = req.cookies["chatTalk-admin-token"]

    if(!token){
        return next(new ErrorHandler("Please login as admin to access this route",401))
    }
    const decodeData  = jwt.verify(
        token,
        process.env.JWT_ADMIN_SECRET_KEY
    )

    const isMatched = decodeData.secretKey === process.env.ADMIN_SECRET_KEY || decodeData.secretKey === "chatTalkAdmin"

    if(!isMatched){
        return next(new ErrorHandler("Invalid admin secret key",401))
    }

    req.admin = decodeData.secretKey

    next()
})

const socketAuthenticator = async (err,socket,next) => {
    try {

        if(err){
            return next(new ErrorHandler(err.message,401))
        }

        const authToken = socket.request.cookies["chatTalk-token"]

        if(!authToken){
            return next(new ErrorHandler("Please login to access this route",401))
        }

        const decodeData = jwt.verify(authToken,process.env.JWT_SECRET)
        
        const user = await User.findById(decodeData._id)

        if(!user){
            return next(new ErrorHandler("Invalid token",401))
        }

        socket.user = user

        return next()
        
    } catch (error) {
        console.log(error)
        return next(new ErrorHandler(error.message,401))
    }
}

export  {
    isAuthenticated,
    isAdminAuthenticated,
    socketAuthenticator
}