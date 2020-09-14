# 2018-04-17
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
# Test cases for UPSERT
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix zipfile

do_execsql_test upsert3-100 {
  CREATE TABLE t1(k int, v text);
  CREATE UNIQUE INDEX x1 ON t1(k, v);
} {}
do_catchsql_test upsert3-110 {
  INSERT INTO t1 VALUES(0,'abcdefghij')
     ON CONFLICT(k) DO NOTHING;
} {1 {ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint}}
do_catchsql_test upsert3-120 {
  INSERT INTO t1 VALUES(0,'abcdefghij')
     ON CONFLICT(v) DO NOTHING;
} {1 {ON CONFLICT clause does not match any PRIMARY KEY or UNIQUE constraint}}

do_execsql_test upsert3-130 {
  INSERT INTO t1 VALUES(0, 'abcdefghij')
      ON CONFLICT(k,v) DO NOTHING;
  SELECT * FROM t1;
} {0 abcdefghij}
do_execsql_test upsert3-140 {
  INSERT INTO t1 VALUES(0, 'abcdefghij')
      ON CONFLICT(v,k) DO NOTHING;
  SELECT * FROM t1;
} {0 abcdefghij}

do_execsql_test upsert3-200 {
  CREATE TABLE excluded(a INT, b INT, c INT DEFAULT 0);
  CREATE UNIQUE INDEX excludedab ON excluded(a,b);
  INSERT INTO excluded(a,b) VALUES(1,2),(1,2),(3,4),(1,2),(5,6),(3,4)
    ON CONFLICT(b,a) DO UPDATE SET c=excluded.c+1;
  SELECT *, 'x' FROM excluded ORDER BY a;
} {1 2 2 x 3 4 1 x 5 6 0 x}
do_execsql_test upsert3-210 {
  INSERT INTO excluded AS base(a,b,c) VALUES(1,2,8),(1,2,3)
    ON CONFLICT(b,a) DO UPDATE SET c=excluded.c+1 WHERE base.c<excluded.c;
  SELECT *, 'x' FROM excluded ORDER BY a;
} {1 2 9 x 3 4 1 x 5 6 0 x}



finish_test
