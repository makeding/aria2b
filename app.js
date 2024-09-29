#!/usr/bin/env node
/**
 * aria2b by huggy
 * https://github.com/makeding/aria2b
 * 代码写得不好，请多多指教
 */
const fs = require('fs')
const axios = require('axios')
const argv = require('yargs-parser')(process.argv.slice(2))
const get_peer_name = require('@huggycn/bittorrent-peerid')
const https = require('https')
let r_rpc = axios.default.create({
    timeout: 60000 // = 60秒
})
const { asyncForEach, decodePercentEncodedString, honsole, exec, execR } = require('./common')

// 默认配置
let config = {
    rpc_url: 'http://127.0.0.1:6800/jsonrpc',
    rpc_options: {
        verify: true
    },
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
// 保留
let blocked_ips = []
let cron_processing_flag = true
async function cron() {
    cron_processing_flag = false
    try {
        let d = await r_rpc.post(config.rpc_url, {
            jsonrpc: '2.0',
            method: 'aria2.tellActive',
            id: Buffer.from(`aria2b-${+new Date()}`).toString('base64'), // 其实就是随机值了，形式无所谓，大概，所以之前版本把 uuid 包给砍了，不需要
            params: ['token:' + config.secret, ['gid', 'status']]
        })
        await asyncForEach(d.data.result, async t => {
            if (t.status == 'active') {
                let d_peer = await r_rpc.post(config.rpc_url, {
                    jsonrpc: '2.0',
                    method: 'system.multicall',
                    id: Buffer.from(`aria2b-${+new Date()}`).toString('base64'),
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
        })
    } catch (e) {
        console.error('请求错误 日志如下，请检查是否填错 url 和 secret，也有可能是 aria2 进程嗝屁了，或者你的硬盘负载太大已经出现了 I/O hang 的情况。')
        console.error(e)
    }
    cron_processing_flag = true
}
// 初始化函数，载入配置之类的
// 包装成匿名函数也行，不过会有 ;
async function initial() {
    if (argv.h || argv.help) {
        let name = process.argv0 === 'node' ? `node app.js` : process.argv0
        let prefix = name.split('').map(x => ' ').join('') + ' '
        // 现在还是中英文混合状态，不知道您有什么想法呢？🙆统一中文还是统一英文又或者保持现状？
        console.log(`aria2b v${require('./package.json').version} by huggy

${name} -c, --config <aria2 config path>
${prefix}-u,--url <rpc url> (default: http://127.0.0.1:6800/jsonrpc)
${prefix}-s, --secret <secret>
${prefix}--timeout <seconds> (default: 86400)
${prefix}--block_keywords <string>
${prefix}--flush flush ipset bt_blacklist(6)

-----Advanced Options-----

${prefix}--rpc-no-verify true / false (default: true)

${prefix}--rpc-ca <ca path> / base64 encoded (twice)
${prefix}--rpc-cert <cert path> / base64 encoded (twice)
${prefix}--rpc-key <cert path> / base64 encoded (twice)
Warning: if you use --rpc-ca, --rpc-cert and --rpc-key, you must input them together.
--rpc-no-verify enabled by default when rpc=localhost
https://github.com/makeding/aria2b`)
        process.exit(0)
    }
    if (argv.v || argv.version) {
        console.log(`aria2b v${require('./package.json').version} by huggy`)
        process.exit(0)
    }
    // 这里考虑到有些用户可能在 /etc/sudoers 放行了 ipset 所以这里不再判断是不是有权限用户
    // ~~其实是懒，因为下面运行不成功会报错，大概不需要这一句~~
    // if (await exec('whoami') !== 'root') {
    //     console.log('[aria2b] 您似乎不是 root 用户 运行的')
    //     process.exit(0)
    // }
    // 检查 ipset 配置，如果没有就安排
    let ipset_save = await exec('ipset save')
    if (argv.flush || !ipset_save.stdout.includes('bt_blacklist')) {
        await flush_iptables_ipset(4)
    }
    if ((argv.flush || !ipset_save.stdout.includes('bt_blacklist6'))) {
        await flush_iptables_ipset(6)
    }
    // blocked_ips
    // ipset_save.stdout.split('\n').forEach(x => {
    //     if (x.includes('bt_blacklist ')) {
    //     }
    // })
    // 只刷新表就退出
    if (argv.flush) {
        process.exit(0)
    }
    // 载入配置 开始
    // 从 aria2 配置文件自动载入
    let path = argv.c || argv.config || null
    if (!path) {
        if (fs.existsSync(`${process.env.HOME}/.aria2/aria2.conf`)) {
            // 网上的教程一圈都是放这的
            path = `${process.env.HOME}/.aria2/aria2.conf`
        } else if (fs.existsSync('/tmp/etc/aria2/aria2.conf.main')) {
            // openwrt
            path = '/tmp/etc/aria2/aria2.conf.main'
        } else if (fs.existsSync(`/etc/aria2/aria2.conf`)) {
            // 我自己放的地方
            path = `/etc/aria2/aria2.conf`
        } else if (fs.existsSync(`${process.env.PWD}/aria2.conf`)) {
            // 最后从当前目录碰碰运气
            path = `${process.env.PWD}/aria2.conf`
        }
    }
    if (path) {
        await load_config_from_aria2_file(path)
    }
    // cli 给的配置优先度最高
    if (argv.u || argv.url) config.rpc_url = argv.u || argv['rpc-url']
    if (argv.s || argv.secret) config.secret = argv.s || argv.secret
    if (argv.b || argv['block-keywords']) config.block_keywords = (argv.b || argv['block-keywords']).replace(/ /g, '').split(',')
    if (argv['rpc-ca']) config.rpc_options.ca = argv['rpc-ca']
    if (argv['rpc-cert']) config.rpc_options.cert = argv['rpc-cert']
    if (argv['rpc-key']) config.rpc_options.key = argv['rpc-key']
    if (argv['rpc-no-verify']) config.rpc_options.verify = false;
    ['ca', 'cert', 'key'].forEach(x => {
        if (config.rpc_options[x]) {
            if (config.rpc_options[x].length > 100) {
                config.rpc_options[x] = Buffer.from(config.rpc_options[x], 'base64')
            } else {
                config.rpc_options[x] = fs.readFileSync(config.rpc_options[x])
            }
        }
    })
    // rpc 为 localhost 默认禁用验证
    // 一个冷知识 127.0.0.1/8 都是 lookback
    if (config.rpc_url.startsWith('https://127') || config.rpc_url.startsWith('https://localhost')) {
        config.rpc_options.verify = false
    }
    config.rpc_options.rejectUnauthorized = config.rpc_options.verify
    delete config.rpc_options.verify
    r_rpc.defaults.httpsAgent = new https.Agent(config.rpc_options)
    // 载入配置 完毕
    honsole.log(`${config.rpc_url} secret: ${config.secret.split('').map((x, i) => (i === 0 || i === config.secret.length - 1) ? x : '*').join('')} `)
    honsole.log(`屏蔽客户端列表：${config.block_keywords.join(', ')}`)
    honsole.logt('started!')
    setInterval(() => {
        if (cron_processing_flag) {
            cron()
        }
    }, scan_interval)
    cron()
}
const scan_interval = 5000 // 频率，自己改改，个人感觉不需要太频繁，反正最多被偷一点点流量。单位毫秒
initial()
/**
 * 从 aria2 配置文件读取配置
 * （写法有点奇妙，可能会有问题）
 * @param {*} path 配置文件路径
 */
async function load_config_from_aria2_file(path) {
    let ssl = false
    let port = 6800
    try {
        // ipv6 支持情况，比较粗暴，不过应该够用了
        let ipv6_status = await exec('cat /sys/module/ipv6/parameters/disable')
        if (ipv6_status.stdout === '0') {
            config.ipv6 = true
        }
        //          读文件       转文本       去掉空格（有点暴力，可能会出事）
        //                               没有用 replaceAll 怕目标机器 nodejs 版本太老
        fs.readFileSync(path).toString().replace(/ /g, '').split('\n').forEach(x => {
            const value = x.split('=')[1]
            if (x.startsWith('rpc-secret=')) {
                config.secret = value
            }
            if (x.startsWith('rpc-listen-port=')) {
                port = value
            }
            if (x.startsWith('rpc-secure=true')) {
                ssl = true
            }
            if (x.startsWith('disable-ipv6=true')) {
                config.ipv6 = false
            }
            if (x.startsWith('ab-bt-ban-client-keywords')) {
                config.block_keywords = value.split(',')
            }
            // 信任自签 CA 证书
            if (x.startsWith('ab-rpc-ca')) {
                config.rpc_options.ca = value
            }
            // 信任自签 cert 证书
            if (x.startsWith('ab-rpc-cert')) {
                config.rpc_options.cert = value
            }
            // 信任需要 key 也提供
            // 查看更多： https://nodejs.org/api/tls.html （cert）
            if (x.startsWith('ab-rpc-key')) {
                config.rpc_options.key = value
            }
            // 忽略证书校验
            if (x.startsWith('ab-rpc-no-verify')) {
                config.rpc_options.verify = false
            }
            if (x.startsWith('ab-bt-ban-timeout')) {
                config.timeout = value
            }
            // 都本地读取文件了，说明这边大概是 127.0.0.1 ¿
            config.rpc_url = `http${ssl ? 's' : ''}://127.0.0.1:${port}/jsonrpc`
        })
        honsole.log(`读取配置文件(${path})成功`)
    } catch (error) {
        honsole.error(`读取配置文件(${path})失败，请检查配置文件路径以及格式是否正确`)
        honsole.error(error)
    }
}
/**
 * 重置 ipset / iptables
 */
async function flush_iptables_ipset(ipversion = 4) {
    // 检查 ipset 配置，如果没有就安排
    if (ipversion == 4) {
        ipversion = ''
    } else {
        ipversion = '6'
    }
    try {
        // 感觉还不如 if else ....
        await execR(`ip${ipversion}tables -D INPUT -m set --match-set bt_blacklist${ipversion} src -j DROP`)
        await execR(`ipset destroy bt_blacklist${ipversion}`)
        await exec(`ipset create bt_blacklist${ipversion} hash:ip timeout 600${ipversion === '6' ? ' family inet6' : ''}`) // default 10min = 600s
        await exec(`ip${ipversion}tables -I INPUT -m set --match-set bt_blacklist${ipversion} src -j DROP`)
        if (argv.flush) {
            honsole.log(`清空 bt_blacklist${ipversion} 规则成功`)
        }
    } catch (error) {
        honsole.error(error)
        honsole.error('请检查 iptables 与 ipset 是否正常，或者是否以有权限的用户运行的')
        honsole.error('另外也可以试试将 ipset 的 bt_blacklist* 手动删除试试')
        // 规则如果不正常的话程序也没必要运行下去了
        process.exit(1)
    }

}
async function block_ip(ip, c) {
    // ipv6 
    try {
        // 可能需要 ban 段，不过一般不会有这种情况。
        if (ip.includes(':')) {
            await exec(`ipset add bt_blacklist6 ${ip} timeout ${config.timeout}`)
        } else {
            await exec(`ipset add bt_blacklist ${ip} timeout ${config.timeout}`)
        }
        honsole.logt('Blocked:', ip, c.origin, c.client, c.version)
    } catch (error) {
        // if(!error.stderr.includes('already added')){
        if (!JSON.stringify(error).includes('already added')) {
            console.warn(error)
        }
    }
}