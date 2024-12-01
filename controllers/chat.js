import { TryCatch } from "../middlewares/error.js";
import { ErrorHandler } from "../utils/utility.js";
import {Chat} from "../models/chat.js";
import {User} from "../models/user.js"
import {Message} from "../models/message.js"
import { deleteFilesFromCloudinary, emitEvent, uploadFilesToCloudinary } from "../utils/features.js";
import {ALERT, NEW_MESSAGE, NEW_MESSAGE_ALERT, REFETCH_CHATS} from "../constants/events.js";
import { getOtherMember } from "../lib/helper.js";


// create a new group chat 
const newGroupChat = TryCatch(async (req, res, next) => {

    const {name,members} = req.body

    // validation using express validator -middleware

    // group name should be unique for the user
    const existingChat = await Chat.findOne({name:name,creator:req.user})
    if(existingChat){
        return next(new ErrorHandler("Group with same name already exists",400))
    }

    // adding ourselves to members
    const allMembers = [...members,req.user] // we are just saving user id in members array

    const chat = await Chat.create({
        name,
        groupChat:true,
        creator:req.user,
        members:allMembers
    })

    emitEvent(req,ALERT,allMembers,{
        message:`Welcome to group ${name} chat`,
        chatId:chat._id
    })
    emitEvent(req,REFETCH_CHATS,members)

    return res.status(201).json({
        success:true,
        message:"Group created successfully",
    })

});

// get my all chats - normal or group chat
const getMyChats = TryCatch(async (req, res, next) => {

    const chats = await Chat.find({members:{$in:[req.user]}}).populate(
        "members",
        "name avatar"
    )

    

    const transformedChats = chats.map(({_id,name,groupChat,members})=>{

        // when groupChat is false
        const otherMember = getOtherMember(members,req.user)

        // handling some basic conditions
        return {
           _id,
           groupChat:groupChat,
           name:groupChat ? name : otherMember?.name,
           avatar:groupChat ? 
           members.slice(0,3).map(({avatar})=>{
               return avatar.url
           }) : [otherMember?.avatar?.url],
           members:members.reduce((prev,curr)=>{
             if(curr._id.toString() !== req.user.toString()){
               return [...prev,curr._id]
             }
             return prev
           },[]),
        }
    })


    return res.status(200).json({
        success:true,
        message:"Chats fetched successfully",
        chats:transformedChats
    })

})

// get my all groups - groupChat
const getMyGroups = TryCatch(async (req, res, next) => {

    const chats = await Chat.find({members:{$in:[req.user]},groupChat:true,creator:req.user}).populate(
        "members",    
        "name avatar"
    )

    const groups = chats.map(({_id,name,members,groupChat})=>{
        return {
            _id,
            groupChat,
            name,
            avatar:members.slice(0,3).map(({avatar})=>{
                return avatar.url
            }),
           
        }
    })

    return res.status(200).json({
        success:true,
        message:"Groups fetched successfully",
        groups
    })

})

// add members to group
const addMembersToGroup = TryCatch(async (req, res, next) => {

    const {members,chatId} = req.body

    // validation using express validator -middleware

    const chat = await Chat.findById(chatId)

    if(!chat){
        return next(new ErrorHandler("Chat not found",404))
    }
    if(chat.groupChat === false){
        return next(new ErrorHandler("This is not a group chat",404))
    }
    if(chat.creator.toString() !== req.user.toString()){
        return next(new ErrorHandler("Only group creator can add members",401))
    }

    const allNewMembersPromise = members.map((id)=>{
        return User.findById(id).select("name")
    })

    const allNewMembers = await Promise.all(allNewMembersPromise)

    const uniqueMembers = allNewMembers.filter((member,index)=>{
        return !chat.members.includes(member._id.toString())
    })

    chat.members.push(...uniqueMembers.map((member)=>{
        return member._id
    }))

    if(chat.members.length > 100){
        return next(new ErrorHandler("Group can have only 100 members",400))
    }

    const allUserName = uniqueMembers.map((member)=>{
        return member.name
    }).join(",")


    // koi new member nhi hai
    if(allUserName === ""){
        const allAlreadyInUserName = allNewMembers.map((member)=>{
            return member.name
        }).join(",")
        return next(new ErrorHandler(`${allAlreadyInUserName} is already in ${chat.name}`,400))
    }

    await chat.save()

    emitEvent(req,ALERT,chat.members,{
        message:`${allUserName} added to group ${chat.name}`,
        chatId
    })
    emitEvent(req,REFETCH_CHATS,chat.members)

    return res.status(200).json({
        success:true,
        message:`${allUserName} added to group ${chat.name}`
    })
    
})

// remove member from group
const removeMemberFromGroup = TryCatch(async (req, res, next) => {

    const {userId,chatId} = req.body

    // validation using express validator -middleware

    const [chat,userThatWillBeRemoved] = await Promise.all([
        Chat.findById(chatId),
        User.findById(userId).select("name")
    ])

    if(!chat){
        return next(new ErrorHandler("Chat not found",404))
    }
    if(chat.groupChat === false){
        return next(new ErrorHandler("This is not a group chat",404))
    }
    if(chat.creator.toString() !== req.user.toString()){
        return next(new ErrorHandler("Only group creator can remove members",401))
    }
    if(chat.members.length <= 3){
        return next(new ErrorHandler("Group must have at least 3 members",400))
    }

    const allChatMembers = chat.members.map((member)=>{
        return member.toString()
    })

    chat.members = chat.members.filter((member)=>{
        return member.toString() !== userId.toString()
    })

    await chat.save()

    emitEvent(req,ALERT,chat.members,{
        message:`${userThatWillBeRemoved.name} removed from Chat group ${chat.name}`,
        chatId
    })
    emitEvent(req,REFETCH_CHATS,allChatMembers)

    return res.status(200).json({
        success:true,
        message:`${userThatWillBeRemoved.name} removed from group ${chat.name}`
    })

})

// leave group
const leaveGroup = TryCatch(async (req, res, next) => {

    const chatId  = req.params.id

    // validation using express validator -middleware

    const user = await User.findById(req.user)
    const chat = await Chat.findById(chatId)

    if(!chat){
        return next(new ErrorHandler("Chat not found",404))
    }

    if(chat.groupChat === false){
        return next(new ErrorHandler("This is not a group chat",404))
    }

    if(chat.members.length <= 3){
        return next(new ErrorHandler("Group must have at least 3 members ,so go for delete the group",400))
    }

    const remainingMembers = chat.members.filter((member)=>{
        return member.toString() !== req.user.toString()
    })

    // if admin leave the group
    if(chat.creator.toString() === req.user.toString()){

        const randomNumber = Math.floor(Math.random() * remainingMembers.length)
        const newCreator = remainingMembers[randomNumber]
        chat.creator = newCreator
    }

    chat.members = remainingMembers

    await chat.save()

    emitEvent(req,ALERT,chat.members,{
        message:`${user.name} left Chat group ${chat.name}`,
        chatId
    })
    

    return res.status(200).json({
        success:true,
        message:`${user.name} left Chat group ${chat.name}`
    })

})

// send attachments
const sendAttachments = TryCatch(async (req, res, next) => {

    const {chatId} = req.body

    // validation using express validator -middleware -chatId 

    // files validation

    const files = req.files || [] 
    if(files.length < 1){
        return next(new ErrorHandler("Please provide at least one attachment",400))
    }

    if(files.length > 5){
        return next(new ErrorHandler("You can upload at most 5 attachments",400))
    }

    

    const [chat,me] = await Promise.all([
        Chat.findById(chatId),
        User.findById(req.user)
    ])

    if(!chat){
        return next(new ErrorHandler("Chat not found",404))
    }


    

    // upload files here - cloudinary

    const attachments = await uploadFilesToCloudinary(files)

    const messageForDatabase = {
        content:"",
        sender:me._id,
        chat:chat._id,
        attachments
    }

    const messageForRealTime = {
        ...messageForDatabase,
        sender:{
            _id:me._id,
            name:me.name,
            avatar:me.avatar.url
        },
    };
   

    // save message in database
    const message = await Message.create(messageForDatabase)
    
    emitEvent(req,NEW_MESSAGE,chat.members,{
        message:messageForRealTime,
        chatId

    })

    emitEvent(req,NEW_MESSAGE_ALERT,chat.members,{
        chatId,
    })
    

    return res.status(200).json({
        success:true,
        message,
    })
})

// get Chat details
const getChatDetails = TryCatch(async (req, res, next) => {

    const chatId = req.params.id

    // validation using express validator -middleware

    if(req.query.populate === "true"){

        const chat = await Chat.findById(chatId).populate(
            "members",
            "name avatar"
        ).lean() // using lean now chat is a classic javascript object

        if(!chat){
            return next(new ErrorHandler("Chat not found",404))
        }

        chat.members = chat.members.map(({_id,name,avatar})=>
           ({
                _id,
                name,
                avatar:avatar.url
            })
        )


        return res.status(200).json({
            success:true,
            chat
        })

    }else{
        const chat = await Chat.findById(chatId)
        if(!chat){
            return next(new ErrorHandler("Chat not found",404))
        }
        return res.status(200).json({
            success:true,
            chat
        })
    }
})

// rename group
const renameGroup = TryCatch(async (req, res, next) => {

    const chatId = req.params.id
    const {name} = req.body

    // validation using express validator -middleware

    const chat = await Chat.findById(chatId)

    if(!chat){
        return next(new ErrorHandler("Chat not found",404))
    }
    if(chat.groupChat === false){
        return next(new ErrorHandler("This is not a group chat",404))
    }
    if(chat.creator.toString() !== req.user.toString()){
        return next(new ErrorHandler("Only group creator can rename group",401))
    }
    if(chat.name === name){
        return next(new ErrorHandler("Group name is same as before",400))
    }

    chat.name = name

    await chat.save()

    emitEvent(req,REFETCH_CHATS,chat.members)

    return res.status(200).json({
        success:true,
        message:`Group renamed with ${name} successfully`
    })

})

// delete a group chat
const deleteChat = TryCatch(async (req, res, next) => {

    const chatId = req.params.id

    // validation using express validator -middleware
    
    const chat = await Chat.findById(chatId)

    if(!chat){
        return next(new ErrorHandler("Chat not found",404))
    }

    const members = chat.members

    if(chat.groupChat && chat.creator.toString() !== req.user.toString()){
            return next(new ErrorHandler("Only group creator can delete group",401))
    }
    if(!chat.groupChat && !chat.members.includes(req.user.toString())){
        return next(new ErrorHandler("You are not allowed to delete this chat",401))
    }

    // Here we delete all messages as well attachments or files from cloudinary

    const messageWithAttachments = await Message.find({
        chat:chatId,
        attachments:{$exists:true,$ne:[]}
    })

    const public_ids = []

    messageWithAttachments.forEach((message)=>{
        message.attachments.forEach((attachment)=>{
            public_ids.push(attachment.public_id)
        })
    })

    await Promise.all([
        // delete files from cloudinary
        deleteFilesFromCloudinary(public_ids),
        // delete messages
        Message.deleteMany({chat:chatId}),
        // delete chat
        Chat.findByIdAndDelete(chatId)

    ])


    // emit event

    emitEvent(req,REFETCH_CHATS,members)


    return res.status(200).json({
        success:true,
        message:`Chat ${chat.name} deleted successfully`
    })
        
   

})

// get Messages
const getMessages = TryCatch(async (req, res, next) => {
    
    const chatId = req.params.id
    const {page = 1} = req.query
    const result_per_page = 20 // limit
    const skip = (page - 1) * result_per_page

    // validation using express validator -middleware

    const chat = await Chat.findById(chatId)

    if(!chat){
        return next(new ErrorHandler("Chat not found",404))
    }

    if(!chat.members.includes(req.user.toString())){
        return next(new ErrorHandler("You are not allowed to access this chat",401))
    }


    const [messages,totalMessagesCount] = await Promise.all([
         Message.find({chat:chatId})
        .sort({createdAt:-1})
        .skip(skip)
        .limit(result_per_page)
        .populate("sender","name avatar")
        .lean(),
        Message.countDocuments({chat:chatId})
    ])

    // some sort of transformation - inside each messages array sender transformation
    const newMessages = messages.map((message)=>{
        message.sender = {
            _id:message.sender._id,
            name:message.sender.name,
            avatar:message.sender.avatar.url
        }
        return message
    })

    const totalPages = Math.ceil(totalMessagesCount / result_per_page) || 0

    return res.status(200).json({
        success:true,
        messages:newMessages.reverse(),
        totalPages
    })

})

export {
    newGroupChat,
    getMyChats,
    getMyGroups,
    addMembersToGroup,
    removeMemberFromGroup,
    leaveGroup,
    sendAttachments,
    getChatDetails,
    renameGroup,
    deleteChat,
    getMessages

}