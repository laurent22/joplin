# 2016 October 26
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
# Tests for SQLITE_ENABLE_URI_00_ERROR builds.

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !uri_00_error {
  finish_test
  return
}

set testprefix uri2
db close
sqlite3_shutdown
sqlite3_config_uri 1

foreach {tn uri} {
  1 file:test.db%00trailing
  2 file:test.db?%00trailing=1
  3 file:test.db?trailing=1%00
  4 file:test.db?trailing=1&abc%00def
  5 file:test.db?trailing=1&abc%00def
} {
  do_test 1.$tn.1 {
    set rc [catch { sqlite3 db $uri } msg]
    list $rc $msg
  } {1 {unexpected %00 in uri}}

  do_test 1.$tn.2 {
    set DB2 [sqlite3_open $uri]
    sqlite3_errcode $DB2
  } {SQLITE_ERROR}

  catch { sqlite3_close $DB2 }

  do_test 1.$tn.2 {
    sqlite3 db ""
    catchsql { ATTACH $uri AS aux }
  } {1 {unexpected %00 in uri}}

  do_test 1.$tn.3 {
    sqlite3_errcode db
  } {SQLITE_ERROR}

  catch { db close }
}

reset_db
do_test 2.0 {
  expr {[lsearch [execsql {PRAGMA compile_options}] ENABLE_URI_00_ERROR] >= 0}
} 1

finish_test
