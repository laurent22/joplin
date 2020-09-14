# 2015 November 18
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
# Test the __hidden__ hack.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix hidden

ifcapable !hiddencolumns {
  finish_test
  return
}

do_execsql_test 1.1 {
  CREATE TABLE t1(__hidden__a, b);
  INSERT INTO t1 VALUES('1');
  INSERT INTO t1(__hidden__a, b) VALUES('x', 'y');
} {}

do_execsql_test 1.2 {
  SELECT * FROM t1;
} {1 y}

do_execsql_test 1.3 {
  SELECT __hidden__a, * FROM t1;
} {{} 1 x y}

foreach {tn view} {
  1 { CREATE VIEW v1(a, b, __hidden__c) AS SELECT a, b, c FROM x1 }
  2 { CREATE VIEW v1 AS SELECT a, b, c AS __hidden__c FROM x1 }
} {
  do_execsql_test 2.$tn.1 {
    DROP TABLE IF EXISTS x1;
    CREATE TABLE x1(a, b, c);
    INSERT INTO x1 VALUES(1, 2, 3);
  }

  catchsql { DROP VIEW v1 }
  execsql $view

  do_execsql_test 2.$tn.2 {
    SELECT a, b, __hidden__c FROM v1;
  } {1 2 3}
  
  do_execsql_test 2.$tn.3 {
    SELECT * FROM v1;
  } {1 2}
  
  do_execsql_test 2.$tn.4 {
    CREATE TRIGGER tr1 INSTEAD OF INSERT ON v1 BEGIN
      INSERT INTO x1 VALUES(new.a, new.b, new.__hidden__c);
    END;
  
    INSERT INTO v1 VALUES(4, 5);
    SELECT * FROM x1;
  } {1 2 3 4 5 {}}
  
  do_execsql_test 2.$tn.5 {
    INSERT INTO v1(a, b, __hidden__c) VALUES(7, 8, 9);
    SELECT * FROM x1;
  } {1 2 3 4 5 {} 7 8 9}
}

#-------------------------------------------------------------------------
# Test INSERT INTO ... SELECT ... statements that write to tables with
# hidden columns.
#
do_execsql_test 3.1 {
  CREATE TABLE t4(a, __hidden__b, c);
  INSERT INTO t4 SELECT 1, 2;
  SELECT a, __hidden__b, c FROM t4;
} {1 {} 2}

do_execsql_test 3.2.1 {
  CREATE TABLE t5(__hidden__a, b, c);
  CREATE TABLE t6(__hidden__a, b, c);
  INSERT INTO t6(__hidden__a, b, c) VALUES(1, 2, 3);
  INSERT INTO t6(__hidden__a, b, c) VALUES(4, 5, 6);
  INSERT INTO t6(__hidden__a, b, c) VALUES(7, 8, 9);
}

do_execsql_test 3.2.2 {
  INSERT INTO t5 SELECT * FROM t6;
  SELECT * FROM t5;
} {2 3   5 6   8 9}

do_execsql_test 3.2.3 {
  SELECT __hidden__a FROM t5;
} {{} {} {}}


do_execsql_test 3.3.1 {
  CREATE TABLE t5a(a, b, __hidden__c);
  CREATE TABLE t6a(a, b, __hidden__c);
  INSERT INTO t6a(a, b, __hidden__c) VALUES(1, 2, 3);
  INSERT INTO t6a(a, b, __hidden__c) VALUES(4, 5, 6);
  INSERT INTO t6a(a, b, __hidden__c) VALUES(7, 8, 9);
}

do_execsql_test 3.3.2 {
  INSERT INTO t5a SELECT * FROM t6a;
  SELECT * FROM t5a;
} {1 2   4 5   7 8}

do_execsql_test 3.3.3 {
  SELECT __hidden__c FROM t5a;
} {{} {} {}}

do_execsql_test 3.4.1 {
  CREATE TABLE t5b(a, __hidden__b, c);
  CREATE TABLE t6b(a, b, __hidden__c);
  INSERT INTO t6b(a, b, __hidden__c) VALUES(1, 2, 3);
  INSERT INTO t6b(a, b, __hidden__c) VALUES(4, 5, 6);
  INSERT INTO t6b(a, b, __hidden__c) VALUES(7, 8, 9);
}

do_execsql_test 3.4.2 {
  INSERT INTO t5b SELECT * FROM t6b;
  SELECT * FROM t5b;
} {1 2   4 5   7 8}

do_execsql_test 3.4.3 {
  SELECT __hidden__b FROM t5b;
} {{} {} {}}

#-------------------------------------------------------------------------
# Test VACUUM
#
reset_db
do_execsql_test 4.1 {
  CREATE TABLE t1(a, __hidden__b, c UNIQUE);
  INSERT INTO t1(a, __hidden__b, c) VALUES(1, 2, 3);
  INSERT INTO t1(a, __hidden__b, c) VALUES(4, 5, 6);
  INSERT INTO t1(a, __hidden__b, c) VALUES(7, 8, 9);
  DELETE FROM t1 WHERE __hidden__b = 5;
  SELECT rowid, a, __hidden__b, c FROM t1;
} {1 1 2 3   3 7 8 9}
do_execsql_test 4.2 {
  VACUUM;
  SELECT rowid, a, __hidden__b, c FROM t1;
} {1 1 2 3   3 7 8 9}

finish_test
