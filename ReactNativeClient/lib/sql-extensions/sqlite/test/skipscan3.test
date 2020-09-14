# 2014-08-20
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
# This file implements tests of the "skip-scan" query strategy.
# In particular, this file looks at skipping intermediate terms
# in an index.  For example, if (a,b,c) are indexed, and we have
# "WHERE a=?1 AND c=?2" - verify that skip-scan can still be used.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_execsql_test skipscan3-1.1 {
  CREATE TABLE t1(a,b,c,d,PRIMARY KEY(a,b,c));
  WITH RECURSIVE
    c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<1000)
  INSERT INTO t1(a,b,c,d)
    SELECT 1, 1, x, printf('x%04d',x) FROM c;
  ANALYZE;
} {}

# This version has long used skip-scan because of the "+a"
#
do_execsql_test skipscan3-1.2eqp {
  EXPLAIN QUERY PLAN SELECT d FROM t1 WHERE +a=1 AND c=32;
} {/*ANY(a) AND ANY(b)*/}
do_execsql_test skipscan3-1.2 {
  SELECT d FROM t1 WHERE +a=1 AND c=32;
} {x0032}

# This version (with "a" instead of "+a") should use skip-scan but
# did not prior to changes implemented on 2014-08-20
#
do_execsql_test skipscan3-1.3eqp {
  EXPLAIN QUERY PLAN SELECT d FROM t1 WHERE a=1 AND c=32;
} {/*ANY(a) AND ANY(b)*/}
do_execsql_test skipscan3-1.3 {
  SELECT d FROM t1 WHERE a=1 AND c=32;
} {x0032}

# Repeat the test on a WITHOUT ROWID table
#
do_execsql_test skipscan3-2.1 {
  CREATE TABLE t2(a,b,c,d,PRIMARY KEY(a,b,c)) WITHOUT ROWID;
  WITH RECURSIVE
    c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<1000)
  INSERT INTO t2(a,b,c,d)
    SELECT 1, 1, x, printf('x%04d',x) FROM c;
  ANALYZE;
} {}
do_execsql_test skipscan3-2.2eqp {
  EXPLAIN QUERY PLAN SELECT d FROM t2 WHERE +a=1 AND c=32;
} {/*ANY(a) AND ANY(b)*/}
do_execsql_test skipscan3-2.2 {
  SELECT d FROM t2 WHERE +a=1 AND c=32;
} {x0032}
do_execsql_test skipscan3-2.3eqp {
  EXPLAIN QUERY PLAN SELECT d FROM t2 WHERE a=1 AND c=32;
} {/*ANY(a) AND ANY(b)*/}
do_execsql_test skipscan3-2.3 {
  SELECT d FROM t2 WHERE a=1 AND c=32;
} {x0032}

  
finish_test
