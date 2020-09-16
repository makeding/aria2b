# aria2_ban_thunder
Aria2 自动 ban 掉迅雷的脚本（仅限 Linux）

# 原理
通过 Aria2 rpc （就是API）自动查找迅雷的 peer 然后使用 iptables + ipset 来 ban （所以 windows 不修改是没法用的）  
这是不修改 Aria2 源码（其实就是自己太菜了 改不动 CPP）而 ban 掉迅雷的一个办法  
当然经过简单改造，就可以屏蔽其它的特定客户端了 （现在的默认配置文件已经屏蔽了 迅雷 / 影音先锋 / qq旋风 / 百度网盘）
# 安装
依赖 `nodejs` `ipset` `iptables` // 整个脚本是 js 写的，可以轻松移植成别的语言 比如 py
## 依赖
除了 ArchLinux 安装 nodejs 自行参考[官方教程](https://github.com/nodesource/distributions/blob/master/README.md)
### Ubuntu / Debian
    sudo apt-get install ipset

### ArchLinux
    sudo pacman -S ipset yarn

### Centos （真的有人用？）
    sudo yum install ipset
## 正式安装
    # 这里的 bt_blacklist 随便改成其他的也行 app.js 也要一起改
    ipset create bt_blacklist hash:ip hashsize 4096
    # 这里 ipset 我觉得扔 /etc/rc.local 不错？ 总之自行保存 这样重启后不用重新配置啊
    iptables -I INPUT -m set --match-set bt_blacklist src -j DROP
    iptables -I FORWARD -m set --match-set bt_blacklist src -j DROP
    # iptables 设置完了 自行使用 iptables-save 保存（开机以后还ok）
    git clone https://github.com/makeding/aria2_ban_thunder.git
    cd aria2_ban_thunder
    cp config_sample.json config.json
    nano config.json # 或者 vim config.json 自己编辑一下
    yarn # 或者 npm i
    node app.js # 直接看看效果 ^ _ ^
## 使用 systemd 常驻后台 开机启动
参考配置

    [Unit]
    Description=aria2 ban thunder via ipset
    After=network.target
    
    [Service]
    Type=simple
    User=root
    Restart=on-failure
    RestartSec=5s

    # 这里的路径自己改改
    ExecStart=/usr/bin/node /home/aria2_ban_thunder/app.js 
    
    [Install]
    WantedBy=multi-user.target

路径：
> /etc/systemd/system/aria2_ban_thunder.service  

(或者其它你喜欢的服务名)

    systemctl daemon-reload 
    systemctl enable aria2_ban_thunder.service
    systemctl start aria2_ban_thunder.service
## 或者使用 pm2 来常驻后台 开机启动

    # 自己安装
    # yarn global add pm2 
    # pacman -S pm2 # ArchLinux
    pm2 start --name 'aria2_ban_thunder' app.js
    pm2 save
    pm2 startup
## 配置参考 (config.json)
由于有注释，请复制 config_sample.json 无注释版本改

    {
        "base_url": "http://127.0.0.1:6800/jsonrpc", // aria2 rpc 地址 一般为 http://ip:6800/jsonrpc
        "secret": "test", // rpc 密钥 对应 rpc-secret
        "block_keywords": [ // 要 block 的客户端关键字
        ]
    }
# blocklist 参考 (block_keywords)
| 客户端 |  Peer名称 |
|-|-|
| 迅雷 | XL SD |
| 影音先锋 | XF |
| qq旋风 | QD |
| 百度网盘 | BN（可能） |
| 未知 | unknow |

以上吸血 peer 参考了来自隔壁的 [qBittorrent-Enhanced-Edition](https://github.com/c0re100/qBittorrent-Enhanced-Edition/blob/ebe908f186be5fa2aba8710a543b3ac5c92b92fa/src/base/bittorrent/session.cpp#L2226) 项目的源码，在这里表示感谢  
如果还想屏蔽更多的 bt 客户端，可以参考 参考[这边的源码](https://github.com/makeding/bittorrent-peerid/blob/master/index.js#L249)  （没有什么必要啦 就迅雷之类的会吸血）  
ban 未知的 peer 按照需求添加啦

# 解 ban ip
由于家庭宽带是动态 IP 有几率 ban 了的 IP 今天是迅雷 明天就变 qBittorrent 了，所以还是要考虑解 ban IP  
这里需要了解 ipset 的用法 使用 `man ipset` ｜ `ipset -h` 就知道用法了，下面是操作示范  
单个 ip:

    ipset del bt_blacklist (输入ip)
整个列表扬了（可以直接复制下面的运行）:

    # 1.先停止脚本（取决于你用什么方式运行的）
    systemctl stop bt_blacklist
    pm2 stop aria2_ban_thunder

    # 2.把 iptables 规则删了
    iptables -D INPUT -m set --match-set bt_blacklist src -j DROP
    iptables -D FORWARD -m set --match-set bt_blacklist src -j DROP

    # 3.ipset 炸了整个列表
    ipset destory bt_blacklist
    
    # 4.ipset iptables 都添加回去
    ipset create bt_blacklist hash:ip hashsize 4096
    iptables -I INPUT -m set --match-set bt_blacklist src -j DROP
    iptables -I FORWARD -m set --match-set bt_blacklist src -j DROP

# Enjoy～ 
如果你觉得好用请推荐给别人  
有什么问题 发 issue 就可以了，或者自己改改 发个 pr
# License
MIT