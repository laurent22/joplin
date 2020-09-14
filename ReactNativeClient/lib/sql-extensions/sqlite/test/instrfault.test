# 2016 November 4
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is testing OOM error handling within the built-in 
# INSTR() function.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix instrfault

# Use big NEEDLE and HAYSTACK strings. Strings so large they cannot
# use lookaside buffers.
#
set ::NEEDLE [string repeat "abcdefghijklmnopqrstuvwxyz" 10]
set ::HAYSTACK "[string repeat 123 10]$NEEDLE[string repeat 456 10]"

foreach {enc} {
  utf8
  utf16
} {
  reset_db
  sqlite3_db_config_lookaside db 0 0 0

  execsql "PRAGMA encoding = $enc"
  do_execsql_test 1.$enc.1 {
    CREATE TABLE t1(n, h);
    INSERT INTO t1 VALUES($::NEEDLE, $::HAYSTACK);
  } {}

  do_faultsim_test 1.$enc.1 -faults oom-t* -prep {
    execsql { SELECT instr(h, n) FROM t1 }
  } -body {
    execsql { SELECT instr(h, n) FROM t1 }
  } -test {
    faultsim_test_result {0 31}
  }

  do_faultsim_test 1.$enc.2 -faults oom-t* -prep {
    execsql { SELECT instr($::HAYSTACK, $::NEEDLE) FROM t1 }
  } -body {
    execsql { SELECT instr($::HAYSTACK, $::NEEDLE) FROM t1 }
  } -test {
    faultsim_test_result {0 31}
  }

  do_faultsim_test 1.$enc.3 -faults oom-t* -prep {
    set ::stmt [sqlite3_prepare_v2 db "SELECT instr(?, ?)" -1 dummy]
    sqlite3_bind_text $::stmt 1 $::HAYSTACK [string length $::HAYSTACK]
    sqlite3_bind_text $::stmt 2 $::NEEDLE [string length $::NEEDLE]
  } -body {
    set rc [sqlite3_step $::stmt]
    if {$rc=="SQLITE_NOMEM"} { error "out of memory" }
    sqlite3_column_int $::stmt 0
  } -test {
    faultsim_test_result {0 31}
    sqlite3_finalize $::stmt
  }

  do_faultsim_test 1.$enc.4 -faults oom-t* -prep {
    set ::stmt [sqlite3_prepare_v2 db "SELECT instr(?, ?)" -1 dummy]
    sqlite3_bind_blob $::stmt 1 $::HAYSTACK [string length $::HAYSTACK]
    sqlite3_bind_blob $::stmt 2 $::NEEDLE [string length $::NEEDLE]
  } -body {
    set rc [sqlite3_step $::stmt]
    if {$rc=="SQLITE_NOMEM"} { error "out of memory" }
    sqlite3_column_int $::stmt 0
  } -test {
    faultsim_test_result {0 31}
    sqlite3_finalize $::stmt
  }

  do_execsql_test 1.$enc.5.0 {
    CREATE TABLE h1(a, b);
    INSERT INTO h1 VALUES('abcdefg%200hijkl', randomblob(200));
    INSERT INTO h1 SELECT b, a FROM h1;
  }
  do_faultsim_test 1.$enc.5 -faults oom-t* -body {
    execsql { SELECT rowid FROM h1 WHERE instr(a,b) }
  } -test {}
}

finish_test
