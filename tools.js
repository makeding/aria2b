const exec = require('util').promisify((require('child_process')).exec)
async function initial(ipv6 = true, timeout = 86400) {
    try {
        await exec('iptables -D INPUT -m set --match-set bt_blacklist src -j DROP')
        await exec('iptables -D FORWARD -m set --match-set bt_blacklist src -j DROP')
        await exec('ip6tables -D INPUT -m set --match-set bt_blacklist6 src -j DROP')
        await exec('ip6tables -D FORWARD -m set --match-set bt_blacklist6 src -j DROP')
        await exec('ipset destroy bt_blacklist')
        await exec('ipset destroy bt_blacklist6')
        await exec('ipset create bt_blacklist hash:ip hashsize 4096')
        await exec('iptables -I INPUT -m set --match-set bt_blacklist src -j DROP')
        await exec('iptables -I FORWARD -m set --match-set bt_blacklist src -j DROP')
        await exec('ipset create bt_blacklist hash:ip hashsize 4096 family inet6')
        await exec('ip6tables -I INPUT -m set --match-set bt_blacklist6 src -j DROP')
        await exec('ip6tables -I FORWARD -m set --match-set bt_blacklist6 src -j DROP')
    } catch (error) {
        console.error('初始化出错，请查看是否有依赖没有安装完全')
        console.error(error)
    }
}
initial()