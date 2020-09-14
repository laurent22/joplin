# 2011 August 3
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is testing that bug [d63523637517386191d634e]
# has been fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

set ::testprefix tkt-d635236375

do_test 1.0 {
  execsql {
    CREATE TABLE t1(id1 INTEGER PRIMARY KEY);
    INSERT INTO t1 VALUES(9999);
    CREATE TABLE t2(id2 INTEGER PRIMARY KEY);
    INSERT INTO t2 VALUES(12345);
    INSERT INTO t2 VALUES(54321);
    SELECT DISTINCT id1 AS x, id1 AS y FROM t1, t2;
  }
} {9999 9999}
do_test 1.1 {
  execsql {
    SELECT count(*) FROM t1, t2 GROUP BY id1, id1;
  }
} {2}


finish_test
