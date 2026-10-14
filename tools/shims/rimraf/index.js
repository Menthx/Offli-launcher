'use strict'

// Remplaçant de rimraf v2 (déprécié) : même API callback/sync, mais basé sur fs.rm natif.
const fs = require('node:fs')

function toRmOptions(options) {
  return { recursive: true, force: true, maxRetries: (options && options.maxBusyTries) || 0 }
}

function rimraf(target, options, callback) {
  if (typeof options === 'function') {
    callback = options
    options = undefined
  }
  fs.rm(target, toRmOptions(options), (err) => callback(err || null))
}

rimraf.sync = function rimrafSync(target, options) {
  fs.rmSync(target, toRmOptions(options))
}

module.exports = rimraf
