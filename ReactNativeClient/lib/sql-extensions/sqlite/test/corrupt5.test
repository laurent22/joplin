# 2008 Jan 22
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
# This file implements tests to make sure SQLite does not crash or
# segfault if it sees a corrupt database file.  Checks for 
# malformed schema.
#
# $Id: corrupt5.test,v 1.3 2009/06/04 02:47:04 shane Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# These tests deal with corrupt database files
#
database_may_be_corrupt

# We must have the page_size pragma for these tests to work.
#
ifcapable !pager_pragmas {
  finish_test
  return
}

# Create a database with a freelist containing at least two pages.
#
do_test corrupt5-1.1 {
  sqlite3_db_config db DEFENSIVE 0
  execsql {
    CREATE TABLE t1(a,b,c);
    CREATE INDEX i1 ON t1(a,b);
    PRAGMA writable_schema=ON;
    UPDATE sqlite_master SET name=NULL, sql=NULL WHERE name='i1';
  }
  db close
  sqlite3 db test.db
  catchsql {
    SELECT * FROM t1
  }
} {1 {malformed database schema (?)}}

finish_test
