// npm packages requires
const express = require('express')
var app = express()
var http = require('http').Server(app)
var io = require('socket.io')(http)
// local requires
const GameServer = require('./gameServer.js')
const constants = require('./constants.js')
// const engine = require('./engine.js')

const game = new GameServer()
// rooting to public folder
app.use(express.static('public'))

// socket connection handling
io.on('connection', function (socket) {
  console.log(`${socket.id} connected`)

  // Initialise a new player on a random position
  let randX = Math.random() * constants.MAP_BOUNDARIES.x
  let randY = Math.random() * constants.MAP_BOUNDARIES.y

  game.onPlayerConnected(socket.id, randX, randY)

  // We prompt for the usernmae on the client side
  socket.emit('player:getusername')

  // ping calculus
  socket.on('game:ping', () => {
    socket.emit('game:pong', Date.now())
  })

  socket.on('player:setusername', (username) => {
    game.players[socket.id].username = username
    // Once the username is set, the game can begin
    socket.emit('game:init', game.players, socket.id)
    socket.broadcast.emit('game.players:update', game.players)
  })

  socket.on('player:move', (inputs) => {
    game.onPlayerMoved(socket.id, inputs)
    io.sockets.emit('player:update', game.players[socket.id])
  })

  socket.on('disconnect', () => {
    game.onPlayerDisconnected(socket.id)
    socket.broadcast.emit('game.players:update', game.players)
  })

  socket.on('player:attack', (attackInputs, mousePos) => {
    var playerPos = game.players[socket.id].pos
    game.onAttack(socket.id, attackInputs, playerPos, mousePos)
    // game.onCreateTornado(socket.id, playerPos, mousePos)
    io.sockets.emit('player:update', game.players[socket.id])
  })
})

let past = Date.now()
setInterval(function () {
  // delta time calculus
  const now = Date.now()
  const delta = now - past
  past = now
  // execute the logic loop
  game.logic(delta)
}, 20)

// Listen on environment variable PORT
// or 3000 by default
const port = process.env.PORT || 3000

http.listen(port, function () {
  console.log(`listening on port ${port}`)
})
