import express from "express"
import { isAuthenticated } from "../middlewares/auth.js"
import { addMembersToGroup, deleteChat, getChatDetails, getMessages, getMyChats, getMyGroups, leaveGroup, newGroupChat, removeMemberFromGroup, renameGroup, sendAttachments } from "../controllers/chat.js"
import { attachmentsMulter } from "../middlewares/multer.js"
import { addMembersToGroupValidator, deleteChatValidator, getChatDetailsValidator, getMessagesValidator, leaveGroupValidator, newGroupChatValidator, removeMemberFromGroupValidator, renameGroupValidator, sendAttachmentsValidator, validateHandler } from "../lib/validators.js"

const app = express.Router()

// After here user must be logged in to access this routes


app.post("/new",isAuthenticated,newGroupChatValidator(),validateHandler,newGroupChat)
app.get("/my",isAuthenticated,getMyChats)
app.get("/my/groups",isAuthenticated,getMyGroups)
app.put("/addMembers",isAuthenticated,addMembersToGroupValidator(),validateHandler,addMembersToGroup)
app.put("/removeMember",isAuthenticated,removeMemberFromGroupValidator(),validateHandler,removeMemberFromGroup)
app.delete("/leave/:id",isAuthenticated,leaveGroupValidator(),validateHandler,leaveGroup)

// send attachments
app.post("/message",isAuthenticated,attachmentsMulter,sendAttachmentsValidator(),validateHandler,sendAttachments)

// get messages
app.get("/messages/:id",isAuthenticated,getMessagesValidator(),validateHandler,getMessages)

// Get chat details ,rename, delete
app.get("/:id",isAuthenticated,getChatDetailsValidator(),validateHandler,getChatDetails)
app.put("/:id",isAuthenticated,renameGroupValidator(),validateHandler,renameGroup)
app.delete("/:id",isAuthenticated,deleteChatValidator(),validateHandler,deleteChat)



export default app