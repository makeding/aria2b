let axios = require('axios')
const { spawn } = require('child_process')
let uuid = require('uuid').v4
let config = require('./config.json')
let base_url = config.base_url
let blocked_ips = []
const secret = 'token:' + config.secret
async function run() {
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
                if (blocked_ips.indexOf(peer.ip) == -1)
                    if (peer.peerId.indexOf('XL00') > -1) { // 自己改改
                        spawn('ipset', ['add', 'bt_blacklist', peer.ip])
                        console.log('blocked', peer.ip)
                        blocked_ips.push(peer.ip)
                    }
            })
        }
    })

}
setInterval(() => {
    run()
}, 1000) // 频率，自己改改
console.log('started!')
// foreach + async 
async function asyncForEach(array, callback) {
    for (let index = 0; index < array.length; index++) {
        await callback(array[index], index, array)
    }
}