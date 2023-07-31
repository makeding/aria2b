# aria2b

aria2 自动 ban 掉迅雷等不受欢迎客户端的脚本（仅限 Linux）  

由 [aria2_ban_thunder](https://github.com/makeding/aria2_ban_thunder) 改名而来  
# 原理
通过 aria2 RPC （就是API）自动查找不受欢迎的 peer 然后使用 iptables + ipset 来封禁其 IP （所以 Windows / macOS 不魔改是没法用的）  

这是不修改 aria2 源码（其实就是自己太菜了 改不动 C++）而 ban 掉这些客户端的一个办法。
## 依赖
`nodejs` `ipset` `iptables`  
自行参考[Node.js 官方教程](https://github.com/nodesource/distributions/blob/master/README.md)  

开机自动启动 `ipset` `iptables` 按照自己需求来安排
### Alpine

    apk add iptables ipset nodejs
### Ubuntu / Debian
    apt-get install ipset
### ArchLinux
    pacman -S ipset yarn

### Centos
    yum install ipset

## 下载
二选一  
### 稳定版（强烈推荐）
> 同时也是更新命令

    npm i -g aria2b
    # 或者
    yarn global add aria2b
    aria2b

### 开发版

    git clone https://github.com/makeding/aria2b.git # 克隆
    cd aria2b
    yarn # 安装依赖
    # npm install # 也是安装依赖
    node app.js

    git pull # 更新
## 配置
目前版本已经默认开箱即用了，欢迎报告 bug  
abt 会读取本地的 `aria2.conf` 来找 aria2 RPC 端口以及 secret 之类的  
默认读取的路径为 `$HOME/.aria2/aria2.conf` > `/etc/aria2/aria2.conf`  
主机若为本地则默认关闭证书校验（自行 `update-ca-trust` 让本地系统信任之类的其实更好）  
可以使用 -c 来指定 aria2 的配置文件

    aria2b -c <path>

也可以手动使用 -u 与 -s 手动配置

    aria2b -u <url> -s <secret>

以及支持寄生配置，仅需修改 aria2 本体配置文件即可对 aria2b 做修改  
目前支持以下配置：  

```
ab-bt-ban-client-keywords=XL,SD,XF,QN,BD
ab-bt-ban-timeout=86400
```
另外寄生配置不支持结尾带 # 注释

所有配置如下表所示：
| 描述 | cli |  config  | 默认值 | 备注
|-|-|-|-|-|
| rpc url | -u --url | N/A | http://127.0.0.1:6800/jsonrpc 
| rpc secret | -s --secret | ab-rpc-secret | N/A
| ban 客户端关键字 | -b --block-keywords | ab-bt-ban-client-keywords | XL,SD,XF,QN,BD | 以,为分割符
| IP 解除封禁时间 | --timeout | ab-bt-ban-timeout | 86400 | 以秒来计算
| 关闭证书校验 | --rpc-no-verify | ab-rpc-no-verify| N/A | rpc 为本地时默认关闭证书校验 
| 自定义信任ca证书 | --rpc-ca | ab-rpc-ca | N/A | 路径/base64两次编码
| 自定义信任证书 | --rpc-cert | ab-rpc-cert | N/A | 路径/base64两次编码
| 自定义信任私钥 | --rpc-key | ab-rpc-key | N/A | 路径/base64两次编码

`--rpc-ca` `--rpc-cert` `--rpc-key` 需要同时配置，不然还是会不信任，这是 Node.js 的[设定](https://nodejs.org/api/tls.html)，这里推荐系统去手动信任 ca 证书来完成而不是这么麻烦（搜索关键词 `update-ca-trust`）  
## 守护
### systemd
参考配置
```
[Unit]
Description=aria2 ban unwelcome clients via ipset
After=network.target aria2.service

[Service]
Type=simple
User=root
Restart=on-failure
RestartSec=5s

# 这里的路径自己改改，默认应该是这个
ExecStart=/usr/local/bin/aria2b

[Install]
WantedBy=multi-user.target
```
命令：
```
systemctl edit aria2b --full --force
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
