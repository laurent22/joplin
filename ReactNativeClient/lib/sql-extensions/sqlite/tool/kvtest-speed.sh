#!/bin/bash
#
# A script for running speed tests using kvtest.
#
# The test database must be set up first.  Recommended
# command-line:
#
#    ./kvtest init kvtest.db --count 100K --size 12K --variance 5K

if test "$1" = ""
then
  echo "Usage: $0 OUTPUTFILE [OPTIONS]"
  exit
fi
NAME=$1
shift
OPTS="-DSQLITE_THREADSAFE=0 -DSQLITE_OMIT_LOAD_EXTENSION -DSQLITE_DIRECT_OVERFLOW_READ -DUSE_PREAD"
KVARGS="--count 100K --stats"
gcc -g -Os -I. $OPTS $* kvtest.c sqlite3.c -o kvtest

# First run using SQL
rm cachegrind.out.[1-9][0-9]*
valgrind --tool=cachegrind ./kvtest run kvtest.db $KVARGS 2>&1 | tee summary-kvtest-$NAME.txt
mv cachegrind.out.[1-9][0-9]* cachegrind.out.sql-$NAME
cg_anno.tcl cachegrind.out.sql-$NAME >cout-kvtest-sql-$NAME.txt

# Second run using the sqlite3_blob object
valgrind --tool=cachegrind ./kvtest run kvtest.db $KVARGS --blob-api 2>&1 | tee -a summary-kvtest-$NAME.txt
mv cachegrind.out.[1-9][0-9]* cachegrind.out.$NAME
cg_anno.tcl cachegrind.out.$NAME >cout-kvtest-$NAME.txt

# Diff the sqlite3_blob API analysis for non-trunk runs.
if test "$NAME" != "trunk"; then
  fossil test-diff --tk cout-kvtest-trunk.txt cout-kvtest-$NAME.txt &
fi
