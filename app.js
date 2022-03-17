const fs = require('fs')
const axios = require('axios')
const uuid = require('uuid').v4
const argv = require('yargs-parser')(process.argv.slice(2))
const get_peer_name = require('@huggycn/bittorrent-peerid')
const { asyncForEach, decodePercentEncodedString, honsole, dt, exec, execR } = require('./common')

let config = {
    rpc_url: 'http://127.0.0.1:6800/jsonrpc',
    secret: '',
    timeout: 86400,
    block_keywords: [
        "XL", // 迅雷
        "SD", // 迅雷
        "XF", // 影音先锋
        "QD", // QQ旋风
        "BN" // 不清楚 大概是百度网盘把
    ],
    ipv6: false
}

let blocked_ips = []
let cron_processing_flag = true
async function cron() {
    cron_processing_flag = false
    try {
        let d = await axios.post(config.rpc_url, {
            jsonrpc: '2.0',
            method: 'aria2.tellActive',
            id: Buffer.from(`abt-${+new Date()}`).toString('base64'), // 其实就是随机数罢了，形式无所谓，大概
            params: ['token:' + config.secret, ['gid', 'status']]
        })
        await asyncForEach(d.data.result, async t => {
            if (t.status == 'active') {
                let d_peer = await axios.post(config.rpc_url, {
                    jsonrpc: '2.0',
                    method: 'system.multicall',
                    id: Buffer.from(`abt-${+new Date()}`).toString('base64'),
                    params: [[{ 'methodName': 'aria2.getPeers', 'params': ['token:' + config.secret, t.gid] }]]
                })
                await asyncForEach(d_peer.data.result[0][0], async peer => {
                    let c = get_peer_name(decodePercentEncodedString(peer.peerId))
                    if (!blocked_ips.includes(peer.ip)) {
                        if (config.block_keywords.includes('Unknown') && c.client == 'unknown') {
                            await block_ip(peer.ip, {
                                origin: 'Unknown',
                                client: '',
                                version: ''
                            })
                        } else if (new RegExp('(' + config.block_keywords.join('|') + ')').test(c.origin)) {
                            await block_ip(peer.ip, c)
                        }
                    }
                })
            }
            cron_processing_flag = true
        })
    } catch (e) {
        cron_processing_flag = true
        console.error('请求错误 日志如下，请检查是否填错 url 和 secret，或者 aria2 进程嗝屁了')
        console.error(e)
    }

}

// 初始化函数，载入配置之类的
// 包装成匿名函数也行，不过会有 ;
async function initial() {
    // if (await exec('whoami') !== 'root') {
    //     console.log('[abt] 您似乎不是 root 用户 运行的')
    //     process.exit(0)
    // }
    // 检查 ipset 配置，如果没有就安排
    let ipset_save = await exec('ipset save')
    if (!ipset_save.stdout.includes('bt_blacklist')) {
        try {
            await execR('iptables -D INPUT -m set --match-set bt_blacklist src -j DROP')
            await execR('ipset destroy bt_blacklist')
            await exec('ipset create bt_blacklist hash:ip hashsize 4096 timeout ' + config.timeout)
            await exec('iptables -I INPUT -m set --match-set bt_blacklist src -j DROP')

            if (config.ipv6) {
                await execR('ip6tables -D INPUT -m set --match-set bt_blacklist6 src -j DROP')
                await execR('ipset destroy bt_blacklist6')
                await exec('ipset create bt_blacklist hash:ip hashsize 4096 family inet6 timeout ' + config.timeout)
                await exec('ip6tables -I INPUT -m set --match-set bt_blacklist6 src -j DROP')
            }
        } catch (error) {
            honsole.error(error)
            honsole.error('请检查 iptables 与 ipset 是否正常，或者是否有权限')
            honsole.error('将 ipset 的 bt_blacklist* 手动删除试试')
            process.exit(1)
        }
        // honsole.logt('配置 ipset 与 iptables 成功')
    }
    // 载入配置
    if ((argv.u || argv.url) && (argv.s || argv.secret)) {
        config.rpc_url = argv.u || argv['rpc-url']
        config.secret = argv.s || argv.secret
        config.block_keywords = argv.b || argv['block-keywords'] || config.block_keywords
    } else {
        await load_config_from_aria2_file()
    }
    console.log(`[abt] ${config.rpc_url} secret: ${config.secret.split('').map((x, i) => (i === 0 || i === config.secret.length - 1) ? x : '*').join('')} `)
    console.log(`[abt] 屏蔽客户端列表：${config.block_keywords.join(', ')}`)
    honsole.logt('aria2_ban_thunder started!')
    setInterval(() => {
        if (cron_processing_flag) {
            cron()
        }
    }, 5000) // 频率，自己改改，个人感觉不需要太频繁，反正最多被偷一点点流量。
    cron()
}
initial()
/**
 * 从 aria2 配置文件读取配置
 * （写法有点奇妙，可能会有问题）
 * @param {*} path 配置文件路径
 */
async function load_config_from_aria2_file(path = argv.c ? argv.c : (argv.config ? argv.config : '/etc/aria2/aria2.conf')) {
    let ssl = false
    let port = 6800
    try {
        // ipv6 支持情况，比较粗暴，不过应该够用了
        let ipv6_status = await exec('cat /sys/module/ipv6/parameters/disable')
        if (ipv6_status.stdout === '0') {
            config.ipv6 = true
        }
        //          读文件       转文本       去掉空格（有点暴力，可能会出事）
        fs.readFileSync(path).toString().replace(/ /g, '').split('\n').forEach(x => {
            if (x.startsWith('rpc-secret=')) {
                config.secret = x.split('=')[1]
            }
            if (x.startsWith('rpc-listen-port=')) {
                port = x.split('=')[1]
            }
            if (x.startsWith('rpc-secure=true')) {
                ssl = true
            }
            if (x.startsWith('bt-ban-client-keywords')) {
                config.block_keywords = x.split('=')[1].split(',')
            }
            if (x.startsWith('disable-ipv6=true')) {
                config.ipv6 = false
            }
            config.rpc_url = `http${ssl ? 's' : ''}://127.0.0.1:${port}/jsonrpc`
        })
        console.log(`[abt] 读取配置文件(${path})成功`)
    } catch (error) {
        console.error(`[abt] 读取配置文件(${path})失败，请检查配置文件路径以及格式是否正确`)
        console.error(error)
        process.exit(0)
    }
}
async function block_ip(ip, c) {
    // ipv6 
    try {
        if (ip.includes(':')) {
            await exec(`ipset add bt_blacklist6 ${ip}`)
        } else {
            await exec(`ipset add bt_blacklist ${ip}`)
        }
    } catch (error) {
        // if(!error.stderr.includes('already added')){
        if (!JSON.stringify(error).includes('already added')) {
            console.warn(error)
        }
    }

    console.log(dt(), '[abt] Blocked:', ip, c.origin, c.client, c.version)
}