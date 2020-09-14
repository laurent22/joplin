# 2004 September 2
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
# focus of this script testing the callback-free C/C++ API and in
# particular the behavior of sqlite3_step() when trying to commit
# with lock contention.
#
# $Id: capi3b.test,v 1.4 2007/08/10 19:46:14 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl


# These tests depend on the pager holding changes in cache
# until it is time to commit.  But that won't happen if the
# soft-heap-limit is set too low.  So disable the soft heap limit
# for the duration of this test.
#
sqlite3_soft_heap_limit 0


set DB [sqlite3_connection_pointer db]
sqlite3 db2 test.db
set DB2 [sqlite3_connection_pointer db2]

# Create some data in the database
#
do_test capi3b-1.1 {
  execsql {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    SELECT * FROM t1
  }
} {1 2}

# Make sure the second database connection can see the data
#
do_test capi3b-1.2 {
  execsql {
    SELECT * FROM t1
  } db2
} {1 2}

# First database connection acquires a shared lock
#
do_test capi3b-1.3 {
  execsql {
    BEGIN;
    SELECT * FROM t1;
  }
} {1 2}

# Second database connection tries to write.  The sqlite3_step()
# function returns SQLITE_BUSY because it cannot commit.
#
do_test capi3b-1.4 {
  set VM [sqlite3_prepare $DB2 {INSERT INTO t1 VALUES(3)} -1 TAIL]
  sqlite3_step $VM
} SQLITE_BUSY

# The sqlite3_step call can be repeated multiple times.
#
do_test capi3b-1.5.1 {
  sqlite3_step $VM
} SQLITE_BUSY
do_test capi3b-1.5.2 {
  sqlite3_step $VM
} SQLITE_BUSY

# The first connection closes its transaction.  This allows the second
# connections sqlite3_step to succeed.
#
do_test capi3b-1.6 {
  execsql COMMIT
  sqlite3_step $VM
} SQLITE_DONE
do_test capi3b-1.7 {
  sqlite3_finalize $VM
} SQLITE_OK
do_test capi3b-1.8 {
  execsql {SELECT * FROM t1} db2
} {1 2 3}
do_test capi3b-1.9 {
  execsql {SELECT * FROM t1}
} {1 2 3}

# Start doing a SELECT with one connection.  This gets a SHARED lock.
# Then do an INSERT with the other connection.  The INSERT should
# not be able to complete until the SELECT finishes.
#
do_test capi3b-2.1 {
  set VM1 [sqlite3_prepare $DB {SELECT * FROM t1} -1 TAIL]
  sqlite3_step $VM1
} SQLITE_ROW
do_test capi3b-2.2 {
  sqlite3_column_text $VM1 0
} 1
do_test capi3b-2.3 {
  set VM2 [sqlite3_prepare $DB2 {INSERT INTO t1 VALUES(4)} -1 TAIL]
  sqlite3_step $VM2
} SQLITE_BUSY
do_test capi3b-2.4 {
  sqlite3_step $VM1
} SQLITE_ROW
do_test capi3b-2.5 {
  sqlite3_column_text $VM1 0
} 2
do_test capi3b-2.6 {
  sqlite3_step $VM2
} SQLITE_BUSY
do_test capi3b-2.7 {
  sqlite3_step $VM1
} SQLITE_ROW
do_test capi3b-2.8 {
  sqlite3_column_text $VM1 0
} 3
do_test capi3b-2.9 {
  sqlite3_step $VM2
} SQLITE_BUSY
do_test capi3b-2.10 {
  sqlite3_step $VM1
} SQLITE_DONE
do_test capi3b-2.11 {
  sqlite3_step $VM2
} SQLITE_DONE
do_test capi3b-2.12 {
  sqlite3_finalize $VM1
  sqlite3_finalize $VM2
  execsql {SELECT * FROM t1}
} {1 2 3 4}

catch {db2 close}

sqlite3_soft_heap_limit $cmdlinearg(soft-heap-limit)
finish_test
