# 2006 September 4
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
# This file implements tests to make sure sqlite3_value_text()
# always returns a null-terminated string.
#
# $Id: misc6.test,v 1.3 2007/04/23 23:56:32 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test misc6-1.1 {
  set DB [sqlite3_connection_pointer db]
  sqlite3_create_function $DB
  set STMT [sqlite3_prepare $DB {SELECT hex8(?)} -1 DUMMY]
  set sqlite_static_bind_value {0123456789}
  set sqlite_static_bind_nbyte 5
  sqlite_bind $STMT 1 {} static-nbytes
  sqlite3_step $STMT
} SQLITE_ROW
do_test misc6-1.2 {
  sqlite3_column_text $STMT 0
} {3031323334}
ifcapable utf16 {
  do_test misc6-1.3 {
    sqlite3_finalize $STMT
    set STMT [sqlite3_prepare $DB {SELECT hex16(?)} -1 DUMMY]
    set sqlite_static_bind_value {0123456789}
    set sqlite_static_bind_nbyte 5
    sqlite_bind $STMT 1 {} static-nbytes
    sqlite3_step $STMT
  } SQLITE_ROW
  do_test misc6-1.4 {
    sqlite3_column_text $STMT 0
  } {00300031003200330034}
}
sqlite3_finalize $STMT

finish_test
