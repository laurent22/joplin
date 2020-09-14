# 2001 September 15
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
# focus of this script is database locks and the operation of the
# DEFERRED, IMMEDIATE, and EXCLUSIVE keywords as modifiers to the
# BEGIN command.
#
# $Id: lock3.test,v 1.4 2009/03/28 15:04:24 drh Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Establish two connections to the same database.  Put some
# sample data into the database.
#
do_test lock3-1.1 {
  file mkdir tempdir/t1/t2/t3
  sqlite3 db2 ./tempdir/t1//t2/./t3//./../..//./../../tempdir/..//test.db//
  execsql {
    CREATE TABLE t1(a);
    INSERT INTO t1 VALUES(1);
  }
  execsql {
    SELECT * FROM t1
  } db2
} 1

# Get a deferred lock on the database using one connection.  The
# other connection should still be able to write.
#
do_test lock3-2.1 {
  execsql {BEGIN DEFERRED TRANSACTION}
  execsql {INSERT INTO t1 VALUES(2)} db2
  execsql {END TRANSACTION}
  execsql {SELECT * FROM t1}
} {1 2}

# Get an immediate lock on the database using one connection.  The
# other connection should be able to read the database but not write
# it.
#
do_test lock3-3.1 {
  execsql {BEGIN IMMEDIATE TRANSACTION}
  catchsql {SELECT * FROM t1} db2
} {0 {1 2}}
do_test lock3-3.2 {
  catchsql {INSERT INTO t1 VALUES(3)} db2
} {1 {database is locked}}
do_test lock3-3.3 {
  execsql {END TRANSACTION}
} {}


# Get an exclusive lock on the database using one connection.  The
# other connection should be unable to read or write the database.
#
do_test lock3-4.1 {
  execsql {BEGIN EXCLUSIVE TRANSACTION}
  catchsql {SELECT * FROM t1} db2
} {1 {database is locked}}
do_test lock3-4.2 {
  catchsql {INSERT INTO t1 VALUES(3)} db2
} {1 {database is locked}}
do_test lock3-4.3 {
  execsql {END TRANSACTION}
} {}

catch {db2 close}

finish_test
