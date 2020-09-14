# 2011 November 16
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix whereC

do_execsql_test 1.0 {
  CREATE TABLE t1(i INTEGER PRIMARY KEY, a, b INTEGER);

  INSERT INTO t1 VALUES(1, 1, 1);
  INSERT INTO t1 VALUES(2, 1, 1);
  INSERT INTO t1 VALUES(3, 1, 2);
  INSERT INTO t1 VALUES(4, 1, 2);
  INSERT INTO t1 VALUES(5, 1, 2);
  INSERT INTO t1 VALUES(6, 1, 3);
  INSERT INTO t1 VALUES(7, 1, 3);

  INSERT INTO t1 VALUES(8, 2, 1);
  INSERT INTO t1 VALUES(9, 2, 1);
  INSERT INTO t1 VALUES(10, 2, 2);
  INSERT INTO t1 VALUES(11, 2, 2);
  INSERT INTO t1 VALUES(12, 2, 2);
  INSERT INTO t1 VALUES(13, 2, 3);
  INSERT INTO t1 VALUES(14, 2, 3);

  INSERT INTO t1 VALUES(15, 2, 1);
  INSERT INTO t1 VALUES(16, 2, 1);
  INSERT INTO t1 VALUES(17, 2, 2);
  INSERT INTO t1 VALUES(18, 2, 2);
  INSERT INTO t1 VALUES(19, 2, 2);
  INSERT INTO t1 VALUES(20, 2, 3);
  INSERT INTO t1 VALUES(21, 2, 3);

  CREATE INDEX i1 ON t1(a, b);
}

foreach {tn sql res} {
  1   "SELECT i FROM t1 WHERE a=1 AND b=2 AND i>3"         {4 5}
  2   "SELECT i FROM t1 WHERE rowid='12'"                  {12}
  3   "SELECT i FROM t1 WHERE a=1 AND b='2'"               {3 4 5}
  4   "SELECT i FROM t1 WHERE a=1 AND b='2' AND i>'3'"     {4 5}
  5   "SELECT i FROM t1 WHERE a=1 AND b='2' AND i<5"       {3 4}
  6   "SELECT i FROM t1 WHERE a=2 AND b=2 AND i<12"        {10 11}
  7   "SELECT i FROM t1 WHERE a IN(1, 2) AND b=2 AND i<11" {3 4 5 10}
  8   "SELECT i FROM t1 WHERE a=2 AND b=2 AND i BETWEEN 10 AND 12" {10 11 12}
  9   "SELECT i FROM t1 WHERE a=2 AND b=2 AND i BETWEEN 11 AND 12" {11 12}
 10   "SELECT i FROM t1 WHERE a=2 AND b=2 AND i BETWEEN 10 AND 11" {10 11}
 11   "SELECT i FROM t1 WHERE a=2 AND b=2 AND i BETWEEN 12 AND 10" {}
 12   "SELECT i FROM t1 WHERE a=2 AND b=2 AND i<NULL"      {}
 13   "SELECT i FROM t1 WHERE a=2 AND b=2 AND i>=NULL"     {}
 14   "SELECT i FROM t1 WHERE a=1 AND b='2' AND i<4.5"     {3 4}
 15   "SELECT i FROM t1 WHERE rowid IS '12'"               {12}
} {
  do_execsql_test 1.$tn.1 $sql $res
  do_execsql_test 1.$tn.2 "$sql ORDER BY i ASC"  [lsort -integer -inc  $res]
  do_execsql_test 1.$tn.3 "$sql ORDER BY i DESC" [lsort -integer -dec  $res]
}


finish_test
