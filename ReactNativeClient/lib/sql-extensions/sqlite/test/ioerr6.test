# 2012 December 18
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
set ::testprefix ioerr6

ifcapable !atomicwrite {
  puts "skipping tests - not compiled with SQLITE_ENABLE_ATOMIC_WRITE..."
  finish_test
  return
}

if {[permutation]=="inmemory_journal"} {
  # These tests will not work with in-memory journals (as persistent VFS
  # errors commencing after a transaction has started to write to the db
  # cannot be recovered from).
  finish_test
  return
}

faultsim_save_and_close

do_test 1.1 {
  testvfs shmfault -default true
  shmfault devchar atomic
  sqlite3 db test.db
  execsql {
    CREATE TABLE t1(a, b);
    CREATE INDEX i1 ON t1(a, b);
    INSERT INTO t1 VALUES(1, 2);
    INSERT INTO t1 VALUES(2, 4);
    INSERT INTO t1 VALUES(3, 6);
    INSERT INTO t1 VALUES(4, 8);
  }

  # Cause the first call to xWrite() to fail with SQLITE_FULL.
  shmfault full 2 1
  catchsql { INSERT INTO t1 VALUES(5, 10) }
} {1 {database or disk is full}}

do_test 1.2 {
  execsql { PRAGMA integrity_check }
} {ok}

db close
shmfault delete

do_faultsim_test 2 -faults full* -prep {
  shmfault devchar atomic
  faultsim_restore
  sqlite3 db test.db
} -body {
  db eval {
    CREATE TABLE t1(x PRIMARY KEY);
    INSERT INTO t1 VALUES('abc');
  }
} -test {
  set res [db one { PRAGMA integrity_check }]
  if {$res != "ok"} {
    error "integrity check: $res"
  }
}

do_faultsim_test 3 -faults full* -prep {
  shmfault devchar atomic
  faultsim_restore
  sqlite3 db test.db
} -body {
  db eval {
    CREATE TABLE t1(x);
    CREATE TABLE t2(x);
  }
} -test {
  db eval { CREATE TABLE t3(x) }
  if {[db one { PRAGMA integrity_check }] != "ok"} {
    error "integrity check failed"
  }
}

finish_test
