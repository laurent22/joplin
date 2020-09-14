# 2011 May 16
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
# focus of this file is testing the PRAGMA journal_size_limit when
# in WAL mode.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !wal {finish_test ; return }

# Case 1:  No size limit.  Journal can get large.
#
do_test wal7-1.0 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval {
    PRAGMA page_size=1024;
    PRAGMA journal_mode=WAL;
    PRAGMA wal_autocheckpoint=50;  -- 50 pages
    CREATE TABLE t1(x, y UNIQUE);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t1 VALUES(zeroblob(200000),4);
    CREATE TABLE t2(z);
    DELETE FROM t1;
    INSERT INTO t2 SELECT x FROM t1;
  }
  expr {[file size test.db-wal]>50*1100}
} 1
do_test wal7-1.1 {
  db eval {PRAGMA wal_checkpoint}
  expr {[file size test.db-wal]>50*1100}
} 1
do_test wal7-1.2 {
  db eval {INSERT INTO t2 VALUES('hi');}
  expr {[file size test.db-wal]>50*1100}
} 1

# Case 2:  Size limit at half the autocheckpoint size.
#
do_test wal7-2.0 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval {
    PRAGMA page_size=1024;
    PRAGMA journal_mode=WAL;
    PRAGMA wal_autocheckpoint=50;  -- 50 pages
    PRAGMA journal_size_limit=25000;
    CREATE TABLE t1(x, y UNIQUE);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t1 VALUES(zeroblob(200000),4);
    CREATE TABLE t2(z);
    DELETE FROM t1;
    INSERT INTO t2 VALUES(1);
  }
  file size test.db-wal
} 25000


# Case 3:  Size limit of zero.
#
do_test wal7-3.0 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval {
    PRAGMA page_size=1024;
    PRAGMA journal_mode=WAL;
    PRAGMA wal_autocheckpoint=50;  -- 50 pages
    PRAGMA journal_size_limit=0;
    CREATE TABLE t1(x, y UNIQUE);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t1 VALUES(zeroblob(200000),4);
    CREATE TABLE t2(z);
    DELETE FROM t1;
    INSERT INTO t2 VALUES(1);
  }
  set sz [file size test.db-wal]
  expr {$sz>0 && $sz<13700}
} 1


# Case 4:  Size limit set before going WAL
#
do_test wal7-4.0 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  db eval {
    PRAGMA page_size=1024;
    PRAGMA journal_size_limit=25000;
    PRAGMA journal_mode=WAL;
    PRAGMA wal_autocheckpoint=50;  -- 50 pages
    CREATE TABLE t1(x, y UNIQUE);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t1 VALUES(zeroblob(200000),4);
    CREATE TABLE t2(z);
    DELETE FROM t1;
    INSERT INTO t2 VALUES(1);
  }
  set sz [file size test.db-wal]
} 25000





finish_test
