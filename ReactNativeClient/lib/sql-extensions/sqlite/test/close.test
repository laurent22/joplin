# 2013 May 14
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
# Test some specific circumstances to do with shared cache mode.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix close

# This module bypasses the "-key" logic in tester.tcl, so it cannot run
# with the codec enabled.
do_not_use_codec

do_execsql_test 1.0 {
  CREATE TABLE t1(x);
  INSERT INTO t1 VALUES('one');
  INSERT INTO t1 VALUES('two');
  INSERT INTO t1 VALUES('three');
}
db close

do_test 1.1 {
  set DB [sqlite3_open test.db]
  sqlite3_close_v2 $DB
} {SQLITE_OK}

do_test 1.2.1 {
  set DB [sqlite3_open test.db]
  set STMT [sqlite3_prepare $DB "SELECT * FROM t1" -1 dummy]
  sqlite3_close_v2 $DB
} {SQLITE_OK}
do_test 1.2.2 {
  sqlite3_finalize $STMT
} {SQLITE_OK}

do_test 1.3.1 {
  set DB [sqlite3_open test.db]
  set STMT [sqlite3_prepare $DB "SELECT * FROM t1" -1 dummy]
  sqlite3_step $STMT
  sqlite3_close_v2 $DB
} {SQLITE_OK}

do_test 1.3.2 {
  sqlite3_column_text $STMT 0
} {one}

do_test 1.3.3 {
  sqlite3_finalize $STMT
} {SQLITE_OK}

do_test 1.4.1 {
  set DB [sqlite3_open test.db]
  set STMT [sqlite3_prepare $DB "SELECT * FROM t1" -1 dummy]
  sqlite3_step $STMT
  sqlite3_close_v2 $DB
} {SQLITE_OK}

do_test 1.4.2 {
  list [sqlite3_step $STMT] [sqlite3_column_text $STMT 0]
} {SQLITE_ROW two}

do_test 1.4.3 {
  list [catch {
    sqlite3_prepare $DB "SELECT * FROM sqlite_master" -1 dummy
  } msg] $msg
} {1 {(21) bad parameter or other API misuse}}

do_test 1.4.4 {
  sqlite3_finalize $STMT
} {SQLITE_OK}

do_test 1.5 {
  set DB [sqlite3_open test.db]
  sqlite3_blob_open $DB main t1 x 2 0 BLOB
  sqlite3_close_v2 $DB
  sqlite3_blob_close $BLOB
} {}

finish_test
