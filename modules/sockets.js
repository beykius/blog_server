const { Server } = require("socket.io");
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
        if (users.has(userId)) return; // Prevent duplicate connections

        const user = { username, id: socket.id, userId };
        console.log("User logged in:", user);
        usersOnline.addUser(user);
        users.set(userId, socket.id);

        // Update the database before emitting
        await User.updateOne({ _id: userId }, { $set: { online: true } });

        // Emit after database update
        io.emit("allUsers", usersOnline.getUsers());
    });

    // Handle user logout (userOffline event)
    socket.on("userOffline", async (userId) => {
        console.log(`User ${userId} is logging out`);

        users.delete(userId);

        usersOnline.removeUser(socket.id);

        // Update the database before emitting
        await User.updateOne({ _id: userId }, { $set: { online: false } });

        // Emit after database update
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

            // Update the database before emitting
            await User.updateOne({ _id: disconnectedUserId }, { $set: { online: false } });

            // Emit after database update
            io.emit("allUsers", usersOnline.getUsers());
        }
    });

    socket.on("sendMessage", async (newMessage) => {
        console.log("Received new message:", newMessage);
        const savedMessage = new MessagesSchema(newMessage);
        await savedMessage.save();

        io.to(socket.id).emit("messageStatus", {
            success: true,
            message: savedMessage,
        });

        const receiverSocketId = users.get(newMessage.receiverId);
        if (receiverSocketId) {
            io.to(receiverSocketId).emit("newMessage", newMessage); // Emit to the receiver
        }

        // Emit the new message to the sender
        io.to(socket.id).emit("newMessage", newMessage); // Emit to the sender
    });


});


module.exports = io;

