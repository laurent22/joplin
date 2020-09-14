# 2007 April 6
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is database locks.
#
# $Id: lock4.test,v 1.10 2009/05/06 00:52:41 drh Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl

if {[atomic_batch_write test.db]} {
  # This test uses two processes, one of which blocks until the other
  # creates a *-journal file. Which doesn't work if atomic writes are
  # available.
  finish_test
  return
}

do_not_use_codec

# Initialize the test.db database so that it is non-empty
#
do_test lock4-1.1 {
  db eval {
     PRAGMA auto_vacuum=OFF;
     CREATE TABLE t1(x);
  }
  forcedelete test2.db test2.db-journal
  sqlite3 db2 test2.db
  db2 eval {
     PRAGMA auto_vacuum=OFF;
     CREATE TABLE t2(x)
  }
  db2 close
  list [file size test.db] [file size test2.db]
} {2048 2048}

# Create a script to drive a separate process that will
#
#     1.  Create a second database test2.db
#     2.  Get an exclusive lock on test2.db
#     3.  Add an entry to test.db in table t1, waiting as necessary.
#     4.  Commit the change to test2.db.
#
# Meanwhile, this process will:
# 
#     A.  Get an exclusive lock on test.db
#     B.  Attempt to read from test2.db but get an SQLITE_BUSY error.
#     C.  Commit the changes to test.db thus alloing the other process
#         to continue.
#
do_test lock4-1.2 {
 
  # Create a script for the second process to run.
  #
  set out [open test2-script.tcl w]
  puts $out "sqlite3_test_control_pending_byte [set sqlite_pending_byte]"
  puts $out {
     sqlite3 db2 test2.db
     db2 eval {
        BEGIN;
        INSERT INTO t2 VALUES(2);
     }
     sqlite3 db test.db
     db timeout 1000000
     db eval {
        INSERT INTO t1 VALUES(2);
     }
     db close
     db2 eval COMMIT
     exit
  }
  close $out

  # Begin a transaction on test.db.
  db eval {
     BEGIN EXCLUSIVE;
     INSERT INTO t1 VALUES(1);
  }

  # Kick off the second process.
  exec [info nameofexec] ./test2-script.tcl &

  # Wait until the second process has started its transaction on test2.db.
  while {![file exists test2.db-journal]} {
    after 10
  }

  # Try to write to test2.db. We are locked out.
  sqlite3 db2 test2.db
  catchsql {
    INSERT INTO t2 VALUES(1)
  } db2
} {1 {database is locked}}
do_test lock4-1.3 {
  db eval {
     COMMIT;
  }
  while {[file exists test2.db-journal]} {
    after 10
  }
  # The other process has committed its transaction on test2.db by 
  # deleting the journal file. But it might retain the lock for a 
  # fraction longer 
  #
  after 25
  db2 eval {
     SELECT * FROM t2
  }
} {2}

    
do_test lock4-999.1 {
  rename db2 {}
} {}

finish_test
