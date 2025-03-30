const mongoose = require("mongoose");  // ✅ Correct import
const { Schema } = mongoose;  // ✅ Extract Schema properly

const postSchema = new Schema({
    username: {
        type: String,
        required: true,
    },
    description: {
        type: String,
        required: true,
    },
    title: {
        type: String,
        required: true,
    },
    time: {
        type: String,
        default: new Date().toLocaleString("en-GB"),
    },
    postImage: {
        type: String,
        default: 'https://thumb.ac-illust.com/b1/b170870007dfa419295d949814474ab2_t.jpeg',
    },
    likedBy: [{
        type: String,
    }],
    comments: [
        {
            commentId: { type: String, default: () => new mongoose.Types.ObjectId().toString() },
            username: { type: String, required: true },
            message: { type: String, required: true },
            time: { type: String, default: new Date().toLocaleString("en-GB") },
            userImage: { type: String, default: 'https://www.shutterstock.com/image-vector/user-profile-icon-vector-avatar-600nw-2247726673.jpg' }, // Default user image
        }
    ],
});

const Post = mongoose.model("Post", postSchema);

module.exports = Post;
