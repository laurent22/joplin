# 2013 March 05
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically,
# it tests that ticket [868145d012a1] is fixed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_execsql_test tkt-868145d012.100 {
  CREATE TABLE p (
    id INTEGER PRIMARY KEY,
    uid VARCHAR(36),
    t INTEGER
  );
  
  CREATE TABLE pa (
    id INTEGER PRIMARY KEY,
    a_uid VARCHAR(36)
  );
  
  CREATE TABLE a (
    id INTEGER PRIMARY KEY,
    uid VARCHAR(36),
    t INTEGER
  );
  
  INSERT INTO pa VALUES(1,'1234');
  INSERT INTO pa VALUES(2,'2345');
  INSERT INTO p VALUES(3,'1234',97);
  INSERT INTO p VALUES(4,'1234',98);
  INSERT INTO a VALUES(5,'1234',98);
  INSERT INTO a VALUES(6,'1234',99);
} {}
do_execsql_test tkt-868145d012.110 {
  SELECT DISTINCT pa.id, p.id, a.id
  FROM
    pa
    LEFT JOIN p ON p.uid='1234'
    LEFT JOIN a ON a.uid=pa.a_uid
  WHERE
    a.t=p.t
  ;
} {1 4 5}
do_execsql_test tkt-868145d012.120 {
  SELECT DISTINCT pa.id, p.id, a.id
  FROM
    pa
    LEFT JOIN p ON p.uid='1234'
    LEFT JOIN a ON a.uid=pa.a_uid AND a.t=p.t
  ORDER BY 1, 2, 3
  ;
} {1 3 {} 1 4 5 2 3 {} 2 4 {}}

    
finish_test
