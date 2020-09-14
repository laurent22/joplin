# 2011 Feb 04
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
# This file test deferred foreign key constraint processing to make
# sure that when a statement not within BEGIN...END fails a constraint,
# that statement doesn't hold the transaction open thus allowing
# a subsequent statement to fail a deferred constraint with impunity.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable {!foreignkey||!trigger} {
  finish_test
  return
}

# Create a table and some data to work with.
#
do_test fkey4-1.1 {
  execsql {
    PRAGMA foreign_keys = ON;
    CREATE TABLE t1(a PRIMARY KEY, b);
    CREATE TABLE t2(c REFERENCES t1 DEFERRABLE INITIALLY DEFERRED, d);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t2 VALUES(1,3);
  }
} {}

do_test fkey4-1.2 {
  set ::DB [sqlite3_connection_pointer db]
  set ::SQL {INSERT INTO t2 VALUES(2,4)}
  set ::STMT1 [sqlite3_prepare_v2 $::DB $::SQL -1 TAIL]
  sqlite3_step $::STMT1
} {SQLITE_CONSTRAINT}
verify_ex_errcode fkey4-1.2b SQLITE_CONSTRAINT_FOREIGNKEY
do_test fkey4-1.3 {
  set ::STMT2 [sqlite3_prepare_v2 $::DB $::SQL -1 TAIL]
  sqlite3_step $::STMT2
} {SQLITE_CONSTRAINT}
verify_ex_errcode fkey4-1.3b SQLITE_CONSTRAINT_FOREIGNKEY
do_test fkey4-1.4 {
  db eval {SELECT * FROM t2}
} {1 3}
sqlite3_finalize $::STMT1
sqlite3_finalize $::STMT2

finish_test
