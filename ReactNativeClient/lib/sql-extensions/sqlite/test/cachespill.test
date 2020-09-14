# 2017 April 26
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix cachespill

ifcapable !pager_pragmas {
  finish_test
  return
}

#-------------------------------------------------------------------------
# Test that "PRAGMA cache_spill = 0" completely disables cache spilling.
#
do_execsql_test 1.1 {
  PRAGMA auto_vacuum = 0;
  PRAGMA page_size = 1024;
  PRAGMA cache_size = 100;
  CREATE TABLE t1(a);
}

do_test 1.2 {
  file size test.db
} {2048}

do_test 1.3 {
  execsql {
    BEGIN;
      WITH s(i) AS (
        SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<200
      ) INSERT INTO t1 SELECT randomblob(900) FROM s;
  }
  expr {[file size test.db] > 50000}
} {1}

do_test 1.4 {
  execsql ROLLBACK
  file size test.db
} {2048}

do_test 1.5 {
  execsql {
    PRAGMA cache_spill = 0;
    BEGIN;
      WITH s(i) AS (
        SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<200
      ) INSERT INTO t1 SELECT randomblob(900) FROM s;
  }
  file size test.db
} {2048}

do_test 1.5 {
  execsql {
    ROLLBACK;
    PRAGMA cache_spill = 1;
    BEGIN;
      WITH s(i) AS (
        SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<200
      ) INSERT INTO t1 SELECT randomblob(900) FROM s;
  }
  expr {[file size test.db] > 50000}
} {1}

do_execsql_test 1.6 { ROLLBACK }


finish_test
