# 2018-04-17
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
# Test cases for UPSERT

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix upsertfault

do_execsql_test 1.0 {
  CREATE TABLE t1(a PRIMARY KEY, b, c, d, UNIQUE(b, c));
  INSERT INTO t1 VALUES(1, 1, 1, 1);
  INSERT INTO t1 VALUES(2, 2, 2, 2);
}
faultsim_save_and_close

do_faultsim_test 1 -faults oom* -prep {
  faultsim_restore_and_reopen
  db eval { SELECT * FROM sqlite_master } 
} -body {
  execsql {
     INSERT INTO t1 VALUES(3, 2, 2, NULL) ON CONFLICT(b, c) DO
       UPDATE SET d=d+1;
  }
} -test {
  faultsim_test_result {0 {}}
}


finish_test
