# 2010 September 20
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.
#
# This file implements tests to verify that ticket [313723c356] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl

if {![wal_is_capable]} { finish_test ; return }

do_execsql_test tkt-313723c356.1 {
  PRAGMA page_size = 1024;
  PRAGMA journal_mode = WAL;
  CREATE TABLE t1(a, b);
  CREATE INDEX i1 ON t1(a, b);
  INSERT INTO t1 VALUES(randomblob(400), randomblob(400));
  INSERT INTO t1 SELECT randomblob(400), randomblob(400) FROM t1;
  INSERT INTO t1 SELECT randomblob(400), randomblob(400) FROM t1;
  INSERT INTO t1 SELECT randomblob(400), randomblob(400) FROM t1;
  INSERT INTO t1 SELECT randomblob(400), randomblob(400) FROM t1;
} {wal}
faultsim_save_and_close

do_faultsim_test tkt-313723c356.2 -faults shmerr* -prep {
  faultsim_restore_and_reopen
  sqlite3 db2 test.db
  db eval  { SELECT * FROM t1 }
  db2 eval { UPDATE t1 SET a = randomblob(399) }
  db2 close
} -body {
  # At this point, the cache contains all of table t1 and none of index i1. The
  # cache is out of date. When the bug existed and the right xShmLock() fails
  # in the following statement, the internal cache of the WAL header was
  # being updated, but the contents of the page-cache not flushed. This causes
  # the integrity-check in the "-test" code to fail, as it is comparing the
  # cached (out-of-date) version of table t1 with the on disk (up-to-date)
  # version of index i1.
  #
  execsql { SELECT min(rowid) FROM t1 }
} -test {
  faultsim_test_result {0 1}
  faultsim_integrity_check
}

finish_test
