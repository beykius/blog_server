const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const mongoose = require("mongoose");
const {v4: uuidv4} = require("uuid");
const User = require("../schemas/userScheme");
const PostSchema = require("../schemas/postSchema");
const MessagesSchema = require("../schemas/MessagesSchema");
const usersOnline = require("../modules/usersOnline");
const io = require("../modules/sockets")


module.exports = {
    register: async (req, res) => {
        const {username, password, email} = req.body

        const userExists = await User.findOne({username})

        console.log(userExists)
        if (userExists) {
            return res.status(400).send({message: "User already exists"});
        }

        const emailExists = await User.findOne({email});
        if (emailExists) {
            return res.status(400).send({message: "Email is already registered"});
        }

        const salt = await bcrypt.genSalt(5)
        const hash = await bcrypt.hash(password, salt)

        const user = {
            username,
            password: hash,
            email,
        }

        const newUser = new User(user)
        await newUser.save()

        res.send({success: "Registration succesful"})
    },

    login: async (req, res) => {
        const {username, password} = req.body
        const myUser = await User.findOne({username})


        if (!myUser) return res.send({success: false, message: "User does not exist. Try different username."})

        const samePassword = await bcrypt.compare(password, myUser.password)

        if (!samePassword) return res.send({success: false, message: "Password incorrect."})

        let user = {
            username: myUser.username,
            _id: myUser._id,
            online: true,
        }

        const token = jwt.sign(user, process.env.SECRET_KEY)
        return res.send({
            success: true,
            token,
            image: myUser.image,
            id: myUser._id,
            online: true,
        })
    },

    create: async (req, res) => {
        console.log("Received POST request:", req.body);

        const {title, description, postImage, user, time, likedBy} = req.body;

        // Check if the user is authenticated
        if (!user) {
            return res.status(401).send({success: false, message: "User not authenticated"});
        }

        if (!title || !description) {
            return res.status(400).json({success: false, message: "Title and description are required!"});
        }

        // Create a new post instance
        const newPost = new PostSchema({
            title,
            description,
            postImage: postImage || 'https://thumb.ac-illust.com/b1/b170870007dfa419295d949814474ab2_t.jpeg',
            username: user.username,
            time,
            likedBy,
        });

        await newPost.save();

        return res.send({success: true, message: "Post created successfully", post: newPost});
    },

    allPosts: async (req, res) => {
        const posts = await PostSchema.find();
        res.send({success: true, posts});
    },

    singlePost: async (req, res) => {
        const {postId} = req.params;
        try {
            const post = await PostSchema.findById(postId);
            if (post) {
                res.json({success: true, post});
            } else {
                res.status(404).json({success: false, message: "Post not found"});
            }
        } catch (err) {
            res.status(500).json({success: false, message: "Error fetching post", error: err});
        }
    },

    deletePost: async (req, res) => {
        const id = req.params.id
        await PostSchema.findOneAndDelete({_id: id})
        const posts = await PostSchema.find();
        res.send({success: true, posts});
    },

    favorites: async (req, res) => {
        const {user} = req.body;

        const favoritePosts = await PostSchema.find({likedBy: user._id});

        if (!favoritePosts.length) {
            return res.status(200).json({success: true, message: "No favorite posts yet.", favorites: []});
        }

        return res.json({
            success: true,
            message: "Favorites fetched successfully",
            favorites: favoritePosts,
        });

    },

    likePost: async (req, res) => {
        const {postId} = req.params;
        const {user} = req.body; // user._id should be sent in the request body


        const postItem = await PostSchema.findById(postId);
        if (!postItem) {
            return res.status(404).json({success: false, message: "Post not found"});
        }

        if (!user || !user._id || !user.username) {
            return res.status(400).json({success: false, message: "Invalid user data"});
        }

        const userHasLiked = postItem.likedBy.includes(user._id);
        if (userHasLiked) {
            postItem.likedBy = postItem.likedBy.filter(id => id.toString() !== user._id.toString());
        } else {
            postItem.likedBy.push(user._id);
        }

        await postItem.save();
        return res.json({success: true, message: "Like toggled", post: postItem});

    },

    singleUser: (req, res) => {
        const {username} = req.params;  // Get username from URL parameters
        User.findOne({username: username})  // Search by username
            .then(user => {
                if (user) {
                    return res.json({success: true, user});
                } else {
                    return res.status(404).json({success: false, message: "User not found"});
                }
            })
    },

    singleUserPosts: async (req, res) => {
        const {username} = req.params;
        console.log("Fetching posts for username:", username);

        // Ensure MongoDB searches by `author.username`
        const posts = await PostSchema.find({username: username});

        if (!posts || posts.length === 0) {
            return res.status(404).send({success: false, message: "No posts found for this username"});
        }

        console.log("Found posts:", posts);
        res.send({success: true, posts});

    },

    myProfile: async (req, res) => {
        const user = await User.findById(req.params.id).select("-password");
        if (!user) return res.status(404).json({success: false, message: "User not found"});
        res.json({success: true, user});
    },

    userUpdate: async (req, res) => {
        const {userId, username, image} = req.body;

        const oldUser = await User.findById(userId);
        if (!oldUser) return res.status(404).json({success: false, message: "User not found"});

        const oldImage = oldUser.image;
        let oldUsername = oldUser.username;

        if (username) {
            const existingUser = await User.findOne({username});
            if (existingUser) return res.status(400).json({success: false, message: "Username already exists"});
        }

        // Update image and username
        const updatedUser = await User.findByIdAndUpdate(userId,
            {
                ...(image && {image}),  // If image is provided, set the image field
                ...(username && {username})  // If username is provided, set the username field
            },
            {new: true}
        );

        // Update username in posts
        if (oldUsername !== updatedUser.username) {
            await PostSchema.updateMany({username: oldUsername}, {username: updatedUser.username});
        }

        //Update username in comments
        if (oldUsername !== updatedUser.username) {
            await PostSchema.updateMany(
                {'comments.username': oldUsername},
                {$set: {'comments.$[elem].username': updatedUser.username}},
                {arrayFilters: [{'elem.username': oldUsername}]}
            );
        }

        // Update comments with the new image
        if (updatedUser.image && oldImage !== updatedUser.image) {
            await PostSchema.updateMany(
                {'comments.username': updatedUser.username},
                {$set: {'comments.$[elem].userImage': updatedUser.image}},
                {
                    arrayFilters: [{'elem.username': updatedUser.username}]
                }
            );
        }

        // Update messages with the new image
        if (updatedUser.image && oldImage !== updatedUser.image) {
            await MessagesSchema.updateMany(
                { 'senderUsername': updatedUser.username },
                { $set: { 'senderImage': updatedUser.image } }
            );
        }

        res.json({success: true, user: updatedUser, logout: !!username});
    },

    changePassword: async (req, res) => {

        const {userId, oldPassword, newPassword, confirmPassword} = req.body;

        if (newPassword !== confirmPassword) {
            return res.json({success: false, message: "Passwords do not match"});
        }

        const user = await User.findById(userId);
        if (!user) {
            return res.json({success: false, message: "User not found"});
        }

        const validPassword = await bcrypt.compare(oldPassword, user.password);
        if (!validPassword) {
            return res.json({success: false, message: "Incorrect old password"});
        }

        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(newPassword, salt);

        user.password = hashedPassword;

        // Skip email validation
        await user.save({validateBeforeSave: false});
        res.json({success: true, message: "Password changed successfully"});
    },

    comment: async (req, res) => {
        const {postId} = req.params;
        const {username, message} = req.body;

        const user = await User.findOne({username});

        const post = await PostSchema.findById(postId);
        if (!post) {
            return res.status(404).json({success: false, message: "Post not found"});
        }

        const newComment = {
            username,
            message,
            commentId: new mongoose.Types.ObjectId().toString(),
            time: new Date().toLocaleString("en-GB"),
            userImage: user.image,
        };

        post.comments.push(newComment);
        await post.save();

        res.json({success: true, comment: newComment});
    },

    deleteComment: async (req, res) => {
        const {postId, commentId} = req.params;

        const post = await PostSchema.findOneAndUpdate(
            {_id: postId},
            {$pull: {comments: {commentId}}},  // Remove the comment with the specified commentId
            {new: true}  // Return the updated post
        );

        if (!post) {
            return res.status(404).json({success: false, message: "Post or comment not found"});
        }

        res.json({success: true, post});
    },

    getUsers: async (req, res) => {

            const online = usersOnline.getUsers();
            console.log("Online Users:", online);


            const users = await User.find({}, { password: 0 });
            console.log("Fetched Users:", users);

            const items = [];

            users.forEach(item => {
                const current = {
                    username: item.username,
                    _id: item._id,  // MongoDB _id for user identification
                    image: item.image,
                    online: usersOnline.userIsOnline(item.username)
                };
                items.push(current);
            });

            res.send({ success: true, users: items });

    },



    getMessages: async (req, res) => {
        const { senderId } = req.query; // senderId from query parameters
        const { receiverId } = req.params; // receiverId from route parameter

        if (!senderId || !receiverId) {
            return res.status(400).send({ message: "Missing sender or receiver ID" });
        }

        try {
            const messages = await MessagesSchema.find({
                $or: [
                    { senderId, receiverId },
                    { senderId: receiverId, receiverId: senderId }
                ]
            }).sort({ timestamp: 1 });

            return res.json({ success: true, messages });
        } catch (err) {
            console.error("Error fetching messages:", err);
            return res.status(500).json({ success: false, message: "Failed to fetch messages", error: err });
        }
    },

    deleteMessage: async (req, res) => {

            const { messageId } = req.params;

            const message = await MessagesSchema.findByIdAndDelete(messageId);

            if (!message) {
                return res.status(404).json({ success: false, message: "Message not found" });
            }

            res.json({ success: true, message: "Message deleted successfully" });
    },

    deleteUser: async (req, res) => {
        try {

            const userId = req.params.userId; // Get userId from URL parameter
            const user = await User.findById(userId);
            if (!user) return res.status(404).json({ success: false, message: "User not found" });

            await User.findByIdAndDelete(userId);
            res.json({ success: true, message: "Profile deleted successfully" });
        } catch (error) {
            console.error(error);
            res.status(500).json({ success: false, message: "Server error" });
        }
    },





}