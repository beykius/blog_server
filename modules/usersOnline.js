let users = []

module.exports = {
    addUser: (user) => {
        users.push(user)
        return users
    },
    getUsers: () => {
        return users
    },
    getUser: (username) => {
        return users.find(x => x.username === username);
    },
    userIsOnline: (username) => {
        const foundUser = users.find(x => x.username === username)
        return !!foundUser
    },
    removeUser: (socket_id) => {
        users = users.filter(x => x.id !== socket_id)
    }
}