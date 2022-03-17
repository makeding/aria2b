# aria2_ban_thunder
Aria2 自动 ban 掉迅雷的脚本（仅限 Linux）  

（其实开启强制加密 `bt-require-crypto=true` 后，即可过滤掉大部分国产吸血客户端）
# 原理
通过 Aria2 rpc （就是API）自动查找迅雷的 peer 然后使用 iptables + ipset 来 ban （所以 windows 不修改是没法用的）  
这是不修改 Aria2 源码（其实就是自己太菜了 改不动 CPP）而 ban 掉迅雷的一个办法  
当然经过简单改造，就可以屏蔽其它的特定客户端了 （现在的默认配置文件已经屏蔽了 迅雷 / 影音先锋 / qq旋风 / 百度网盘）  
依赖 `nodejs` `ipset` `iptables` // 整个脚本是 js 写的，可以轻松移植成别的语言 比如 py
## 依赖
除了 ArchLinux 安装 nodejs 自行参考[官方教程](https://github.com/nodesource/distributions/blob/master/README.md)
### Ubuntu / Debian
    sudo apt-get install ipset

### ArchLinux
    sudo pacman -S ipset yarn

### Centos （真的有人用？）
    sudo yum install ipset

## 下载 && 编辑
```
git clone https://github.com/makeding/aria2_ban_thunder.git # 克隆
cd aria2_ban_thunder
yarn # 安装依赖
# npm install # 也是安装依赖
```

abt 会读取本地的 `aria2.conf` 来访问 rpc  
默认读取的文件为 `/etc/aria2/aria2.conf`  
可以使用 -c 来指定 aria2 配置文件

    node app.js -c <path>


也可以手动使用 -u 与 -s 手动配置

    node app.js -u <url> -s <key>
## 使用 systemd 常驻后台 开机启动
参考配置
```
[Unit]
Description=aria2 ban thunder via ipset
After=network.target

[Service]
Type=forking
User=root
Restart=on-failure
RestartSec=5s

# 这里的路径自己改改
ExecStart=/root/.aria2/aria2_ban_thunder/startup.sh	 
ExecStop=/root/.aria2/aria2_ban_thunder/shutdown.sh

[Install]
WantedBy=multi-user.target
```
路径：
> /etc/systemd/system/aria2_ban_thunder.service  

(或者其它你喜欢的服务名)
```
systemctl daemon-reload 
systemctl enable aria2_ban_thunder.service
systemctl start aria2_ban_thunder.service
```
## 或者使用 pm2 来常驻后台 开机启动
```
# 自己安装
# yarn global add pm2 
# pacman -S pm2 # ArchLinux
pm2 start --name 'aria2_ban_thunder' app.js
pm2 save
pm2 startup
```
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
ban 未知的 peer 按照需求添加

# Enjoy～ 
如果你觉得好用请推荐给别人  
有什么问题 发 issue 就可以了，或者自己改改 发个 pr
# License
MIT
