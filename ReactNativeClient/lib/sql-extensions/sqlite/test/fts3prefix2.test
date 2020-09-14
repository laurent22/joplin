# 2012 January 25
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is testing the FTS3 module.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix fts3prefix2

ifcapable !fts3 {
  finish_test
  return
}

do_execsql_test 1.0 { PRAGMA page_size = 512 }
do_execsql_test 1.1 { 
  CREATE VIRTUAL TABLE t1 USING fts4(x, prefix="2,3");

  BEGIN;
    INSERT INTO t1 VALUES('T TX T TX T TX T TX T TX');
    INSERT INTO t1 SELECT * FROM t1;                       -- 2
    INSERT INTO t1 SELECT * FROM t1;                       -- 4
    INSERT INTO t1 SELECT * FROM t1;                       -- 8
    INSERT INTO t1 SELECT * FROM t1;                       -- 16
    INSERT INTO t1 SELECT * FROM t1;                       -- 32
    INSERT INTO t1 SELECT * FROM t1;                       -- 64
    INSERT INTO t1 SELECT * FROM t1;                       -- 128
    INSERT INTO t1 SELECT * FROM t1;                       -- 256
    INSERT INTO t1 SELECT * FROM t1;                       -- 512
    INSERT INTO t1 SELECT * FROM t1;                       -- 1024
    INSERT INTO t1 SELECT * FROM t1;                       -- 2048
  COMMIT;
}

do_execsql_test 1.2 {
  INSERT INTO t1 SELECT * FROM t1 LIMIT 10;
  INSERT INTO t1 SELECT * FROM t1 LIMIT 10;
  INSERT INTO t1 SELECT * FROM t1 LIMIT 10;
  DELETE FROM t1 WHERE docid > 5;
}

do_execsql_test 1.3 {
  SELECT * FROM t1 WHERE t1 MATCH 'T*';
} {
  {T TX T TX T TX T TX T TX}
  {T TX T TX T TX T TX T TX}
  {T TX T TX T TX T TX T TX}
  {T TX T TX T TX T TX T TX}
  {T TX T TX T TX T TX T TX}
}

finish_test
