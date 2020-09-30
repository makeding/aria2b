const axios = require('axios')
const { spawn } = require('child_process')
const uuid = require('uuid').v4
const get_peer_name = require('@huggycn/bittorrent-peerid')
let config = require('./config')
let base_url = config.base_url
let blocked_ips = []
let run_flag = true
const secret = 'token:' + config.secret
async function run() {
    run_flag = false
    try {
        let d = await axios.post(base_url, {
            jsonrpc: '2.0',
            method: 'aria2.tellActive',
            id: uuid(),
            params: [secret, ['gid', 'status']]
        })
        await asyncForEach(d.data.result, async t => {
            if (t.status == 'active') {
                let d_peer = await axios.post(base_url, {
                    jsonrpc: '2.0',
                    method: 'system.multicall',
                    id: uuid(),
                    params: [[{ 'methodName': 'aria2.getPeers', 'params': [secret, t.gid] }]]
                })
                await asyncForEach(d_peer.data.result[0][0], peer => {
                    let c = get_peer_name(decodePercentEncodedString(peer.peerId))
                    if (blocked_ips.indexOf(peer.ip) == -1) {
                        if (config.block_keywords.indexOf('Unknow') > -1 && c.client == 'unknown') {
                            block_ip(peer.ip, {
                                origin: 'unknow',
                                client: '',
                                version: ''
                            })
                        } else if (new RegExp('(' + config.block_keywords.join('|') + ')').test(c.origin)) {
                            block_ip(peer.ip, c)
                        }
                    }
                })
            }
            run_flag = true
        })
    } catch (e) {
        run_flag = true
        console.error('请求错误 日志如下，请检查是否填错 url 和 secret，或者 aria2 进程嗝屁了')
        console.error(e)
    }

}
setInterval(() => {
    if (run_flag)
        run()
}, 1000) // 频率，自己改改
console.log('started!')
// foreach + async 
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}
function block_ip(ip, c) {
    spawn('ipset', ['add', 'bt_blacklist', ip, 'timeout', config.timeout])
    console.log('blocked', ip, c.origin, c.client, c.version)
    blocked_ips.push(ip)
}

// 用于解码 peerid 名称
// 代码来自 https://github.com/mayswind/AriaNg/blob/a091ee850ff45a56ab033f821727c1ad24049a60/src/scripts/services/ariaNgCommonService.js#L91
function decodePercentEncodedString(s) {
    if (!s)
        return 'Unknow'
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