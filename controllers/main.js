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


    sendMessage:  async (req, res) => {
    try {
        const { senderId, receiverId, text, senderUsername,receiverUsername, timestamp } = req.body;

        // Fetch the sender and receiver from the database using their IDs
        const sender = await User.findById(senderId);
        const receiver = await User.findById(receiverId);

        // Create a new message
        const newMessage = new MessagesSchema({
            senderId,
            receiverId,
            senderUsername,
            receiverUsername,
            text,
            receiverImage: receiver?.image, // Get the receiver's image
            senderImage: sender?.image, // Get the sender's image
            timestamp: timestamp || new Date().toISOString(),
        });

        // Save the new message to the database
        const savedMessage = await newMessage.save();

        // Now that you have the receiver object, check if the receiver is online
        // const userOnline = usersOnline.userIsOnline(receiverUsername);
        // console.log('USER ONLINE', userOnline)
        // if (userOnline) {
        //     const currentUser = usersOnline.getUser(receiverUsername);
        //     console.log('Receiver Username:', receiverUsername)
        //     ;console.log(currentUser)
        //     console.log(`Emitting message to: ${currentUser.username}`);
        //     io.to(currentUser.username).emit("message", newMessage);
        //
        //
        // } else {
        //     console.log("User not online, cannot emit message.");
        // }

        // Return the saved message as a response
        res.status(201).json({ success: true, message: savedMessage });
        console.log(savedMessage);
    } catch (err) {
        // Handle any errors that occur during the process
        res.status(500).json({ success: false, message: "Error saving message", error: err.message });
    }
},