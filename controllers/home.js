const path = require('node:path')

module.exports = {
    getIndex: (req, res) => {
        // if(req.user) { res.render('folders.ejs', { user: req.user.userName }) }
        res.sendFile('index.html', { root: './'})
    }
}