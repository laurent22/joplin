# 2012 October 15
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
# This test case tests that a problem causing a failing assert() has
# been fixed. The problem occurred if a writer process with a subset
# of the *shm file mapped rolled back a transaction begun after the
# entire WAL file was checkpointed into the db file (i.e. a transaction
# that would have restarted the WAL file from the beginning).
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix wal9

sqlite3 db2 test.db

do_execsql_test 1.0 {
  PRAGMA page_size = 1024;
  PRAGMA journal_mode = WAL;
  PRAGMA wal_autocheckpoint = 0;
  CREATE TABLE t(x);
} {wal 0}

do_test 1.1 { 
  execsql "SELECT * FROM t" db2
} {}

do_execsql_test 1.2 {
  BEGIN;
    INSERT INTO t VALUES(randomblob(100));
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;

    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;

    INSERT INTO t SELECT randomblob(100) FROM t;
    INSERT INTO t SELECT randomblob(100) FROM t;
  COMMIT;
} {}

# Check file sizes are as expected. The real requirement here is that 
# the *shm file is now more than one chunk (>32KiB).
#
# The sizes of various files are slightly different in normal and 
# auto-vacuum mode.
do_test 1.3 { file size test.db     } {1024}
do_test 1.4 { expr {[file size test.db-wal]>(1500*1024)} } {1}
do_test 1.5 { expr {[file size test.db-shm]>32768} }       {1}
do_test 1.6 { 
  foreach {a b c} [db eval {PRAGMA wal_checkpoint}] break
  list [expr {$a==0}] [expr {$b>14500}] [expr {$c>14500}] [expr {$b==$c}]
} {1 1 1 1}

# At this point connection [db2] has mapped the first 32KB of the *shm file
# only. Because the entire WAL file has been checkpointed, it is not 
# necessary to map any more of the *-shm file to read or write the database
# (since all data will be read directly from the db file). 
#
# However, at one point if a transaction that had not yet written to the 
# WAL file was rolled back an assert() attempting to verify that the entire 
# *-shm file was mapped would fail. If NDEBUG was defined (and the assert() 
# disabled) this bug caused SQLite to ignore the return code of a mmap() 
# call.
#
do_test 1.7 {
  execsql { 
    BEGIN;
      INSERT INTO t VALUES('hello');
    ROLLBACK;
  } db2
} {}
db2 close

finish_test
