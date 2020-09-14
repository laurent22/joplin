# 2017 May 9
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
set testprefix subjournal

do_execsql_test 1.0 {
  PRAGMA temp_store = memory;
  CREATE TABLE t1(a,b,c);
  INSERT INTO t1 VALUES(1, 2, 3);
} {}
do_execsql_test 1.1 {
  BEGIN;
    INSERT INTO t1 VALUES(4, 5, 6);
    SAVEPOINT one;
      INSERT INTO t1 VALUES(7, 8, 9);
    ROLLBACK TO one;
    SELECT * FROM t1;
} {1 2 3 4 5 6}
do_execsql_test 1.2 {
  COMMIT;
}

do_execsql_test 2.0 {
  PRAGMA cache_size = 5;
  CREATE TABLE t2(a BLOB);
  CREATE INDEX i2 ON t2(a);
  WITH s(i) AS (
    SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<100
  ) INSERT INTO t2 SELECT randomblob(500) FROM s;
}

do_test 2.1 {
  forcedelete test.db2
  sqlite3 db2 test2.db
  sqlite3_backup B db2 main db main
  set nPage [db one {PRAGMA page_count}]
  B step [expr $nPage-10]
} {SQLITE_OK}

do_execsql_test 2.2 {
  BEGIN;
    UPDATE t2 SET a=randomblob(499);
    SAVEPOINT two;
      UPDATE t2 SET a=randomblob(498);
    ROLLBACK TO two;
  COMMIT;
  PRAGMA integrity_check;
} {ok}

do_test 2.3 {
  B step 1000
} {SQLITE_DONE}
do_test 2.4 {
  B finish
  execsql { PRAGMA integrity_check } db2
} {ok}

finish_test
