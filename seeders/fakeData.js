import {User} from "../models/user.js"
import {faker, simpleFaker} from "@faker-js/faker"
import { Chat } from "../models/chat.js"
import { Message } from "../models/message.js"

const createUser = async (numberOfUsers) => {
    try {

        const userPromise = []

        for(let i = 0; i < numberOfUsers; i++){

            const tempUser = User.create({
                name:faker.person.fullName(),
                username:faker.internet.userName(),
                password:"fakepassword",
                bio:faker.lorem.sentence(10),
                avatar:{
                    url:faker.image.avatar(),
                    public_id:faker.system.fileName()
                }

            })
            userPromise.push(tempUser)
        }

        await Promise.all(userPromise)
        console.log("Fake users created",numberOfUsers);
        process.exit(1)
        
        
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}

const createSingleChats = async(numberOfChats) => {
    try {
        const users  =await User.find().select("_id")

        const chatPromise = []

        for(let i = 0; i < numberOfChats; i++){
            for(let j = i+1; j < users.length; j++){
                chatPromise.push(
                    Chat.create({
                        name:faker.lorem.words(2),
                        members:[users[i],users[j]]
                    })
                )
            }
        }

        await Promise.all(chatPromise)
        console.log("Fake single chats created",numberOfChats);
        process.exit(1)

    } catch (error) {
        console.log(error)
        process.exit(1)
        
    }

}

const createGroupChats = async(numberOfChats) => {
    try {

        const users  =await User.find().select("_id")

        const chatPromise = []

        for(let i = 0; i < numberOfChats; i++){
            const numberOfMembers = simpleFaker.number.int({min:3,max:users.length})
            const members = []
            for(let j = 0; j < numberOfMembers; j++){
                const randomIndex = Math.floor(Math.random() * users.length)
                const randomUser = users[randomIndex]

                // ensure same user is not added twice
                if(!members.includes(randomUser)){
                    members.push(randomUser)
                }
            }
            const chat = Chat.create({
                name:faker.lorem.words(2),
                groupChat:true,
                creator:users[i],
                members
            })

            chatPromise.push(chat)
        }

        await Promise.all(chatPromise)
        console.log("Fake group chats created",numberOfChats);
        process.exit(1)
        
    } catch (error) {
        console.log(error)
        process.exit(1)
    }
}

const createMessages = async(numberOfMessages) => {
    try {
        const users = await User.find().select("_id")
        const chats = await Chat.find().select("_id")

        const messagesPromise = []

        for(let i = 0; i < numberOfMessages; i++){
            const randomUser = users[Math.floor(Math.random() * users.length)]
            const randomChat = chats[Math.floor(Math.random() * chats.length)]

            messagesPromise.push(
                Message.create({
                    chat:randomChat,
                    sender:randomUser,
                    content:faker.lorem.sentence(),
                })
            )
        }

        await Promise.all(messagesPromise)
        console.log("Fake messages created",numberOfMessages);
        process.exit(1)
        
    } catch (error) {
        console.log(error)
        process.exit(1)
        
    }
}

const createMessagesInChat = async(chatId,numberOfMessages) => {
    try {
        const users = await User.find().select("_id")
        const messagesPromise = []

        for(let i = 0; i < numberOfMessages; i++){
            const randomUser = users[Math.floor(Math.random() * users.length)]

            messagesPromise.push(
                Message.create({
                    chat:chatId,
                    sender:randomUser,
                    content:faker.lorem.sentence(),
                })
            )
        }

        await Promise.all(messagesPromise)
        console.log("Fake messages created",numberOfMessages);
        process.exit(1)
        
    } catch (error) {
        console.log(error)
        process.exit(1)
        
    }
}

export {
    createUser,
    createSingleChats,
    createGroupChats,
    createMessages,
    createMessagesInChat
}
