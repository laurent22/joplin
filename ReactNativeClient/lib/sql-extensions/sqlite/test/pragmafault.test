# 2010 June 15
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
source $testdir/lock_common.tcl
source $testdir/malloc_common.tcl
set testprefix pragmafault

db close
sqlite3 db test.db
sqlite3_db_config_lookaside db 0 0 0
do_execsql_test 1.0 {
  CREATE TABLE t1(a, b, CHECK(a!=b));
  INSERT INTO t1 VALUES(1, 2);
  INSERT INTO t1 VALUES(3, 4);
}
faultsim_save_and_close

do_faultsim_test 1 -prep {
  faultsim_restore_and_reopen
} -body {
  catchsql { PRAGMA integrity_check }
  set {} 0
} -test {
  faultsim_test_result {0 0} 
}


finish_test
