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
# The tests in this file test the pager modules response to various
# fault conditions (OOM, IO error, disk full etc.). They are similar
# to those in file pagerfault1.test. 
#
# More specifically, the tests in this file are those deemed too slow to 
# run as part of pagerfault1.test.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/lock_common.tcl
source $testdir/malloc_common.tcl

if {[permutation] == "inmemory_journal"} {
  finish_test
  return
}

sqlite3_memdebug_vfs_oom_test 0

set a_string_counter 1
proc a_string {n} {
  global a_string_counter
  incr a_string_counter
  string range [string repeat "${a_string_counter}." $n] 1 $n
}
db func a_string a_string

do_test pagerfault2-1-pre1 {
  faultsim_delete_and_reopen
  db func a_string a_string
  execsql {
    PRAGMA auto_vacuum = 0;
    PRAGMA journal_mode = DELETE;
    PRAGMA page_size = 1024;
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(a_string(401), a_string(402));
  }
  for {set ii 0} {$ii < 13} {incr ii} {
    execsql { INSERT INTO t1 SELECT a_string(401), a_string(402) FROM t1 }
  }
  faultsim_save_and_close
  file size test.db
} [expr 1024 * 8268]

do_faultsim_test pagerfault2-1 -faults oom-transient -prep {
  faultsim_restore_and_reopen
  sqlite3_db_config_lookaside db 0 256 4096
  execsql { 
    BEGIN;
      SELECT * FROM t1;
      INSERT INTO t1 VALUES(5, 6);
      SAVEPOINT abc;
        UPDATE t1 SET a = a||'x' WHERE rowid<3700;
  }
} -body {
  execsql { UPDATE t1 SET a = a||'x' WHERE rowid>=3700 AND rowid<=4200 }
  execsql { ROLLBACK TO abc }
} -test {
  faultsim_test_result {0 {}}
}

do_test pagerfault2-2-pre1 {
  faultsim_restore_and_reopen
  execsql { DELETE FROM t1 }
  faultsim_save_and_close
} {}

do_faultsim_test pagerfault2-2 -faults oom-transient -prep {
  faultsim_restore_and_reopen
  sqlite3_db_config_lookaside db 0 256 4096
  db func a_string a_string

  execsql { 
    PRAGMA cache_size = 20;
    BEGIN;
      INSERT INTO t1 VALUES(a_string(401), a_string(402));
      SAVEPOINT abc;
  }
} -body {
  execsql { INSERT INTO t1 VALUES (a_string(2000000), a_string(2500000)) }
} -test {
  faultsim_test_result {0 {}}
}

sqlite3_memdebug_vfs_oom_test 1
finish_test
