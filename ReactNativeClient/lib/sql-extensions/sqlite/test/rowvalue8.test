# 2016-08-22
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# Use of row values in CASE statements.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix rowvalue8

do_execsql_test 1.1 {
  CREATE TABLE t1(a INTEGER PRIMARY KEY,b,c,d);
  INSERT INTO t1(a,b,c,d) VALUES
     (1,1,2,3),
     (2,2,3,4),
     (3,1,2,4),
     (4,2,3,5),
     (5,3,4,6),
     (6,4,5,9);
  SELECT a, CASE (b,c) WHEN (1,2) THEN 'aleph'
                       WHEN (2,3) THEN 'bet'
                       WHEN (3,4) THEN 'gimel'
                       ELSE '-' END,
         '|'
    FROM t1
   ORDER BY a;
} {1 aleph | 2 bet | 3 aleph | 4 bet | 5 gimel | 6 - |}
do_execsql_test 1.2 {
  SELECT a, CASE (b,c,d) WHEN (1,2,3) THEN 'aleph'
                         WHEN (2,3,4) THEN 'bet'
                         WHEN (3,4,6) THEN 'gimel'
                         ELSE '-' END,
         '|'
    FROM t1
   ORDER BY a;
} {1 aleph | 2 bet | 3 - | 4 - | 5 gimel | 6 - |}

do_execsql_test 2.1 {
  CREATE TABLE t2(x INTEGER PRIMARY KEY, y);
  INSERT INTO t2(x,y) VALUES(1,6),(2,5),(3,4),(4,3),(5,2),(6,1);
  SELECT x, CASE (SELECT b,c FROM t1 WHERE a=y)
            WHEN (1,2) THEN 'aleph'
            WHEN (2,3) THEN 'bet'
            WHEN (3,4) THEN 'gimel'
            ELSE '-' END,
         '|'
    FROM t2
   ORDER BY +x;
} {1 - | 2 gimel | 3 bet | 4 aleph | 5 bet | 6 aleph |}


finish_test
