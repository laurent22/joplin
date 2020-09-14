# 2013 March 13
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix tkt-4dd95f6943

do_execsql_test 1.0 {
  CREATE TABLE t1(x);
  INSERT INTO t1 VALUES (3), (4), (2), (1), (5), (6);
}

foreach {tn1 idx} {
  1 { CREATE INDEX i1 ON t1(x ASC) }
  2 { CREATE INDEX i1 ON t1(x DESC) }
} {
  do_execsql_test 1.$tn1.1 { DROP INDEX IF EXISTS i1; }
  do_execsql_test 1.$tn1.2 $idx

  do_execsql_test 1.$tn1.3 {
    SELECT x FROM t1 WHERE x IN(2, 4, 5) ORDER BY x ASC;
  } {2 4 5}

  do_execsql_test 1.$tn1.4 {
    SELECT x FROM t1 WHERE x IN(2, 4, 5) ORDER BY x DESC;
  } {5 4 2}
}


do_execsql_test 2.0 {
  CREATE TABLE t2(x, y);
  INSERT INTO t2 VALUES (5, 3), (5, 4), (5, 2), (5, 1), (5, 5), (5, 6);
  INSERT INTO t2 VALUES (1, 3), (1, 4), (1, 2), (1, 1), (1, 5), (1, 6);
  INSERT INTO t2 VALUES (3, 3), (3, 4), (3, 2), (3, 1), (3, 5), (3, 6);
  INSERT INTO t2 VALUES (2, 3), (2, 4), (2, 2), (2, 1), (2, 5), (2, 6);
  INSERT INTO t2 VALUES (4, 3), (4, 4), (4, 2), (4, 1), (4, 5), (4, 6);
  INSERT INTO t2 VALUES (6, 3), (6, 4), (6, 2), (6, 1), (6, 5), (6, 6);

  CREATE TABLE t3(a, b);
  INSERT INTO t3 VALUES (2, 2), (4, 4), (5, 5);
  CREATE UNIQUE INDEX t3i1 ON t3(a ASC);
  CREATE UNIQUE INDEX t3i2 ON t3(b DESC);
}

foreach {tn1 idx} {
  1 { CREATE INDEX i1 ON t2(x ASC,  y ASC) }
  2 { CREATE INDEX i1 ON t2(x ASC,  y DESC) }
  3 { CREATE INDEX i1 ON t2(x DESC, y ASC) }
  4 { CREATE INDEX i1 ON t2(x DESC, y DESC) }

  5 { CREATE INDEX i1 ON t2(y ASC,  x ASC) }
  6 { CREATE INDEX i1 ON t2(y ASC,  x DESC) }
  7 { CREATE INDEX i1 ON t2(y DESC, x ASC) }
  8 { CREATE INDEX i1 ON t2(y DESC, x DESC) }
} {
  do_execsql_test 2.$tn1.1 { DROP INDEX IF EXISTS i1; }
  do_execsql_test 2.$tn1.2 $idx

  foreach {tn2 inexpr} {
    3  "(2, 4, 5)"
    4  "(SELECT a FROM t3)"
    5  "(SELECT b FROM t3)"
  } {
    do_execsql_test 2.$tn1.$tn2.1 "
      SELECT x, y FROM t2 WHERE x = 1 AND y IN $inexpr ORDER BY x ASC, y ASC;
    " {1 2  1 4  1 5}

    do_execsql_test 2.$tn1.$tn2.2 "
      SELECT x, y FROM t2 WHERE x = 2 AND y IN $inexpr ORDER BY x ASC, y DESC;
    " {2 5  2 4  2 2}

    do_execsql_test 2.$tn1.$tn2.3 "
      SELECT x, y FROM t2 WHERE x = 3 AND y IN $inexpr ORDER BY x DESC, y ASC;
    " {3 2  3 4  3 5}

    do_execsql_test 2.$tn1.$tn2.4 "
      SELECT x, y FROM t2 WHERE x = 4 AND y IN $inexpr ORDER BY x DESC, y DESC;
    " {4 5  4 4  4 2}
    
    do_execsql_test 2.$tn1.$tn2.5 "
      SELECT a, x, y FROM t2, t3 WHERE a = 4 AND x = 1 AND y IN $inexpr 
      ORDER BY a, x ASC, y ASC;
    " {4 1 2  4 1 4  4 1 5}
    do_execsql_test 2.$tn1.$tn2.6 "
      SELECT a, x, y FROM t2, t3 WHERE a = 2 AND x = 1 AND y IN $inexpr 
      ORDER BY x ASC, y ASC;
    " {2 1 2  2 1 4  2 1 5}

    do_execsql_test 2.$tn1.$tn2.7 "
      SELECT a, x, y FROM t2, t3 WHERE a = 4 AND x = 1 AND y IN $inexpr 
      ORDER BY a, x ASC, y DESC;
    " {4 1 5  4 1 4  4 1 2}
    do_execsql_test 2.$tn1.8 "
      SELECT a, x, y FROM t2, t3 WHERE a = 2 AND x = 1 AND y IN $inexpr 
      ORDER BY x ASC, y DESC;
    " {2 1 5  2 1 4  2 1 2}

    do_execsql_test 2.$tn1.$tn2.9 "
      SELECT a, x, y FROM t2, t3 WHERE a = 4 AND x = 1 AND y IN $inexpr 
      ORDER BY a, x DESC, y ASC;
    " {4 1 2  4 1 4  4 1 5}
    do_execsql_test 2.$tn1.10 "
      SELECT a, x, y FROM t2, t3 WHERE a = 2 AND x = 1 AND y IN $inexpr 
      ORDER BY x DESC, y ASC;
    " {2 1 2  2 1 4  2 1 5}

    do_execsql_test 2.$tn1.$tn2.11 "
      SELECT a, x, y FROM t2, t3 WHERE a = 4 AND x = 1 AND y IN $inexpr 
      ORDER BY a, x DESC, y DESC;
    " {4 1 5  4 1 4  4 1 2}
    do_execsql_test 2.$tn1.$tn2.12 "
      SELECT a, x, y FROM t2, t3 WHERE a = 2 AND x = 1 AND y IN $inexpr 
      ORDER BY x DESC, y DESC;
    " {2 1 5  2 1 4  2 1 2}
  }
}

do_execsql_test 3.0 {
  CREATE TABLE t7(x);
  INSERT INTO t7 VALUES (1), (2), (3);
  CREATE INDEX i7 ON t7(x);

  CREATE TABLE t8(y);
  INSERT INTO t8 VALUES (1), (2), (3);
}

foreach {tn idxdir sortdir sortdata} {
  1 ASC  ASC  {1 2 3}
  2 ASC  DESC {3 2 1}
  3 DESC ASC  {1 2 3}
  4 ASC  DESC {3 2 1}
} {

  do_execsql_test 3.$tn "
    DROP INDEX IF EXISTS i8;
    CREATE UNIQUE INDEX i8 ON t8(y $idxdir);
    SELECT x FROM t7 WHERE x IN (SELECT y FROM t8) ORDER BY x $sortdir;
  " $sortdata
}

finish_test
