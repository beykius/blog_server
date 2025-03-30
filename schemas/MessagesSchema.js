const mongoose = require("mongoose");
const { Schema } = mongoose;

const messagesSchema = new Schema({
    senderId: { type: String, required: true },
    senderUsername: { type: String, required: true },
    senderImage: { type: String, required: false, },
    receiverId: { type: String, required: true },
    receiverImage: { type: String, required: false },
    receiverUsername: { type: String, required: true },
    text: { type: String, required: true },
    timestamp: { type: String, default: new Date().toLocaleString("en-GB") }
});

module.exports = mongoose.model("Message", messagesSchema);