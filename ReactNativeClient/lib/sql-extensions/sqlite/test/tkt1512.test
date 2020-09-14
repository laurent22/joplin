# 2005 September 19
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
# This file implements tests to verify that ticket #1512 is
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable {!vacuum || !autovacuum} {
  finish_test
  return
}
if {[db one {PRAGMA auto_vacuum}]} {
  finish_test
  return
}

do_test tkt1512-1.1 {
  execsql {
    CREATE TABLE t1(a,b);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t1 VALUES(3,4);
    SELECT * FROM t1
  }
} {1 2 3 4}
do_test tkt1512-1.2 {
  file size test.db
} {2048}
do_test tkt1512-1.3 {
  execsql {
    DROP TABLE t1;
  }
  file size test.db
} {2048}
do_test tkt1512-1.4 {
  execsql {
    VACUUM;
  }
  file size test.db
} {1024}


finish_test
