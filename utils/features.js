import mongoose from "mongoose"
import jwt from "jsonwebtoken"
import { v2 as cloudinary } from "cloudinary"
import {v4 as uuid} from "uuid"
import { getBase64Image, getSockets } from "../lib/helper.js"

const cookieOptions = {
        httpOnly:true,
        maxAge:1000*60*60*24*15, // 15 days
        sameSite:"none",
        secure:true
}

const connectDatabase = async (url) => {
        mongoose.connect(url,{dbName:"ChatTalk"})
        .then((data)=>{
                console.log(`MongoDB connected 👌 with ${data.connection.host}`);
         })
        .catch((err)=>{
                console.log(`🤣 MongoDB connection error : ${err} `);
                throw err
        })
}

const generateToken =  (_id) => {
        return jwt.sign(
                {_id},
                process.env.JWT_SECRET,
                {expiresIn:"1d"}
        )
}

const sendToken =  (res,user,code,message) => {

        const token =  generateToken(user._id)

        return res.status(code)
        .cookie("chatTalk-token",token, cookieOptions)
        .json({
                success:true,
                message,
                user
        })
}


// related to web socket

const emitEvent = (req,event,users,data) => {

        const io = req.app.get("io");

        const userSockets = getSockets(users)

        io.to(userSockets).emit(event,data)

}



// cloudinary stuff

const uploadFilesToCloudinary  = async(files=[]) => {
        

        const uploadPromises = files.map((file)=>{
                return new Promise((resolve,reject)=>{
                     cloudinary.uploader.upload(
                        getBase64Image(file),
                        {
                                resource_type:"auto",
                                folder:"ChatTalk",
                                public_id:uuid()
                        },
                        (error,result)=>{
                                if(error){
                                        reject(error)
                                }else{
                                        resolve(result)
                                }
                        }) 
                })
        })

        try {
              const results = await Promise.all(uploadPromises)
              const formattedResults = results.map((result)=>{
                    return {
                            public_id:result.public_id,
                            url:result.secure_url
                    }
              })
              return formattedResults  
        } catch (error) {
             throw new Error("Error uploading files to cloudinary",error)   
        }


}
const deleteFilesFromCloudinary  = async(public_ids) => {

}

export {
    connectDatabase,
    sendToken,
    cookieOptions,
    emitEvent,
    deleteFilesFromCloudinary,
    uploadFilesToCloudinary
}