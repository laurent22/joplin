# 2015-11-05
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements tests for indexes on large numeric values.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl


# Test cases from Zsbán Ambrus:
#
do_execsql_test numindex1-1.1 {
  CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  CREATE INDEX t1b ON t1(b);
  INSERT INTO t1(a,b) VALUES(100, 356282677878746339);
  INSERT INTO t1(a,b) VALUES(50, 356282677878746339.0);
  INSERT INTO t1(a,b) VALUES(0, 356282677878746340);
  DELETE FROM t1 WHERE a=50;
  PRAGMA integrity_check;
} {ok}

do_execsql_test numindex1-1.2 {
  CREATE TABLE t2(a,b);
  INSERT INTO t2(a,b) VALUES('b', 1<<58),
      ('c', (1<<58)+1e-7), ('d', (1<<58)+1);
  SELECT a, b, typeof(b), '|' FROM t2 ORDER BY +a;
} {b 288230376151711744 integer | c 2.88230376151712e+17 real | d 288230376151711745 integer |}

do_execsql_test numindex1-1.3 {
  SELECT x.a || CASE WHEN x.b==y.b THEN '==' ELSE '<>' END || y.a
    FROM t2 AS x, t2 AS y
   ORDER BY +x.a, +x.b;
} {b==b b==c b<>d c==b c==c c<>d d<>b d<>c d==d}

# New test cases
#
do_execsql_test numindex1-2.1 {
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(a INTEGER PRIMARY KEY,b);
  CREATE INDEX t1b ON t1(b);
  WITH RECURSIVE c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<100)
  INSERT INTO t1(a,b) SELECT x, 10000000000000004.0 FROM c
   WHERE x NOT IN (23,37);
  INSERT INTO t1(a,b) VALUES(23,10000000000000005);
  INSERT INTO t1(a,b) VALUES(37,10000000000000003);
  DELETE FROM t1 WHERE a NOT IN (23,37);
  PRAGMA integrity_check;
} {ok}

do_execsql_test numindex1-3.1 {
  DROP TABLE IF EXISTS t1;
  CREATE TABLE t1(a INTEGER PRIMARY KEY,b);
  CREATE INDEX t1b ON t1(b);
  WITH RECURSIVE c(x) AS (VALUES(1) UNION ALL SELECT x+1 FROM c WHERE x<20)
  INSERT INTO t1(a,b) SELECT x, 100000000000000005.0
    FROM c WHERE x NOT IN (3,5,7,11,13,17,19);
  INSERT INTO t1(a,b) VALUES(3,100000000000000005);
  INSERT INTO t1(a,b) VALUES(5,100000000000000000);
  INSERT INTO t1(a,b) VALUES(7,100000000000000008);
  INSERT INTO t1(a,b) VALUES(11,100000000000000006);
  INSERT INTO t1(a,b) VALUES(13,100000000000000001);
  INSERT INTO t1(a,b) VALUES(17,100000000000000004);
  INSERT INTO t1(a,b) VALUES(19,100000000000000003);
  PRAGMA integrity_check;
} {ok}

do_execsql_test numindex1-3.2 {
  SELECT a FROM t1 ORDER BY b;
} {1 2 4 5 6 8 9 10 12 14 15 16 18 20 13 19 17 3 11 7}

finish_test
