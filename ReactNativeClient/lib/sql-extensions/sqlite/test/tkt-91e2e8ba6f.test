# 2011 June 23
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file contains tests for SQLite. Specifically, it tests that SQLite
# does not crash and an error is returned if localhost() fails. This 
# is the problem reported by ticket 91e2e8ba6f.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

set testprefix tkt-91e2e8ba6f


do_execsql_test 1.1 {
  CREATE TABLE t1(x INTEGER, y REAL);
  INSERT INTO t1 VALUES(11, 11);
} {}

do_execsql_test 1.2 {
  SELECT x/10, y/10 FROM t1;
} {1 1.1}

do_execsql_test 1.3 {
  SELECT x/10, y/10 FROM (SELECT * FROM t1);
} {1 1.1}

do_execsql_test 1.4 {
  SELECT x/10, y/10 FROM (SELECT * FROM t1 LIMIT 5 OFFSET 0);
} {1 1.1}

do_execsql_test 1.5 {
  SELECT x/10, y/10 FROM (SELECT * FROM t1 LIMIT 5 OFFSET 0) LIMIT 5 OFFSET 0;
} {1 1.1}

do_execsql_test 1.6 {
  SELECT a.x/10, a.y/10 FROM 
    (SELECT * FROM t1 LIMIT 5 OFFSET 0) AS a, t1 AS b WHERE a.x = b.x
  LIMIT 5 OFFSET 0;
} {1 1.1}

do_execsql_test 1.7 {
  CREATE VIEW v1 AS SELECT * FROM t1 LIMIT 5;
  SELECT a.x/10, a.y/10 FROM v1 AS a, t1 AS b WHERE a.x = b.x LIMIT 5 OFFSET 0;
} {1 1.1}

finish_test
