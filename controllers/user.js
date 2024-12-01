import { TryCatch } from "../middlewares/error.js"
import {User} from "../models/user.js"
import { Chat } from "../models/chat.js"
import {Request} from "../models/request.js"
import { cookieOptions, emitEvent, sendToken, uploadFilesToCloudinary } from "../utils/features.js"
import bcrypt from "bcrypt"
import { ErrorHandler } from "../utils/utility.js"
import { NEW_REQUEST, REFETCH_CHATS } from "../constants/events.js"
import { getOtherMember } from "../lib/helper.js"



// create a new user and save it to the database and save token in cookie
const newUser = TryCatch( async (req,res,next) => {

    const {name,username,password,bio} = req.body

    // validating using express validator-middleware - for other fields

    // for avatar
    const file = req.file
    if(!file){ // not done by express middleware
        return next(new ErrorHandler("Please upload an avatar",400))
    }

    // cloudinary upload later
    const result = await uploadFilesToCloudinary([file]) // be aware here for single file upload only

    const avatar = {
        public_id:result[0].public_id,
        url:result[0].url
    }

    const user = await User.create({
        name,
        username,
        password,
        bio,
        avatar
    })

    sendToken(res,user,201,"User created successfully")
    
})

// login user and save token in cookie
const login  = TryCatch( async (req,res,next) => {

    const {username,password}  = req.body

     // validating using express validator-middleware

    const user = await User.findOne({username}).select("+password")

    if(!user){
        return next(new ErrorHandler("Invalid username or password",404))
    }

    const isPasswordMatched = await bcrypt.compare(password,user.password)

    if(!isPasswordMatched){
        return next(new ErrorHandler("Invalid password",404))
    }
    
    sendToken(res,user,200,`Welcome back , ${user.name}`)
})


// All other controller getting Token in cookies then only we reached here

const logout = TryCatch( async (req,res,next) => {

    res.cookie("chatTalk-token",null,{
        ...cookieOptions,
        maxAge:0
    })

    return res.status(200).json({
        success:true,
        message:"Logged out successfully"
    })
})


// current user profile
const getMyProfile = TryCatch(async (req,res,next) => {

    const user = await User.findById(req.user)

    if(!user){
        return next(new ErrorHandler("User not found",404))
    }

    return res.status(200).json({
        success:true,
        message:"User fetched successfully",
        user
    })
})

// search users
const searchUser = TryCatch(async (req,res,next) => {


    const {name=""} = req.query

    // later we add code to find users by name when we done with chats
   

    // finding all my chats
    const myChats = await Chat.find({
        groupChat:false,
        members:{$in:[req.user]}
    })

    // all my friends from chats 
    const allUsersFromChats = myChats.flatMap((chat)=>chat.members)
    
    // all users except me and my friends
    const allUserExceptMeAndFriends = await User.find({
        _id:{$nin:allUsersFromChats},
        name:{$regex:name,$options:"i"}
    })
    
    // transformation 
    const users = allUserExceptMeAndFriends.map((user)=>{
        return {
            _id:user._id,
            name:user.name,
            username:user.username,
            avatar:user.avatar.url
        }
    })


    
    return res.status(200).json({
        success:true,
        message:"Users find successfully",
        users
    })
})

const sendFriendRequest = TryCatch(async (req,res,next) => {

    const {userId} = req.body // as receiver id

    // validation using express validator-middleware

    const request = await Request.findOne({
        $or:[
            {sender:req.user,receiver:userId},
            {sender:userId,receiver:req.user}
        ]
    })

     // ig also we can check if user is already a friend -  can be handle in frontend

    if(request){
        return next(new ErrorHandler("Request already sent",400))
    }

    await Request.create({
        sender:req.user,
        receiver:userId,
        // status by default is pending
    })

    emitEvent(req,NEW_REQUEST,[userId])

    return res.status(200).json({
        success:true,
        message:"Friend Request sent successfully"
    })
})    

const acceptFriendRequest = TryCatch(async (req,res,next) => {

    const {requestId,accept} = req.body

    // validation using express validator-middleware

    const request = await Request.findById(requestId).populate("sender","name").populate("receiver","name")

    if(!request){
        return next(new ErrorHandler("Request not found",404))
    }
    
    if(request.receiver._id.toString() !== req.user.toString()){
        return next(new ErrorHandler("You are not authorized to accept this request",401))
    }

    if(!accept){
        await Request.findByIdAndDelete(requestId)
        return res.status(200).json({
            success:true,
            message:"Request rejected successfully"
        })
    }
      
    const members = [request.sender._id,request.receiver._id]

    await Promise.all([
        Chat.create({
            name:`${request.sender.name} -- ${request.receiver.name}`,
            creator:req.user,
            members
        }),
        Request.findByIdAndDelete(requestId)
    ])

    emitEvent(req,REFETCH_CHATS,members)

    return res.status(200).json({
        success:true,
        message:" Request accepted successfully",
        senderId:request.sender._id
    })
})

const getMyNotifications = TryCatch(async (req,res,next) => {

    const requests = await Request.find({
        receiver:{$in:[req.user]}
    }).populate("sender","name username avatar")

    const allRequests = requests.map(({_id,sender})=>{
        return {
            _id,
            sender:{
                _id:sender._id,
                name:sender.name,
                avatar:sender.avatar.url
            }
        }
    })

    return res.status(200).json({
        success:true,
        allRequests
    })
})

const getMyFriends = TryCatch(async (req,res,next) => {

    const chatId = req.query.chatId

    // validation using express validator-middleware
    const chats = await Chat.find({
        groupChat:false,
        members:{$in:[req.user]}
    }).populate("members","name avatar")


    const friends = chats.map(({members})=>{
       const otherMember = getOtherMember(members,req.user)

       return {
            _id:otherMember._id,
            name:otherMember.name,
            avatar:otherMember.avatar.url
       }
    })

    if(chatId){

        // only jo available friends who are not in this chat
        const chat = await Chat.findById(chatId)
        if(!chat){
            return next(new ErrorHandler("Chat not found",404))
        }
        const availableFriends = friends.filter((friend)=>{
            return !chat.members.includes(friend._id)
        })

        return res.status(200).json({
            success:true,
            friends:availableFriends
        })

    }else{
        return res.status(200).json({
            success:true,
            friends
        })
    }

    
})

export {
    newUser,
    login,
    logout,
    getMyProfile,
    searchUser,
    sendFriendRequest,
    acceptFriendRequest,
    getMyNotifications,
    getMyFriends
}