#!/bin/sh

appname=check-new-messages-in-all-folders

cp makexpi/makexpi.sh ./
./makexpi.sh -n $appname -o
rm ./makexpi.sh

