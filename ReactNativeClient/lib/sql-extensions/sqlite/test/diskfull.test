# 2001 October 12
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
# focus of this file is testing for correct handling of disk full
# errors.
# 
# $Id: diskfull.test,v 1.8 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

set sqlite_io_error_persist 0
set sqlite_io_error_hit 0
set sqlite_io_error_pending 0
do_test diskfull-1.1 {
  execsql {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(randstr(1000,1000));
    INSERT INTO t1 SELECT * FROM t1;
    INSERT INTO t1 SELECT * FROM t1;
    INSERT INTO t1 SELECT * FROM t1;
    INSERT INTO t1 SELECT * FROM t1;
    CREATE INDEX t1i1 ON t1(x);
    CREATE TABLE t2 AS SELECT x AS a, x AS b FROM t1;
    CREATE INDEX t2i1 ON t2(b);
  }
} {}
set sqlite_diskfull_pending 0
integrity_check diskfull-1.2
do_test diskfull-1.3 {
  set sqlite_diskfull_pending 1
  catchsql {
    INSERT INTO t1 SELECT * FROM t1;
  }
} {1 {database or disk is full}}
set sqlite_diskfull_pending 0
integrity_check diskfull-1.4
do_test diskfull-1.5 {
  set sqlite_diskfull_pending 1
  catchsql {
    DELETE FROM t1;
  }
} {1 {database or disk is full}}
set sqlite_diskfull_pending 0
set sqlite_io_error_hit 0
integrity_check diskfull-1.6

proc do_diskfull_test {prefix sql} {
  set ::go 1
  set ::sql $sql
  set ::i 1
  while {$::go} {
    incr ::i
    do_test ${prefix}.$::i.1 {
      set ::sqlite_diskfull_pending $::i
      set ::sqlite_diskfull 0
      set r [catchsql $::sql]
      if {!$::sqlite_diskfull} {
        set r {1 {database or disk is full}}
        set ::go 0
      }
      if {$r=="1 {disk I/O error}"} {
        set r {1 {database or disk is full}}
      }
      set r
    } {1 {database or disk is full}}
    set ::sqlite_diskfull_pending 0
    db close
    sqlite3 db test.db
    integrity_check ${prefix}.$::i.2
  }
}

do_diskfull_test diskfull-2 VACUUM

# db close
# forcedelete test.db
# forcedelete test.db-journal
# sqlite3 db test.db
# 
# do_test diskfull-3.1 {
#   execsql {
#     PRAGMA default_cache_size = 10;
#     CREATE TABLE t3(a, b, UNIQUE(a, b));
#     INSERT INTO t3 VALUES( randstr(100, 100), randstr(100, 100) );
#     INSERT INTO t3 SELECT randstr(100, 100), randstr(100, 100) FROM t3;
#     INSERT INTO t3 SELECT randstr(100, 100), randstr(100, 100) FROM t3;
#     INSERT INTO t3 SELECT randstr(100, 100), randstr(100, 100) FROM t3;
#     INSERT INTO t3 SELECT randstr(100, 100), randstr(100, 100) FROM t3;
#     INSERT INTO t3 SELECT randstr(100, 100), randstr(100, 100) FROM t3;
#     INSERT INTO t3 SELECT randstr(100, 100), randstr(100, 100) FROM t3;
#     INSERT INTO t3 SELECT randstr(100, 100), randstr(100, 100) FROM t3;
#     UPDATE t3 
#     SET b = (SELECT a FROM t3 WHERE rowid = (SELECT max(rowid)-1 FROM t3))
#     WHERE rowid = (SELECT max(rowid) FROM t3);
#     PRAGMA cache_size;
#   }
# } {10}
# 
# do_diskfull_test diskfull-3.2 {
#   BEGIN;
#     INSERT INTO t3 VALUES( randstr(100, 100), randstr(100, 100) );
#     UPDATE t3 SET a = b;
#   COMMIT;
# }

finish_test
