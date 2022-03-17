// 用于解码 peerid 名称
// 代码来自 https://github.com/mayswind/AriaNg/blob/a091ee850ff45a56ab033f821727c1ad24049a60/src/scripts/services/ariaNgCommonService.js#L91
function decodePercentEncodedString(s) {
  if (!s) {
    return 'Unknow'
  }
  var ret = ''
  for (var i = 0; i < s.length; i++) {
    var ch = s.charAt(i)
    if (ch === '%' && i < s.length - 2) {
      var code = s.substring(i + 1, i + 3)
      ret += String.fromCharCode(parseInt(code, 16))
      i += 2
    } else {
      ret += ch
    }
  }
  return ret
}

// foreach + async 
async function asyncForEach(array, callback) {
  for (let index = 0; index < array.length; index++) {
    await callback(array[index], index, array)
  }
}
function dt() {
  return new Date().toJSON().replace('T', ' ').replace('Z', ' ').split('.')[0]
}

const honsole = {
  dev: function (...args) {
    if (process.env.dev) {
      console.log('[abt]', ...args)
    }
  },
  log: function (...args) {
    console.log('[abt]', ...args)
  },
  logt: function (...args) {
    console.log('[abt]', dt(), ...args)
  },
  error: function (...args) {
    console.error('[abt]', ...args)
  },
  warn: function (...args) {
    console.warn('[abt]', ...args)
  }
}
const exec = require('util').promisify((require('child_process')).exec)

const execR = async (cmd) => {
  try {
    return await exec(cmd)
  } catch (error) {
    return 'error'
  }
}

module.exports = {
  decodePercentEncodedString,
  asyncForEach,
  dt,
  honsole,
  exec,
  execR
}