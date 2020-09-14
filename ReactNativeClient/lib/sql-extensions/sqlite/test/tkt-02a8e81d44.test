# 2010 April 15
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
# This file implements tests to verify that ticket [02a8e81d44] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

do_test tkt-02a838-1.1 {
  execsql {
    CREATE TABLE t1(a);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    INSERT INTO t1 VALUES(4);
    INSERT INTO t1 VALUES(5);
    SELECT * FROM (SELECT a FROM t1 LIMIT 1) UNION ALL SELECT 3;
  }
} {1 3}

finish_test
