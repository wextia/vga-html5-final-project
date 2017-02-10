const engine = require('../common/engine.js')
const utils = require('../common/utils.js')
const constants = require('../common/constants.js')

module.exports =
  class GameServer {
    constructor () {
      this.players = {}
      this.tornados = []
    }

    logic (delta) {
      // COMMON BETWEEN SERVER AND CLIENT
      for (let playerId in this.players) {
        var player = this.players[playerId]
        if (player.isAirbone) {
          player.airboneTime -= delta
          if (player.airboneTime <= 0) {
            this.players[playerId].isAirbone = false
            this.players[playerId].airboneTime = 0
          }
          // We skip this logic loop, player was airbone
          continue
        }
        if (player.isDead) {
          continue
        }

        engine.applyInputsClamped(this.players[playerId],
          delta,
          constants.ACCEL,
          constants.DAMP_FACTOR,
          constants.MAX_SPEED,
          constants.MAP_BOUNDARIES
        )
        // BEGIN SERVER ONLY
        var reloadingTime = this.players[playerId].reloadingTime
        reloadingTime -= delta
        this.players[playerId].reloadingTime = utils.clamp(reloadingTime, 0, constants.RELOADING_TIME)
        // END SERVER ONLY
      }
      this.tornados.forEach((tornado) => {
        engine.applySpeed(tornado, delta, constants.MAP_BOUNDARIES)
      })
    }

    onPlayerConnected (playerId, x, y) {
      const player = new engine.PlayerObject(
        playerId,
        x,
        y
      )
      player.reloadingTime = 0
      player.airboneTime = 0
      player.isAirbone = false
      player.isDead = false
      this.players[playerId] = player
    }

    onPlayerDisconnected (playerId) {
      delete this.players[playerId]
    }

    onPlayerMoved (playerId, inputs) {
      const player = this.players[playerId]
      if (player.isAirbone) {
        return
      }
      player.timestamp = Date.now()
      player.inputs = inputs
      this.players[playerId] = player
    }

    onCreateTornado (playerId, playerPos, mousePos) {
      // We get the vector from playerPos to mousePos
      var tornadoSpeed = engine.vectorBetween(playerPos, mousePos)
      // And we normalize it
      tornadoSpeed = engine.vectorNormalize(tornadoSpeed)
      // And multiply it by the tornado speed
      tornadoSpeed = engine.vectorTimes(tornadoSpeed, constants.TORNADO_SPEED)

      // creating the actual tornado...
      this.tornados.push({
        velocity: tornadoSpeed,
        pos: new engine.Vector(playerPos.x, playerPos.y),
        prop: playerId
      })
    }
  }