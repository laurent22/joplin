# 2009 September 23
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
# This file implements tests to verify that
# ticket [4a03edc4c8c028c93e9269f64fc5e97f632c1166] has been fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt-4a03ed-1.1 {
  db eval {
    CREATE TABLE t1(
      a INTEGER PRIMARY KEY ON CONFLICT REPLACE,
      b UNIQUE ON CONFLICT FAIL
    );
    INSERT INTO t1 VALUES(1, 1);
    INSERT INTO t1 VALUES(2, 2);
  }
  catchsql {
    BEGIN;
      INSERT INTO t1 VALUES(1, 2);
    COMMIT;
  }
} {1 {UNIQUE constraint failed: t1.b}}
do_test tkt-4a03ed-1.2 {
  db eval {
    PRAGMA integrity_check;
  }
} {ok}
do_test tkt-4a03ed-1.3 {
  db eval {
    SELECT * FROM t1 ORDER BY a;
  }
} {1 1 2 2}

finish_test
