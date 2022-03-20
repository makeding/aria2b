# aria2b

aria2 自动 ban 掉迅雷等不受欢迎客户端的脚本（仅限 Linux）  

由 [aria2_ban_thunder](https://github.com/makeding/aria2_ban_thunder) 改名而来  
# 原理
通过 aria2 RPC （就是API）自动查找迅雷的 peer 然后使用 iptables + ipset 来封禁其 IP （所以 windows 不魔改是没法用的）  

这是不修改 aria2 源码（其实就是自己太菜了 改不动 C++）而 ban 掉这些客户端的一个办法  
当然经过简单改造，就可以屏蔽其它的特定客户端了 （现在的默认配置文件已经屏蔽了 迅雷 / 影音先锋 / qq旋风 / 百度网盘）  
## 依赖
`nodejs` `ipset` `iptables`  
自行参考[Node.js 官方教程](https://github.com/nodesource/distributions/blob/master/README.md)  

### Alpine

    apk add iptables ipset nodejs
### Ubuntu / Debian
    apt-get install ipset
### ArchLinux
    pacman -S ipset yarn

### Centos （真的有人用？）
    yum install ipset

## 下载
二选一  
### 稳定版（强烈推荐）

    npm -i -g aria2b
    # 或者
    yarn global add aria2b
    aria2b

### 开发版

    git clone https://github.com/makeding/aria2b.git # 克隆
    cd aria2b
    yarn # 安装依赖
    # npm install # 也是安装依赖
    node app.js

## 配置
目前版本已经默认开箱即用了，欢迎报告 bug  
abt 会读取本地的 `aria2.conf` 来找 aria2 RPC 端口以及 secret 之类的  
默认读取的路径为 `/etc/aria2/aria2.conf`  
可以使用 -c 来指定 aria2 配置文件

    aria2b -c <path>

也可以手动使用 -u 与 -s 手动配置

    aria2b -u <url> -s <secret>

以及支持寄生配置，仅需修改 aria2 本体配置文件即可对 aria2b 做修改  
目前支持以下配置：  

```
bt-ban-client-keywords=XL,SD,XF,QN,BD
```
## 守护
### systemd
参考配置
```
[Unit]
Description=aria2 ban unwelcome clients via ipset
After=network.target

[Service]
Type=forking
User=root
Restart=on-failure
RestartSec=5s

# 这里的路径自己改改
ExecStart=/usr/local/bin/aria2b

[Install]
WantedBy=multi-user.target
```
路径：
> /usr/lib/systemd/system/aria2b.service  

```
systemctl daemon-reload 
systemctl enable aria2b.service --now
```
### pm2
```
# 自己安装
# yarn global add pm2 
# pacman -S pm2 # ArchLinux
pm2 start --name 'aria2b' aria2b
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
有什么问题 发 issue 就可以了，或者自己改改 发个 PR 吧
# License
MIT
