const jwt = require('jsonwebtoken');

module.exports = (req, res, next) => {
    const userToken = req.headers.authorization;

    if (!userToken || !userToken.startsWith("Bearer ")) {
        return res.status(401).send({ success: false, message: "No token provided" });
    }

    const token = userToken.split(" ")[1];

    jwt.verify(token, process.env.SECRET_KEY, (err, decodedUser) => {
        if (err) {
            return res.status(401).send({ success: false, message: "Unauthorized" });
        }
        if (!decodedUser) {
            return res.status(401).send({ success: false, message: "Invalid token" });
        }

        req.body.user = decodedUser;
        next();
    });
};
