#!/bin/sh

appname=check-new-messages-in-all-folders

cp buildscript/makexpi.sh ./
./makexpi.sh -n $appname -o
rm ./makexpi.sh

