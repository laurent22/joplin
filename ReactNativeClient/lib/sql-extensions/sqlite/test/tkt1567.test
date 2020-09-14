# 2005 December 19 2005
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
# This file implements tests to verify that ticket #1567 is
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt1567-1.1 {
  execsql {
    CREATE TABLE t1(a TEXT PRIMARY KEY);
  }
  set bigstr abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
  for {set i 0} {$i<100} {incr i} {
    set x [format %5d [expr $i*2]]
    set sql "INSERT INTO t1 VALUES('$x-$bigstr')"
    execsql $sql
  }
} {}
integrity_check tkt1567-1.2

do_test tkt1567-1.3 {
  execsql {
    BEGIN;
    UPDATE t1 SET a = a||'x' WHERE rowid%2==0;
  }
} {}
do_test tkt1567-1.4 {
  catchsql {
    UPDATE t1 SET a = CASE WHEN rowid<90 THEN substr(a,1,10) ELSE '9999' END;
  }
} {1 {UNIQUE constraint failed: t1.a}}
do_test tkt1567-1.5 {
  execsql {
    COMMIT;
  }
} {}
integrity_check tkt1567-1.6

do_test tkt1567-2.1 {
  execsql {
    CREATE TABLE t2(a TEXT PRIMARY KEY, rowid INT) WITHOUT rowid;
  }
  set bigstr abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ
  for {set i 0} {$i<100} {incr i} {
    set x [format %5d [expr $i*2]]
    set sql "INSERT INTO t2 VALUES('$x-$bigstr', $i+1)"
    execsql $sql
  }
} {}
integrity_check tkt1567-2.2

do_test tkt1567-2.3 {
  execsql {
    BEGIN;
    UPDATE t2 SET a = a||'x' WHERE rowid%2==0;
  }
} {}
do_test tkt1567-2.4 {
  catchsql {
    UPDATE t2 SET a = CASE WHEN rowid<90 THEN substr(a,1,10) ELSE '9999' END;
  }
} {1 {UNIQUE constraint failed: t2.a}}
do_test tkt1567-2.5 {
  execsql {
    COMMIT;
  }
} {}
integrity_check tkt1567-2.6

finish_test
