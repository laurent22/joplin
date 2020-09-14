# 2019-01-26
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
# Test cases for INSERT

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix insertfault

do_execsql_test 1.0 {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b, c, d DEFAULT true);
  INSERT INTO t1 DEFAULT VALUES;
  SELECT * FROM t1;
} {1 {} {} 1}
faultsim_save_and_close

breakpoint
do_faultsim_test 1 -faults oom* -prep {
  faultsim_restore_and_reopen
  db eval { SELECT * FROM sqlite_master } 
} -body {
  execsql { SELECT * FROM t1 }
} -test {
  faultsim_test_result {0 {1 {} {} 1}}
}


finish_test
