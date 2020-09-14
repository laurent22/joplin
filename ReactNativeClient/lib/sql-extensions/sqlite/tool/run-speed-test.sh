#!/bin/bash
#
# This is a template for a script used for day-to-day size and 
# performance monitoring of SQLite.  Typical usage:
#
#     sh run-speed-test.sh trunk  #  Baseline measurement of trunk
#     sh run-speed-test.sh x1     # Measure some experimental change
#     fossil test-diff --tk cout-trunk.txt cout-x1.txt   # View chanages
#
# There are multiple output files, all with a base name given by
# the first argument:
#
#     summary-$BASE.txt           # Copy of standard output
#     cout-$BASE.txt              # cachegrind output
#     explain-$BASE.txt           # EXPLAIN listings (only with --explain)
#
if test "$1" = ""
then
  echo "Usage: $0 OUTPUTFILE [OPTIONS]"
  exit
fi
NAME=$1
shift
CC_OPTS="-DSQLITE_ENABLE_RTREE -DSQLITE_ENABLE_MEMSYS5"
SPEEDTEST_OPTS="--shrink-memory --reprepare --heap 10000000 64"
SIZE=5
doExplain=0
while test "$1" != ""; do
  case $1 in
    --reprepare)
        SPEEDTEST_OPTS="$SPEEDTEST_OPTS $1"
        ;;
    --autovacuum)
        SPEEDTEST_OPTS="$SPEEDTEST_OPTS $1"
        ;;
    --utf16be)
        SPEEDTEST_OPTS="$SPEEDTEST_OPTS $1"
        ;;
    --stats)
        SPEEDTEST_OPTS="$SPEEDTEST_OPTS $1"
        ;;
    --without-rowid)
        SPEEDTEST_OPTS="$SPEEDTEST_OPTS $1"
        ;;
    --nomemstat)
        SPEEDTEST_OPTS="$SPEEDTEST_OPTS $1"
        ;;
    --wal)
        SPEEDTEST_OPTS="$SPEEDTEST_OPTS --journal wal"
        ;;
    --size)
        shift; SIZE=$1
        ;;
    --explain)
        doExplain=1
        ;;
    --heap)
        CC_OPTS="$CC_OPTS -DSQLITE_ENABLE_MEMSYS5"
        shift;
        SPEEDTEST_OPTS="$SPEEDTEST_OPTS --heap $1 64"
        ;;
    *)
        CC_OPTS="$CC_OPTS $1"
        ;;
  esac
  shift
done
SPEEDTEST_OPTS="$SPEEDTEST_OPTS --size $SIZE"
echo "NAME           = $NAME" | tee summary-$NAME.txt
echo "SPEEDTEST_OPTS = $SPEEDTEST_OPTS" | tee -a summary-$NAME.txt
echo "CC_OPTS        = $CC_OPTS" | tee -a summary-$NAME.txt
rm -f cachegrind.out.* speedtest1 speedtest1.db sqlite3.o
gcc -g -Os -Wall -I. $CC_OPTS -c sqlite3.c
size sqlite3.o | tee -a summary-$NAME.txt
if test $doExplain -eq 1; then
  gcc -g -Os -Wall -I. $CC_OPTS \
     -DSQLITE_ENABLE_EXPLAIN_COMMENTS \
    ./shell.c ./sqlite3.c -o sqlite3 -ldl -lpthread
fi
SRC=./speedtest1.c
gcc -g -Os -Wall -I. $CC_OPTS $SRC ./sqlite3.o -o speedtest1 -ldl -lpthread
ls -l speedtest1 | tee -a summary-$NAME.txt
valgrind --tool=cachegrind ./speedtest1 speedtest1.db \
    $SPEEDTEST_OPTS 2>&1 | tee -a summary-$NAME.txt
size sqlite3.o | tee -a summary-$NAME.txt
wc sqlite3.c
cg_anno.tcl cachegrind.out.* >cout-$NAME.txt
if test $doExplain -eq 1; then
  ./speedtest1 --explain $SPEEDTEST_OPTS | ./sqlite3 >explain-$NAME.txt
fi
