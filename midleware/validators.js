const validator = require("email-validator");

module.exports = {
    validateRegister: (req, res, next) => {
        const { email, username, password } = req.body;

        if (username.length < 4 || username.length > 20) return res.send({ error: true, message: "Incorrect username. Please try again." });
        if (password.length < 4 || password.length > 20) return res.send({ error: true, message: "Incorrect password. Please try again." });

        if (!validator.validate(email)) return res.send({ error: true, message: "Incorrect email." });

        next();
    },
    validateLogin: (req, res, next) => {
        const { username, password } = req.body;

        if (username.length < 4 || username.length > 20) return res.send({ error: true, message: "Incorrect username. Please try again." });
        if (password.length < 4 || password.length > 20) return res.send({ error: true, message: "Incorrect password. Please try again." });

        next();
    },


};