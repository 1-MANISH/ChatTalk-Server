import { userSocketIDS } from "../app.js"


const getOtherMember = (members,userId) => {
    return members.find((member)=>{
        return member._id.toString() !== userId.toString()
    })
}

// socket related stuff
const getSockets =(users=[])=>{
    const sockets = users.map((userId)=>{
        return userSocketIDS.get(userId.toString())
    })
    return sockets
}

const getBase64Image = (file) => {
    return `data:${file.mimetype};base64,${file.buffer.toString('base64')}`
}
export {
    getOtherMember,
    getSockets,
    getBase64Image
}