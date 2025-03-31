const express = require('express')
const router = express.Router()

const {
    login, register,
    create, allPosts, singlePost, deletePost, likePost, favorites,
    singleUser, singleUserPosts,
    myProfile, userUpdate, changePassword,
    comment, deleteComment,
    getMessages, getUsers, deleteUser,


} = require("../controllers/mainControllers")

const {
    validateRegister,
    validateLogin
} = require("../midleware/validators")

const userAuth = require("../midleware/userAuth")

router.post("/register", validateRegister, register)
router.post("/login", validateLogin, login)
router.post("/create", userAuth, create)
router.get("/allposts", allPosts);
router.get("/posts/:postId", singlePost);
router.delete("/deletePost/:id", userAuth, deletePost);
router.post('/posts/like/:postId', userAuth, likePost);
router.post('/posts/favorites', favorites);
router.get("/users/:username", userAuth, singleUser);
router.get('/posts/users/:username', userAuth, singleUserPosts);
router.get("/profile/:id", userAuth, myProfile);
router.post("/profile/update", userAuth , userUpdate);
router.post("/profile/change-password", userAuth, changePassword);
router.post("/posts/:postId/comments", userAuth, comment);
router.delete('/post/:postId/comment/:commentId', deleteComment);
router.get('/messages/mymessages/:receiverId', userAuth, getMessages);
router.get('/users', userAuth, getUsers)
router.delete('/users/delete/:userId', deleteUser)






module.exports = router