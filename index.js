require('dotenv').config({ path: './env/.env' })
// const socket = require('./controllers/socket')
const parser = require('./lib/parser')

const fs = require('fs')
const fetch = require('node-fetch')

let token = ''

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
    // console.log(authController.token === '')
    // console.log('token: ', token)
    // Send CAP (optional), PASS, and NICK messages

    const checkToken = setInterval(() => {
        // console.log(token)
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


    connection.on('message', function (message) {
        if (message.type === 'utf8') {
            console.log("Received: '" + message.utf8Data + "'");
            // console.log('also: ', message)
            console.log(parser(message.utf8Data))
            const parsed = parser(message.utf8Data)
            console.log(parsed.command)
            if(parsed.command.botCommand) {
                switch (parsed.command.botCommand) {
                    case 'test': 
                    console.log('test bot command')
                    case 'bot-test':
                    console.log('bot-test command')
                }
            }
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
    res.sendFile('index.html', { root: './'})
})

app.get('/auth', (req, res) => {
    let baseURL = 'https://id.twitch.tv/oauth2/authorize?'
    let pstring = ''
    let params = new URLSearchParams()
    params.set('client_id', process.env.CLIENT_ID)
    params.set('redirect_uri', 'http://localhost:3000/auth/callback')
    params.set('response_type', 'code')
    params.set('scope', 'chat:read')
    params.set('state', state)

    pstring = params.toString()
    // console.log(baseURL + pstring)

    res.redirect(baseURL + pstring)
})
app.get('/auth/callback', async (req, res) => {
    console.log('GET /auth/callback')

    // console.log(req.query)
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

    // console.log(data)

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
        headers: {
            'Authorization': `OAuth ${token}`
        }
    })
    console.log('validation: ', response)

    setInterval(async () => {
        const response = await fetch(endpoint, {
            headers: {
                'Authorization': `OAuth ${token}`
            }
        })
        console.log('validation: ', response)
    }, 3600000)
}