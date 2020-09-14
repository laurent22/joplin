# 2013-05-23
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
source $testdir/malloc_common.tcl
ifcapable !mmap {
  finish_test
  return
}
set testprefix mmapfault

set a_string_counter 1
proc a_string {n} {
  global a_string_counter
  incr a_string_counter
  string range [string repeat "${a_string_counter}." $n] 1 $n
}
db func a_string a_string

do_test 1-pre {
  execsql {
    CREATE TABLE t1(a UNIQUE, b UNIQUE);
    INSERT INTO t1 VALUES(a_string(200), a_string(300));
    INSERT INTO t1 SELECT a_string(200), a_string(300) FROM t1;
    INSERT INTO t1 SELECT a_string(200), a_string(300) FROM t1;
  }
  faultsim_save_and_close
} {}


do_faultsim_test 1 -prep {
  faultsim_restore_and_reopen
  db func a_string a_string
  execsql {
    PRAGMA mmap_size = 1000000;
    PRAGMA cache_size = 5;
    BEGIN;
      INSERT INTO t1 SELECT a_string(200), a_string(300) FROM t1;
      INSERT INTO t1 SELECT a_string(200), a_string(300) FROM t1;
      INSERT INTO t1 SELECT a_string(200), a_string(300) FROM t1;
      INSERT INTO t1 SELECT a_string(200), a_string(300) FROM t1;
  }
} -body {
  execsql { INSERT INTO t1 VALUES(a_string(200), a_string(300)) }
} -test {
  faultsim_test_result {0 {}} 

  if {[sqlite3_get_autocommit db]} {
    sqlite3 db2 test.db
    set nRow [db2 one {SELECT count(*) FROM t1}]
    if {$nRow!=4} { error "Database content appears incorrect (1)" }
    db2 close
  }

  execsql { INSERT INTO t1 VALUES(a_string(201), a_string(301)) }
  set nRow [db one {SELECT count(*) FROM t1}]
  if {$nRow!=5 && $nRow!=66 && $nRow!=65} { 
    error "Database content appears incorrect (2) ($nRow)" 
  }

  catch { execsql COMMIT }
}



finish_test
