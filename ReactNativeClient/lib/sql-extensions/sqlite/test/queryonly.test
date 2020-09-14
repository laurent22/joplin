# 2013-07-11
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file tests the "query_only" pragma.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_execsql_test queryonly-1.1 {
  CREATE TABLE t1(a);
  INSERT INTO t1 VALUES(123),(456);
  SELECT a FROM t1 ORDER BY a;
} {123 456}
do_execsql_test queryonly-1.2 {
  PRAGMA query_only;
} {0}
do_execsql_test queryonly-1.3 {
  PRAGMA query_only=ON;
  PRAGMA query_only;
} {1}
do_test queryonly-1.4 {
  catchsql {INSERT INTO t1 VALUES(789);}
} {1 {attempt to write a readonly database}}
do_test queryonly-1.5 {
  catchsql {DELETE FROM t1;}
} {1 {attempt to write a readonly database}}
do_test queryonly-1.6 {
  catchsql {UPDATE t1 SET a=a+1;}
} {1 {attempt to write a readonly database}}
do_test queryonly-1.7 {
  catchsql {CREATE TABLE t2(b);}
} {1 {attempt to write a readonly database}}
do_test queryonly-1.8 {
  catchsql {CREATE INDEX t1a ON t1(a);}
} {1 {attempt to write a readonly database}}
do_test queryonly-1.9 {
  catchsql {DROP TABLE t1;}
} {1 {attempt to write a readonly database}}
do_test queryonly-1.10 {
  catchsql {ANALYZE;}
} {1 {attempt to write a readonly database}}
do_execsql_test queryonly-1.11 {
  SELECT a FROM t1 ORDER BY a;
} {123 456}

do_execsql_test queryonly-2.2 {
  PRAGMA query_only;
} {1}
do_execsql_test queryonly-2.3 {
  PRAGMA query_only=OFF;
  PRAGMA query_only;
} {0}
do_execsql_test queryonly-2.4 {
  INSERT INTO t1 VALUES(789);
  SELECT a FROM t1 ORDER BY a;
} {123 456 789}
do_execsql_test queryonly-2.5 {
  UPDATE t1 SET a=a+1;
  SELECT a FROM t1 ORDER BY a;
} {124 457 790}

finish_test
