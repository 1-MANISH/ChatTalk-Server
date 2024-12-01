
import { body , validationResult, param, query} from "express-validator"
import { ErrorHandler } from "../utils/utility.js";


const validateHandler = (req,res,next) => {

    const errors = validationResult(req)
    const errorMessages = errors.array().map((error) => error.msg).join(", ")
    if(!errors.isEmpty()){
        next(new ErrorHandler(errorMessages,400))
    }
    next()
}
const registerValidator = () => {
    return [
        body("name").notEmpty().withMessage("Name is required"),
        body("username").notEmpty().withMessage("Username is required"),
        body("password").notEmpty().withMessage("Password is required"),
        body("bio").notEmpty().withMessage("Bio is required"),
    ]
}
const loginValidator = () => {
    return [
        body("username").notEmpty().withMessage("Username is required"),
        body("password").notEmpty().withMessage("Password is required")
    ]
}

const newGroupChatValidator = () => {
    
    return [
        body("name").notEmpty().withMessage("Group name is required"),
        body("members").notEmpty().withMessage("Please provide members").isArray({min:2,max:100}).withMessage("Members must be at least 2 and at most 100"),
    ]
}

const addMembersToGroupValidator = () => {
    return [
        body("chatId").notEmpty().withMessage("Chat id is required"),
        body("members").notEmpty().withMessage("Please provide members").isArray({min:1,max:97}).withMessage("Members must be at least 1 and at most 97 members"),
    ]
}

const removeMemberFromGroupValidator = () => {
    return [
        body("userId").notEmpty().withMessage("User id is required"),
        body("chatId").notEmpty().withMessage("Chat id is required"),
    ]
}

const leaveGroupValidator = () => {
    return [
        param("id").notEmpty().withMessage("Chat id is required"),
    ]
}

const sendAttachmentsValidator = () => {
    return [
        body("chatId").notEmpty().withMessage("Chat id is required"),
    ]
}

const getMessagesValidator = () => {
    return [
        param("id").notEmpty().withMessage("Chat id is required"),
        query("page").optional().isNumeric().withMessage("Page must be a number")
    ]
}

const getChatDetailsValidator = () => {
    return [
        param("id").notEmpty().withMessage("Chat id is required"),
        query("populate").optional().isBoolean().withMessage("Populate must be a boolean [true,false]")
    ]
}

const renameGroupValidator = () => {
    return [
        param("id").notEmpty().withMessage("Chat id is required"),
        body("name").notEmpty().withMessage("Group name is required")
    ]
}

const deleteChatValidator = () => {
    return [
        param("id").notEmpty().withMessage("Chat id is required")
    ]
}

const sendRequestValidator = ()=>{
    return [
        body("userId").notEmpty().withMessage("User id is required")
    ]
}
const acceptRequestValidator = ()=>{
    return [
        body("requestId").notEmpty().withMessage("Request id is required"),
        body("accept").notEmpty().withMessage("Please add accept").isBoolean().withMessage("Accept must be boolean"),
    ]
}

const adminLoginValidator = () => {
    return [
        body("secretKey").notEmpty().withMessage("Secret key is required")
    ]
}
export {
    validateHandler,
    registerValidator,
    loginValidator,
    newGroupChatValidator,
    addMembersToGroupValidator,
    removeMemberFromGroupValidator,
    leaveGroupValidator,
    sendAttachmentsValidator,
    getMessagesValidator,
    getChatDetailsValidator,
    renameGroupValidator,
    deleteChatValidator,
    sendRequestValidator,
    acceptRequestValidator,
    adminLoginValidator
  
}