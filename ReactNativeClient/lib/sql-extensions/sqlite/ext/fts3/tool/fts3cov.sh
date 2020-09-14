#!/bin/sh

set -e

srcdir=`dirname $(dirname $(dirname $(dirname $0)))`
./testfixture $srcdir/test/fts3.test --output=fts3cov-out.txt

echo ""

for f in `ls $srcdir/ext/fts3/*.c` 
do
  f=`basename $f`
  echo -ne "$f: "
  gcov -b $f | grep Taken | sed 's/Taken at least once://'
done

