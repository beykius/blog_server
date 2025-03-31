const {Server} = require("socket.io");
const usersOnline = require("../modules/usersOnline");
const User = require("../schemas/userScheme");
const MessagesSchema = require("../schemas/MessagesSchema");

const io = new Server({
    cors: {
        origin: "*"
    }
});

const users = new Map();

io.on("connection", (socket) => {
    console.log("A user connected:", socket.id);

    socket.on("login", async (username, userId) => {
        if (users.has(userId)) return; // no duplicates
        const user = {username, id: socket.id, userId};
        usersOnline.addUser(user);
        users.set(userId, socket.id);
        await User.updateOne({_id: userId}, {$set: {online: true}});
        io.emit("allUsers", usersOnline.getUsers());
    });

    // User logout
    socket.on("userOffline", async (userId) => {
        console.log(`User ${userId} is logging out`);

        users.delete(userId);
        usersOnline.removeUser(socket.id);
        await User.updateOne({_id: userId}, {$set: {online: false}});
        io.emit("allUsers", usersOnline.getUsers());
    });

    // Handle user disconnection (auto logout)
    socket.on("disconnect", async () => {
        let disconnectedUserId = null;

        users.forEach((socketId, userId) => {
            if (socketId === socket.id) {
                disconnectedUserId = userId;
                users.delete(userId);
            }
        });

        if (disconnectedUserId) {
            console.log(`User ${disconnectedUserId} disconnected`);

            usersOnline.removeUser(socket.id);
            await User.updateOne({_id: disconnectedUserId}, {$set: {online: false}});
            io.emit("allUsers", usersOnline.getUsers());
        }
    });

    socket.on("sendMessage", async (newMessage) => {
        const savedMessage = new MessagesSchema(newMessage);
        await savedMessage.save();

        const completeMessage = {...newMessage, _id: savedMessage._id};

        io.to(socket.id).emit("messageStatus", {
            success: true,
            message: completeMessage,
        });

        const receiverSocketId = users.get(newMessage.receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", completeMessage);
        }

        io.to(socket.id).emit("newMessage", completeMessage);

    });

    socket.on("deleteMessage", async ({messageId}) => {
        const deletedMessage = await MessagesSchema.findByIdAndDelete(messageId);
        if (deletedMessage) {
            io.emit("messageDeleted", {messageId});
        }
    });


});


module.exports = io;

