#!/bin/bash
ab_path=`dirname $0`
`/usr/sbin/ipset save > $ab_path/bt_blacklist.tmp`