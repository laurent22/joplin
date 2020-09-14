# 2008 April 14
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
# The focus of this file is in making sure that rolling back
# a statement journal works correctly.
#
# $Id: tempdb.test,v 1.4 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

if {[atomic_batch_write test.db]} {
  finish_test
  return
}

# Use a temporary database.
#
db close
sqlite3 db {}

# Force a statement journal rollback on a database file that
# has never been opened.
#
do_test tempdb-1.1 {
  execsql {
    BEGIN;
    CREATE TABLE t1(x UNIQUE);
    CREATE TABLE t2(y);
    INSERT INTO t2 VALUES('hello');
    INSERT INTO t2 VALUES(NULL);
  }
  # Because of the transaction, the temporary database file
  # has not even been opened yet.  The following statement
  # will cause a statement journal rollback on this non-existant
  # file.
  catchsql {
    INSERT INTO t1
    SELECT CASE WHEN y IS NULL THEN test_error('oops', 11) ELSE y END
      FROM t2;
  }
} {1 oops}

# Verify that no writes occurred in t1.
#
do_test tempdb-1.2 {
  execsql {
    SELECT * FROM t1
  }
} {}

do_test tempdb-2.1 {
  # Set $::jrnl_in_memory if the journal file is expected to be in-memory.
  # Similarly, set $::subj_in_memory if the sub-journal file is expected
  # to be in memory. These variables are used to calculate the expected
  # number of open files in the test cases below.
  #
  set jrnl_in_memory [expr {[permutation] eq "inmemory_journal"}]
  set subj_in_memory [expr {$jrnl_in_memory || $TEMP_STORE>=2}]

  db close
  sqlite3 db test.db
} {}
do_test tempdb-2.2 {
  execsql {
    CREATE TABLE t1 (a PRIMARY KEY, b, c);
    CREATE TABLE t2 (a, b, c);
    BEGIN;
      INSERT INTO t1 VALUES(1, 2, 3);
      INSERT INTO t1 VALUES(4, 5, 6);
      INSERT INTO t2 VALUES(7, 8, 9);
      INSERT INTO t2 SELECT * FROM t1;
  }
  catchsql { INSERT INTO t1 SELECT * FROM t2 }
  set sqlite_open_file_count
} [expr 1 + (0==$jrnl_in_memory)]
do_test tempdb-2.3 {
  execsql {
    PRAGMA temp_store = 'memory';
    ROLLBACK;
    BEGIN;
      INSERT INTO t1 VALUES(1, 2, 3);
      INSERT INTO t1 VALUES(4, 5, 6);
      INSERT INTO t2 SELECT * FROM t1;
  }
  catchsql { INSERT INTO t1 SELECT * FROM t2 }
  set sqlite_open_file_count
} [expr 1 + (0==$jrnl_in_memory)]

finish_test
