#!/bin/bash
ab_path=`dirname $0`
echo "$ab_path"
bt_blacklist_tmp=`find $ab_path -name bt_blacklist.tmp`
# 1.ipset判断关机前是否有保存屏蔽ip信息
if [ ${#bt_blacklist_tmp} == 0 ]; then
    `ipset create bt_blacklist hash:ip hashsize 4096 timeout 86400`
else
    `ipset restore < $bt_blacklist_tmp`
    `rm $bt_blacklist_tmp`
fi
# 2.iptables加入防火墙
`iptables -I INPUT -m set --match-set bt_blacklist src -j DROP`
`iptables -I FORWARD -m set --match-set bt_blacklist src -j DROP`
# 3.启动aria2c,并在后台运行拦截脚本，拦截日志记录在/var/log/bt_blacklist.log中
`aria2c`
`node $ab_path/app.js  > /var/log/bt_blacklist.log  &`