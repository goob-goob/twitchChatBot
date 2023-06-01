// const { application } = require('express')
const path = require('node:path')
const fetch = require('node-fetch')
const state = generateString(32);

let token = require('../index')

function generateString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = ' ';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

module.exports = {
    getIndex: (req, res) => {
        let baseURL = 'https://id.twitch.tv/oauth2/authorize?'
        let pstring = ''
        let params = new URLSearchParams()
        params.set('client_id', process.env.CLIENT_ID)
        params.set('redirect_uri', 'http://localhost:3000/auth/callback')
        params.set('response_type', 'code')
        params.set('scope', 'channel:manage:raids')
        params.set('state', state)

        pstring = params.toString()
        console.log(baseURL + pstring)

        res.redirect(baseURL + pstring)
    },
    getCallback: async (req, res) => {
        console.log('GET /auth/callback')

        console.log(req.query)
        const code = req.query.code

        const endpoint = 'https://id.twitch.tv/oauth2/token?'
        const search = `client_id=${process.env.CLIENT_ID}&` +
            `client_secret=${process.env.CLIENT_SECRET}&` +
            `grant_type=authorization_code&` +
            `code=${code}&` +
            `redirect_uri=http://localhost:3000/auth/callback`

        const response = await fetch(endpoint + search, {
            method: 'POST',
        })
        const data = await response.json()

        console.log(data)

        this.token = data.access_token
        token = data.access_token
        console.log(token)
        
        console.log('this.token ', this.token)

        res.redirect('/')
    },
    token: ''
}