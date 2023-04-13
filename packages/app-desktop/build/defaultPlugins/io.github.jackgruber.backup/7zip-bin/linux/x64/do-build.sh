#!/usr/bin/env bash
set -e

apt-get update -qq
apt-get upgrade -qq

echo "deb http://apt.llvm.org/xenial/ llvm-toolchain-xenial-5.0 main" > /etc/apt/sources.list.d/llvm.list
curl -L http://apt.llvm.org/llvm-snapshot.gpg.key | apt-key add -
apt-get update -qq
apt-get install -qq bzip2 yasm clang-5.0 lldb-5.0 lld-5.0

ln -s /usr/bin/clang-5.0 /usr/bin/clang
ln -s /usr/bin/clang++-5.0 /usr/bin/clang++

mkdir -p /tmp/7z
cd /tmp/7z
curl -L http://downloads.sourceforge.net/project/p7zip/p7zip/16.02/p7zip_16.02_src_all.tar.bz2 | tar -xj -C . --strip-components 1
cp makefile.linux_clang_amd64_asm makefile.machine
make -j4
mv bin/7za /project/7za
