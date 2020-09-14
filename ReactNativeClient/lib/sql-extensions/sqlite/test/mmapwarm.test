# 20 September 18
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


if 0 {
  db close
  sqlite3_shutdown
  proc msg {args} { puts $args }
  test_sqlite3_log msg
  sqlite3 db test.db
}

set testprefix mmapwarm


do_execsql_test 1.0 {
  PRAGMA auto_vacuum = 0;
  CREATE TABLE t1(x, y);
  WITH s(i) AS (
    SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<500
  )
  INSERT INTO t1 SELECT randomblob(400), randomblob(500) FROM s;
  PRAGMA page_count;
} {507}
db close

do_test 1.1 {
  sqlite3 db test.db
  db eval {PRAGMA mmap_size = 1000000}
  sqlite3_mmap_warm db
} {SQLITE_OK}

do_test 1.2 {
  db close
  sqlite3 db test.db
  db eval {PRAGMA mmap_size = 1000000}
  sqlite3_mmap_warm db "main"
} {SQLITE_OK}

do_test 1.3 {
  sqlite3 db test.db
  sqlite3_mmap_warm db
} {SQLITE_OK}

do_test 1.4 {
  db close
  sqlite3 db test.db
  sqlite3_mmap_warm db "main"
} {SQLITE_OK}

do_test 2.0 {
  db close
  sqlite3 db test.db
  db eval BEGIN
  sqlite3_mmap_warm db "main"
} {SQLITE_MISUSE}

do_faultsim_test 3 -faults oom* -prep {
  sqlite3 db test.db
  sqlite3_db_config_lookaside db 0 0 0
  db eval { PRAGMA mmap_size = 1000000 }
  db eval { SELECT * FROM sqlite_master }
} -body {
  sqlite3_mmap_warm db "main"
} -test {
  faultsim_test_result {0 SQLITE_OK} {0 SQLITE_NOMEM}
}
 
finish_test
