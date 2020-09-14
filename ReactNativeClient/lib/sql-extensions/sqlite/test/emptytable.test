# 2017-02-15
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# Test cases to show that a join involving an empty table is very fast.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Build some test data
#
do_execsql_test emptytable-100 {
  CREATE TABLE t1(a);
  WITH RECURSIVE c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<100)
    INSERT INTO t1(a) SELECT x FROM c;
  CREATE TABLE empty(x);
  SELECT count(*) FROM t1;
} {100}

# Interrupt queries after 1M cycles to prevent burning excess CPU
proc stopDb {args} {
  db interrupt
}
db progress 1000000 {stopDb}

# Prior to the query planner optimization on 2017-02-15, this query would
# take a ridiculous amount of time.  If that optimization stops working,
# the result here will be in interrupt for running too long.
#
do_catchsql_test emptytable-110 {
  SELECT count(*) FROM t1, t1, t1, t1, t1, t1, empty;
} {0 0}

do_catchsql_test emptytable-120 {
  SELECT count(*) FROM t1, t1 LEFT JOIN empty;
} {0 10000}
do_catchsql_test emptytable-121 {
  SELECT count(*) FROM t1, t1 LEFT JOIN t1, empty;
} {0 0}


finish_test
