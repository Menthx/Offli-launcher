'use strict'

// Remplaçant de lodash.isequal (déprécié) : comparaison profonde native de Node.
const { isDeepStrictEqual } = require('node:util')

module.exports = function isEqual(a, b) {
  return isDeepStrictEqual(a, b)
}
