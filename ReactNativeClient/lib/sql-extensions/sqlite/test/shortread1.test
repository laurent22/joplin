# 2007 Sep 13
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file attempts to duplicate an error scenario seen on a
# customer system using version 3.2.2.  The problem appears to
# have been fixed (perhaps by accident) with check-in [3503].
# These tests will prevent an accidental recurrance.
#
# $Id: shortread1.test,v 1.1 2007/09/14 01:48:12 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test shortread1-1.1 {
  execsql {
    CREATE TABLE t1(a TEXT);
    BEGIN;
    INSERT INTO t1 VALUES(hex(randomblob(5000)));
    INSERT INTO t1 VALUES(hex(randomblob(100)));
    PRAGMA freelist_count;
  }
} {0}
do_test shortread1-1.2 {
  execsql {
    DELETE FROM t1 WHERE rowid=1;
    PRAGMA freelist_count;
  }
} {11}
do_test shortread1-1.3 {
  sqlite3_release_memory [expr {1024*9}]
  execsql {
    INSERT INTO t1 VALUES(hex(randomblob(5000)));
    PRAGMA freelist_count;
  }
} {0}
do_test shortread1-1.4 {
  execsql {
    COMMIT;
    SELECT count(*) FROM t1;
  }
} {2}

finish_test
