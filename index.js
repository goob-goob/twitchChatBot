require('dotenv').config({ path: './config/.env' })
// const socket = require('./controllers/socket')
const parser = require('./lib/parser')

const fs = require('fs')
const fetch = require('node-fetch')
const url = require('url')
// const spotifyApi = new SpotifyWebApi()


let token = ''
let userId = ''
let userName = ''

let spotifyToken = {}



// fs.readFileSync('spotifytoken.txt', 'utf8', (err, data) => {
//     if (err) {
//         console.error('readFile error: ', err);
//         return;
//     }
//     // console.log(data);
//     spotify_token = data
// });

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

client.on('connect', async function (connection) {
    console.log('WebSocket Client Connected');

    await fs.readFile('token.txt', 'utf8', (err, data) => {
        if (err) {
            console.error('readFile error: ', err);
            return;
        }
        // console.log(data);
        token = data
    });

    const checkToken = setInterval(() => {
        if (token !== '') {
            console.log('Token received.')
            clearInterval(checkToken)
            console.log('sending stuff')
            connection.sendUTF('CAP REQ :twitch.tv/commands twitch.tv/tags twitch.tv/membership')
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
                if (parsed.tags) {
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
                        case 'song':
                            console.log('!song command used')
                            const expired = await checkSpotifyTokenIsExpired()
                            console.log(expired)
                            if(expired) {
                                await refreshSpotifyToken()
                            } else {
                                // console.log
                                const currentSongInfo = await getCurrentSpotifySong()
                                console.log(currentSongInfo)
                                const artists = currentSongInfo.artists.map((x) => x.name)
                                if(artists.length > 1) {
                                    connection.sendUTF(`PRIVMSG #g00b_g00b :NOW PLAYING: '${currentSongInfo.name}' by '${artists}'`)
                                } else {
                                    connection.sendUTF(`PRIVMSG #g00b_g00b :NOW PLAYING: '${currentSongInfo.name}' by '${artists}'`)
                                }
                            }


                            break
                    }
                    switch (parsed.command.command) {
                        case 'PING':
                            console.log('parsed.parameters', parsed.parameters)
                            connection.sendUTF(`PONG :${parsed.parameters}`)
                            break
                        case 'JOIN':
                            console.log('JOIIIINNN')
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
                    case '':
                        break;
                }
                // console.log('userId:', userId)
            }
            // }, 100);
        }
    });

    connection.on('close', function () {
        console.log('Connection Closed');
        console.log(`close description: ${connection.closeDescription}`);
        console.log(`close reason code: ${connection.closeReasonCode}`);
    });
});


client.connect('wss://irc-ws.chat.twitch.tv:443');

const port = 3000
const app = require('express')();

app.set('view engine', 'ejs')

const mainRoutes = require('./routes/main')
const authRoutes = require('./routes/auth')
const { default: SpotifyWebApi } = require('spotify-web-api-js')

// app.use('/', mainRoutes)
// app.use('/auth', authRoutes)


let state = ''


app.get('/', (req, res) => {
    // if(req.user) { res.render('folders.ejs', { user: req.user.userName }) }
    res.sendFile('index.html', { root: './' })
})

app.get('/auth', (req, res) => {
    console.log('GET /auth')
    let baseURL = 'https://id.twitch.tv/oauth2/authorize?'
    let pstring = ''
    let params = new URLSearchParams()

    state = generateString(32);

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
        state = ''
        res.redirect('/')
    } else {
        console.log('State string does match server response')
        res.redirect('/')
    }


})

app.get('/spotify/auth', async (req, res) => {
    console.log('GET spotify/auth')

    state = generateString(8)
    console.log(state)

    const endpoint = 'https://accounts.spotify.com/authorize?'

    const p = new URLSearchParams()
    p.append('grant_type', 'client_credentials')
    p.append('client_id', process.env.SPOTIFY_ID)
    // p.append('client_secret', process.env.SPOTIFY_SECRET)
    p.append('response_type', 'code')
    p.append('redirect_uri', 'http://localhost:3000/spotify/auth/callback')
    p.append('state', state)
    p.append('scope', 'user-read-playback-state')

    const params = p.toString()


    res.redirect(endpoint + params)
})

app.get('/spotify/auth/callback', async (req, res) => {
    console.log('GET spotify/auth/callback')

    console.log('state', state)
    console.log('req.state', req.query.state)
    console.log('req.state.slice()', req.query.state.slice(1))
    console.log(req.query)

    const code = req.query.code
    const responseState = req.query.state
    console.log('state', state, typeof state, state.length)
    console.log('responseState', responseState, typeof responseState, responseState.length)
    if (responseState == state) {
        const endpoint = 'https://accounts.spotify.com/api/token?'

        const p = new URLSearchParams()
        p.append('grant_type', 'authorization_code')
        p.append('code', code)
        p.append('redirect_uri', 'http://localhost:3000/spotify/auth/callback')
        const params = p.toString()

        const response = await fetch(endpoint + params, {
            method: 'POST',
            headers: {
                'Authorization': 'Basic ' + (new Buffer.from(process.env.SPOTIFY_ID + ':' + process.env.SPOTIFY_SECRET).toString('base64')),
                'Content-Type': 'application/x-www-form-urlencoded'
            },
            json: true
        })

        const jason = await response.json()
        console.log(jason)
        spotifyToken = {
            accessToken: jason.access_token,
            tokenType: jason.token_tye,
            expiresIn: jason.expires_in,
            refreshToken: jason.refresh_token,
            scope: jason.scope,

            expiration: Date.now() + jason.expires_in
        }

        res.redirect('/')
    } else {
        console.log('State strings do not match')
        res.redirect('/')
    }
})


app.listen(port, () => {
    console.log(`Chatbot server listening on port ${port}`)
})

//





//

function generateString(length) {
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let result = '';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
        result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }

    return result;
}

async function validateToken() {
    console.log('validating')
    if (token !== '') return
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

async function checkSpotifyTokenIsExpired() {
    console.log('checkSpotifyTokenIsExpired()')
    const now = Date.now()
    console.log('spotifyToken.expiration > now', spotifyToken.expiration > now)
    return spotifyToken.expiration > Date.now()
}

async function refreshSpotifyToken() {
    console.log('refreshSpotifyToken()')
    const endpoint = 'https://accounts.spotify.com/api/token?'
    const p = new URLSearchParams()
    p.append('grant_type', 'refresh_token')
    p.append('refresh_token', spotifyToken.refreshToken)

    const params = p.toString()

    const response = await fetch(endpoint + params, {
        method: 'POST',
        headers: {
            'Authorization': 'Basic ' + (new Buffer.from(process.env.SPOTIFY_ID + ':' + process.env.SPOTIFY_SECRET).toString('base64')),
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        json: true
    })

    const jason = await response.json()

    console.log(jason)

    return
}

async function getCurrentSpotifySong() {
    console.log('getCurrentSpotifySong()')

    const endpoint = 'https://api.spotify.com/v1/me/player?'

    const response = await fetch(endpoint, {
        headers: {
            'Authorization': 'Bearer ' + spotifyToken.accessToken
        },
        json: true
    })

    const jason = await response.json()
    console.log(jason)

    console.log(jason.item.artists)
    console.log(jason.item.name)

    const artists = jason.item.artists
    const name = jason.item.name

    return {name, artists}
}