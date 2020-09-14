# 2013 April 22
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the "fts3tokenize" virtual table
# that is part of the FTS3 module.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
ifcapable !fts3 { finish_test ; return }
set ::testprefix fts3tok_err


faultsim_save_and_close
do_faultsim_test fts3tok_err-1 -faults oom* -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { CREATE VIRTUAL TABLE t1 USING fts3tokenize("simple"); }
} -test {
  faultsim_test_result {0 {}} 
}

do_test fts3tok_err-2.prep {
  faultsim_delete_and_reopen 
  execsql { CREATE VIRTUAL TABLE t1 USING fts3tokenize("simple"); }
  faultsim_save_and_close
} {}

do_faultsim_test fts3tok_err-2 -faults oom* -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { SELECT token FROM t1 WHERE input = 'A galaxy far, far away' } 
} -test {
  faultsim_test_result {0 {a galaxy far far away}} 
}


finish_test
