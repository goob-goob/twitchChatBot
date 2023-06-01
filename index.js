require('dotenv').config({ path: './env/.env' })
// const socket = require('./controllers/socket')
const parser = require('./lib/parser')

const fs = require('fs')
const fetch = require('node-fetch')

let token = ''
let userId = ''
let userName = ''

fs.readFile('token.txt', 'utf8', (err, data) => {
    if (err) {
        console.error(err);
        return;
    }
    // console.log(data);
    token = data
});

validateToken()

var WebSocketServer = require('websocket').server;
var WebSocketClient = require('websocket').client;
var WebSocketFrame = require('websocket').frame;
var WebSocketRouter = require('websocket').router;
var W3CWebSocket = require('websocket').w3cwebsocket;

const client = new WebSocketClient()
client.on('connectFailed', function (error) {
    console.log('Connect Error: ' + error.toString());
});

client.on('connect', function (connection) {
    console.log('WebSocket Client Connected');

    const checkToken = setInterval(() => {
        if (token !== '') {
            console.log('Token received.')
            clearInterval(checkToken)
            console.log('sending stuff')
            connection.sendUTF('CAP REQ :twitch.tv/commands twitch.tv/tags')
            connection.sendUTF(`PASS oauth:${token}`)
            connection.sendUTF('NICK g00b_bot');
            connection.sendUTF('JOIN #g00b_g00b')
        }
    }, 2000)


    connection.on('message', async function (message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
            // console.log('also: ', message)
            const parsed = parser(message.utf8Data)
            console.log('parsed', parsed)
            // setTimeout(() => {
            if (parsed) {
                if(parsed.tags) {
                    userId = parsed.tags['user-id']
                    userName = parsed.tags['display-name']
                }
                if (parsed.command) {
                    switch (parsed.command.botCommand) {
                        case 'test':
                            console.log('test bot command')
                            connection.sendUTF('PRIVMSG #g00b_g00b :test command was used')
                            break
                        case 'bot-test':
                            console.log('bot-test command')
                            break
                    }
                }
                switch (parsed.parameters) {
                    // case 'banned word': 
                    //     console.log(`Banning ${userName}`)
                    //     await fetch('https://api.twitch.tv/helix/moderation/bans', {
                    //         headers: {
                    //             'Authorization': `Bearer ${token}`,
                    //             'Client-Id': process.env.CLIENT_ID,
                    //             'Content-Type': 'application/json'
                    //         },
                    //         data: {
                    //             'user_id': userId,
                    //             'reason': 'Because it\'s fun'
                    //         }
                    //     })
                }
                // console.log('userId:', userId)
            }
            // }, 100);
        }
    });
});

client.connect('wss://irc-ws.chat.twitch.tv:443');

const port = 3000
const app = require('express')();

app.set('view engine', 'ejs')

const mainRoutes = require('./routes/main')
const authRoutes = require('./routes/auth')

// app.use('/', mainRoutes)
// app.use('/auth', authRoutes)



const state = generateString(32);

app.get('/', (req, res) => {
    // if(req.user) { res.render('folders.ejs', { user: req.user.userName }) }
    res.sendFile('index.html', { root: './' })
})

app.get('/auth', (req, res) => {
    let baseURL = 'https://id.twitch.tv/oauth2/authorize?'
    let pstring = ''
    let params = new URLSearchParams()
    params.set('client_id', process.env.CLIENT_ID)
    params.set('redirect_uri', 'http://localhost:3000/auth/callback')
    params.set('response_type', 'code')
    params.set('scope', 'chat:read chat:edit moderation:read')
    params.set('state', state)

    pstring = params.toString()
    // console.log(baseURL + pstring)

    res.redirect(baseURL + pstring)
})
app.get('/auth/callback', async (req, res) => {
    console.log('GET /auth/callback')
    // console.log(req)
    console.log(req.query)
    const responseState = req.query.state
    const code = req.query.code

    const endpoint = 'https://id.twitch.tv/oauth2/token?'
    const search = `client_id=${process.env.CLIENT_ID}&` +
        `client_secret=${process.env.CLIENT_SECRET}&` +
        `grant_type=authorization_code&` +
        `code=${code}&` +
        `redirect_uri=http://localhost:3000/auth/callback`

    if (state === responseState) {

        const response = await fetch(endpoint + search, {
            method: 'POST',
        })
        const data = await response.json()
        // console.log('authentication response: ', data)

        token = data.access_token
        // console.log(token)

        const content = `${token}`;

        try {
            fs.writeFileSync('token.txt', content);
            // file written successfully
        } catch (err) {
            console.error(err);
        }

        res.redirect('/')
    } else {
        console.log('State string does match server response')
        return
    }


})


app.listen(port, () => {
    console.log(`Chatbot server listening on port ${port}`)
})

//

function generateString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = ' ';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

async function validateToken() {
    console.log('validating')
    const endpoint = 'https://id.twitch.tv/oauth2/validate'

    const response = await fetch(endpoint, {
        method: 'GET',
        headers: {
            'Bearer': `OAuth ${token}`
        }
    })
    console.log('validation: ', response)

    setInterval(async () => {
        const response = await fetch(endpoint, {
            headers: {
                'Bearer': `OAuth ${token}`
            }
        })
        console.log('validation: ', response)
    }, 3600000)
}