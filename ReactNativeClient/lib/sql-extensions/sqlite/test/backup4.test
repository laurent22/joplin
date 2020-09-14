# 2012 October 13
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
# The tests in this file verify that if an empty database (zero bytes in 
# size) is used as the source of a backup operation, the final destination
# database is one page in size.
#
# The destination must consist of at least one page as truncating a 
# database file to zero bytes is equivalent to resetting the database
# schema cookie and change counter. Doing that could cause other clients
# to become confused and continue using out-of-date cache data.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix backup4

# The codec logic does not work for zero-length database files.  A database
# file must contain at least one page in order to be recognized as an
# encrypted database.
do_not_use_codec

#-------------------------------------------------------------------------
# At one point this test was failing because [db] was using an out of
# date schema in test case 1.2.
#
do_execsql_test 1.0 {
  CREATE TABLE t1(x, y, UNIQUE(x, y));
  INSERT INTO t1 VALUES('one', 'two');
  SELECT * FROM t1 WHERE x='one';
  PRAGMA integrity_check;
} {one two ok}

do_test 1.1 {
  sqlite3 db1 :memory:
  db1 backup test.db
  sqlite3 db1 test.db
  db1 eval {
    CREATE TABLE t1(x, y);
    INSERT INTO t1 VALUES('one', 'two');
  }
  db1 close
} {}

do_execsql_test 1.2 {
  SELECT * FROM t1 WHERE x='one';
  PRAGMA integrity_check;
} {one two ok}

db close
forcedelete test.db
forcedelete test.db2
sqlite3 db test.db

#-------------------------------------------------------------------------
# Test that if the source is zero bytes, the destination database 
# consists of a single page only.
#
do_execsql_test 2.1 {
  CREATE TABLE t1(a, b);
  CREATE INDEX i1 ON t1(a, b);
}
do_test 2.2 { file size test.db } [expr $AUTOVACUUM ? 4096 : 3072]

do_test 2.3 {
  sqlite3 db1 test.db2
  db1 backup test.db
  db1 close
  file size test.db
} {1024}

do_test 2.4 { file size test.db2 } 0

db close
forcedelete test.db
forcedelete test.db2
sqlite3 db test.db

#-------------------------------------------------------------------------
# Test that if the destination has a page-size larger than the implicit
# page-size of the source, the final destination database still consists
# of a single page.
#
do_execsql_test 3.1 {
  PRAGMA page_size = 4096;
  CREATE TABLE t1(a, b);
  CREATE INDEX i1 ON t1(a, b);
}
do_test 3.2 { file size test.db } [expr $AUTOVACUUM ? 16384 : 12288]

do_test 3.3 {
  sqlite3 db1 test.db2
  db1 backup test.db
  db1 close
  file size test.db
} {1024}

do_test 3.4 { file size test.db2 } 0

finish_test
