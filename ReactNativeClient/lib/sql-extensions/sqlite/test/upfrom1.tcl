# 2020 April 22
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

source [file join [file dirname $argv0] pg_common.tcl]

#=========================================================================

start_test upfrom1 "2020 April 22"

foreach {tn wo} {
  1 "WITHOUT ROWID"
  2 ""
} {
eval [string map [list %TN% $tn %WITHOUT_ROWID% $wo] {
execsql_test 1.%TN%.0 {
  DROP TABLE IF EXISTS t2;
  CREATE TABLE t2(a INTEGER PRIMARY KEY, b INTEGER, c INTEGER) %WITHOUT_ROWID%;
  INSERT INTO t2 VALUES(1, 2, 3);
  INSERT INTO t2 VALUES(4, 5, 6);
  INSERT INTO t2 VALUES(7, 8, 9);

  DROP TABLE IF EXISTS chng;
  CREATE TABLE chng(a INTEGER, b INTEGER, c INTEGER);
  INSERT INTO chng VALUES(1, 100, 1000);
  INSERT INTO chng VALUES(7, 700, 7000);
}

execsql_test 1.%TN%.1 {
  SELECT * FROM t2;
}

execsql_test 1.%TN%.2 {
  UPDATE t2 SET b = chng.b, c = chng.c FROM chng WHERE chng.a = t2.a;
  SELECT * FROM t2 ORDER BY a;
}

execsql_test 1.%TN%.3 {
  DELETE FROM t2;
  INSERT INTO t2 VALUES(1, 2, 3);
  INSERT INTO t2 VALUES(4, 5, 6);
  INSERT INTO t2 VALUES(7, 8, 9);
}

execsql_test 1.%TN%.4 {
  UPDATE t2 SET (b, c) = (SELECT b, c FROM chng WHERE a=t2.a) 
    WHERE a IN (SELECT a FROM chng);
  SELECT * FROM t2 ORDER BY a;
}

execsql_test 1.%TN%.5 {
  DROP TABLE IF EXISTS t3;
  CREATE TABLE t3(a INTEGER PRIMARY KEY, b INTEGER, c TEXT) %WITHOUT_ROWID%;
  INSERT INTO t3 VALUES(1, 1, 'one');
  INSERT INTO t3 VALUES(2, 2, 'two');
  INSERT INTO t3 VALUES(3, 3, 'three');

  DROP TABLE IF EXISTS t4;
  CREATE TABLE t4(x TEXT);
  INSERT INTO t4 VALUES('five');

  SELECT * FROM t3 ORDER BY a;
}

execsql_test 1.%TN%.6 {
  UPDATE t3 SET c=x FROM t4;
  SELECT * FROM t3 ORDER BY a;
}
}]}

execsql_test 2.1 {
  DROP TABLE IF EXISTS t5;
  DROP TABLE IF EXISTS m1;
  DROP TABLE IF EXISTS m2;
  CREATE TABLE t5(a INTEGER PRIMARY KEY, b TEXT, c TEXT);
  CREATE TABLE m1(x INTEGER PRIMARY KEY, y TEXT);
  CREATE TABLE m2(u INTEGER PRIMARY KEY, v TEXT);

  INSERT INTO t5 VALUES(1, 'one', 'ONE');
  INSERT INTO t5 VALUES(2, 'two', 'TWO');
  INSERT INTO t5 VALUES(3, 'three', 'THREE');
  INSERT INTO t5 VALUES(4, 'four', 'FOUR');

  INSERT INTO m1 VALUES(1, 'i');
  INSERT INTO m1 VALUES(2, 'ii');
  INSERT INTO m1 VALUES(3, 'iii');

  INSERT INTO m2 VALUES(1, 'I');
  INSERT INTO m2 VALUES(3, 'II');
  INSERT INTO m2 VALUES(4, 'III');
}

execsql_test 2.2 {
  UPDATE t5 SET b=y, c=v FROM m1 LEFT JOIN m2 ON (x=u) WHERE x=a;
  SELECT * FROM t5 ORDER BY a;
}

errorsql_test 2.3.1 {
  UPDATE t5 SET b=1 FROM t5;
}
errorsql_test 2.3.2 {
  UPDATE t5 AS apples SET b=1 FROM t5 AS apples;
}


finish_test

