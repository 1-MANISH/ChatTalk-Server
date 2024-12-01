import { TryCatch } from "../middlewares/error.js";
import { Chat } from "../models/chat.js";
import { Message } from "../models/message.js";
import { User } from "../models/user.js";
import jwt from "jsonwebtoken";
import {cookieOptions} from "../utils/features.js"
import { ErrorHandler } from "../utils/utility.js";

const adminLogin = TryCatch(async(req,res,next)=>{

    const {secretKey} = req.body
    // validate using express validator middleware

    const adminSecretKey = process.env.ADMIN_SECRET_KEY || "chatTalkAdmin"

    const isMatched = secretKey === adminSecretKey

    if(!isMatched){
        return next(new ErrorHandler("Invalid admin secret key",401))
    }

    const token = jwt.sign(
        {secretKey},
        process.env.JWT_ADMIN_SECRET_KEY,
        {expiresIn:"1d"}
    )

    return res.status(200)
    .cookie("chatTalk-admin-token",token,{...cookieOptions,maxAge:1000*60*15})
    .json({
        success:true,
        message:`Authenticated as admin , Welcome BOSS 👑`
    })


})

const adminLogout = TryCatch(async(req,res,next)=>{

    res.cookie("chatTalk-admin-token",null,{
        ...cookieOptions,
        maxAge:0
    })

    return res.status(200)
    .json({
        success:true,
        message:"Admin Logged out successfully"
    })
})

const getAdminData = TryCatch(async(req,res,next)=>{

    return res.status(200)
    .json({
        success:true,
        admin:true
    })
})

const getAllUsers = TryCatch(async (req, res, next) => {

    const users = await User.find({})

    // transformation

    const transformedUsers = users.map(

        async({name,username,avatar,_id})=> {

        const [groups,friends] = await Promise.all([
             Chat.countDocuments({
                groupChat:true,
                members:{
                    $in:[_id]
                }
            }),
             Chat.countDocuments({
                groupChat:false,
                members:{
                    $in:[_id]
                }
            })
        ])

        return {
            name,
            username,
            avatar:avatar.url,
            _id,
            groups,
            friends
        }
    })

    const allUsers = await Promise.all(transformedUsers)

    return res.status(200).json({
        success:true,
        users:allUsers
    })
})

const getAllChats = TryCatch(async(req,res,next)=>{

    const chats = await Chat.find({})
    .populate("members","name avatar")
    .populate("creator","name avatar")


    const transformChats = chats.map(
        async ({_id,groupChat,name,members,creator})=>{


            const totalMessages = await Message.countDocuments({
                chat:_id
            })

            return {
                _id,
                name,
                groupChat,
                avatar:members.slice(0,3).map((member)=>member.avatar.url),
                members:members.map((member)=>{
                    return {
                        _id:member._id,
                        name:member.name,
                        avatar:member.avatar.url,
                    }
                }),
                creator:{
                    name:creator?.name || "None",
                    avatar:creator?.avatar?.url || ""
                },
                totalMembers:members.length,
                totalMessages
            }

    })

    const allChats = await Promise.all(transformChats)

    return res.status(200).json({
        success:true,
        chats:allChats,
    })
})

const getAllMessages = TryCatch(async(req,res,next)=>{

    const messages = await Message.find({})
    .populate("sender","name avatar")
    .populate("chat","groupChat")

    const transformMessages = messages.map(
         ({_id,attachments,sender,chat,content,createdAt})=>{
            return {
                _id,
                content,
                sender:{
                    _id:sender._id,
                    name:sender?.name,
                    avatar:sender?.avatar?.url
                },
                chat:chat._id,
                groupChat:chat.groupChat,
                attachments,
                createdAt,
            }
    })


    return res.status(200).json({
        success:true,
        messages:transformMessages
    })
})

const getDashboardStats = TryCatch(async(req,res,next)=>{

    const [usersCount,groupsCount,messagesCount,totalChatsCount] = await Promise.all([
        User.countDocuments(),
        Chat.countDocuments({groupChat:true}),
        Message.countDocuments(),
        Chat.countDocuments()
    ])

    // last seven days messages - with count with full date

    const today = new Date()

    const last7Days = new Date()
    last7Days.setDate(today.getDate() - 7)

    const last7DaysMessages = await Message.find({
        createdAt:{
            $gte:last7Days,
            $lte:today
        }
    }).select("createdAt")

    // transformation
    const messages = new Array(7).fill(0) // [last7 last6  ... last1]
    const dayInMiliSeconds = 1000 * 60 * 60 * 24

    last7DaysMessages.forEach((message)=>{
        const indexApprox = (today.getTime() - message.createdAt.getTime()) / dayInMiliSeconds
        const index = Math.floor(indexApprox)
        messages[6-index]++
    })

    const stats = {
        usersCount,
        groupsCount,
        messagesCount,
        totalChatsCount,
        messagesChart:messages
    }

    return res.status(200).json({
        success:true,
        stats
    })
})

export {
    getAllUsers,
    getAllChats,
    getAllMessages,
    getDashboardStats,
    adminLogin,
    adminLogout,
    getAdminData
}