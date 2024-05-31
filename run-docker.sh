#!/bin/bash

BASE=$(pwd)
docker run -it -u 1000:1000 -v ${BASE}:/home/miztaka -w /home/miztaka -p 3000:3000 node:20 $1
