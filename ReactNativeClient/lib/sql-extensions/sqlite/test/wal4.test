# 2010 July 1
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# Verify that an empty database and a non-empty WAL file do not
# result in database corruption
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
ifcapable !wal {finish_test ; return }

do_test wal4-1.1 {
  execsql {
    PRAGMA journal_mode=WAL;
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    SELECT x FROM t1 ORDER BY x;
  }
} {wal 1 2}

do_test wal4-1.2 {
  # Save a copy of the file-system containing the wal and wal-index files 
  # only (no database file).
  faultsim_save_and_close
  forcedelete sv_test.db
} {}

do_test wal4-1.3 {
  faultsim_restore_and_reopen
  catchsql { SELECT * FROM t1 }
} {1 {no such table: t1}}

do_faultsim_test wal4-2 -prep {
  faultsim_restore_and_reopen
} -body {
  execsql { SELECT name FROM sqlite_master }
} -test {
  # Result should be zero rows (empty db file).
  #
  faultsim_test_result {0 {}}

  # If the SELECT finished successfully, the WAL file should have been
  # deleted. In no case should the database file have been written, so
  # it should still be zero bytes in size regardless of whether or not
  # a fault was injected. Test these assertions:
  #
  if { $testrc==0 && [file exists test.db-wal] } { 
    error "Wal file was not deleted"
  }
  if { [file size test.db]!=0 } { 
    error "Db file grew to [file size test.db] bytes"
  }
}

finish_test
