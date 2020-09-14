# 2001 October 12
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# Test that "PRAGMA incremental_vacuum" detects and reports database
# corruption properly. And that "PRAGMA auto_vacuum = INCREMENTAL"
# does as well.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix incrcorrupt

# If this build of the library does not support auto-vacuum, omit this
# whole file.
ifcapable {!autovacuum} {
  finish_test
  return
}

do_execsql_test 1.0 {
  PRAGMA auto_vacuum = 2;
  CREATE TABLE t1(a PRIMARY KEY, b);

  WITH data(i) AS (
    SELECT 1 UNION ALL SELECT i+1 FROM data
  )
  INSERT INTO t1 SELECT i, randomblob(600) FROM data LIMIT 20;
  PRAGMA page_count;
} {24}

do_execsql_test 1.1 {
  PRAGMA incremental_vacuum;
} {}

do_test 1.2 {
  db_save
  hexio_write test.db 36 00000019
  catchsql { PRAGMA incremental_vacuum; }
} {1 {database disk image is malformed}}

do_test 1.3 {
  set stmt [sqlite3_prepare_v2 db "PRAGMA incremental_vacuum" -1 dummy]
  sqlite3_step $stmt
} {SQLITE_CORRUPT}
do_test 1.4 { sqlite3_errcode db } {SQLITE_CORRUPT}
do_test 1.5 { sqlite3_errmsg db } {database disk image is malformed}
do_test 1.6 { sqlite3_finalize $stmt } {SQLITE_CORRUPT}
do_test 1.7 { sqlite3_errcode db } {SQLITE_CORRUPT}
do_test 1.8 { sqlite3_errmsg db } {database disk image is malformed}

do_test 1.9 {
  set stmt [sqlite3_prepare_v2 db "PRAGMA incremental_vacuum" -1 dummy]
  sqlite3_step $stmt
} {SQLITE_CORRUPT}
do_test 1.10 { sqlite3_errcode db } {SQLITE_CORRUPT}
do_test 1.11 { sqlite3_errmsg db } {database disk image is malformed}

do_test 1.12 {
  set stmt2 [sqlite3_prepare_v2 db "SELECT 1" -1 dummy]
  sqlite3_finalize $stmt2
} {SQLITE_OK}
do_test 1.13 { sqlite3_errcode db } {SQLITE_OK}
do_test 1.14 { sqlite3_errmsg db } {not an error}

do_test 1.15 { sqlite3_finalize $stmt } {SQLITE_CORRUPT}
do_test 1.16 { sqlite3_errcode db } {SQLITE_CORRUPT}
do_test 1.17 { sqlite3_errmsg db } {database disk image is malformed}

#-------------------------------------------------------------------------
#
reset_db

do_execsql_test 2.1 {
  PRAGMA auto_vacuum = 1;
  CREATE TABLE t1(a PRIMARY KEY, b);
  WITH data(i) AS (
    SELECT 1 UNION ALL SELECT i+1 FROM data
  )
  INSERT INTO t1 SELECT i, randomblob(600) FROM data LIMIT 20;
  PRAGMA page_count;
} {24}

do_test 2.2 {
  db_save
  set fd [open test.db r+]
  chan truncate $fd [expr 22*1024]
  close $fd
  catchsql { PRAGMA incremental_vacuum; }
} {1 {database disk image is malformed}}

do_test 2.3 {
  set stmt [sqlite3_prepare_v2 db "PRAGMA auto_vacuum = INCREMENTAL" -1 dummy]
  sqlite3_step $stmt
} {SQLITE_CORRUPT}
do_test 2.4 { sqlite3_errcode db } {SQLITE_CORRUPT}
do_test 2.5 { sqlite3_errmsg db } {database disk image is malformed}
do_test 2.6 { sqlite3_finalize $stmt } {SQLITE_CORRUPT}
do_test 2.7 { sqlite3_errcode db } {SQLITE_CORRUPT}
do_test 2.8 { sqlite3_errmsg db } {database disk image is malformed}

do_test 2.9 {
  set stmt [sqlite3_prepare_v2 db "PRAGMA auto_vacuum = INCREMENTAL" -1 dummy]
  sqlite3_step $stmt
} {SQLITE_CORRUPT}
do_test 2.10 { sqlite3_errcode db } {SQLITE_CORRUPT}
do_test 2.11 { sqlite3_errmsg db } {database disk image is malformed}

do_test 2.12 {
  set stmt2 [sqlite3_prepare_v2 db "SELECT 1" -1 dummy]
  sqlite3_finalize $stmt2
} {SQLITE_OK}
do_test 2.13 { sqlite3_errcode db } {SQLITE_OK}
do_test 2.14 { sqlite3_errmsg db } {not an error}

do_test 2.15 { sqlite3_finalize $stmt } {SQLITE_CORRUPT}
do_test 2.16 { sqlite3_errcode db } {SQLITE_CORRUPT}
do_test 2.17 { sqlite3_errmsg db } {database disk image is malformed}

finish_test
