# 2010 September 28
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. The
# focus of this file is testing that a trigger may have the same
# name as an index, view or table in the same database.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

#--------------------------------------------------------------------------
# Test organization:
#
#   schema4-1.*: Dropping and creating triggers and other objects where
#     triggers and at least on other object share a name.
#
#   schema4-2.*: Renaming tables where there is a trigger that shares the
#     name of the table or one of its indices.
#

do_execsql_test schema4-1.1 {
  CREATE TABLE log(x, a, b);
  CREATE TABLE tbl(a, b);

  CREATE TABLE t1(a, b);
  CREATE VIEW v1 AS SELECT * FROM tbl;
  CREATE INDEX i1 ON tbl(a);
} {}

do_execsql_test schema4-1.2 {
  CREATE TRIGGER t1 AFTER INSERT ON tbl BEGIN
    INSERT INTO log VALUES('after insert', new.a, new.b);
  END;
  CREATE TRIGGER v1 AFTER UPDATE ON tbl BEGIN
    INSERT INTO log VALUES('after update', new.a, new.b);
  END;
  CREATE TRIGGER i1 AFTER DELETE ON tbl BEGIN
    INSERT INTO log VALUES('after delete', old.a, old.b);
  END;
} {}

do_execsql_test schema4-1.3 {
  INSERT INTO tbl VALUES(1, 2);
  UPDATE tbl SET b=a+b, a=a+1;
  DELETE FROM tbl;

  SELECT x, a, b FROM log;
} {{after insert} 1 2 {after update} 2 3 {after delete} 2 3}

do_execsql_test schema4-1.4 {
  DELETE FROM log;

  DROP INDEX i1;
  DROP TABLE t1;
  DROP VIEW v1;

  INSERT INTO tbl VALUES(1, 2);
  UPDATE tbl SET b=a+b, a=a+1;
  DELETE FROM tbl;

  SELECT x, a, b FROM log;
} {{after insert} 1 2 {after update} 2 3 {after delete} 2 3}

db close
sqlite3 db test.db

do_execsql_test schema4-1.5 {
  DELETE FROM log;
  INSERT INTO tbl VALUES(1, 2);
  UPDATE tbl SET b=a+b, a=a+1;
  DELETE FROM tbl;
  SELECT x, a, b FROM log;
} {{after insert} 1 2 {after update} 2 3 {after delete} 2 3}

do_execsql_test schema4-1.6 {
  CREATE TABLE t1(a, b);
  CREATE VIEW v1 AS SELECT * FROM tbl;
  CREATE INDEX i1 ON tbl(a);
} {}

ifcapable fts3 {
  do_execsql_test schema4-1.7 {
    DROP TABLE t1;
    CREATE VIRTUAL TABLE t1 USING fts3;
  } {}

  do_execsql_test schema4-1.8 {
    DELETE FROM log;
    DROP TABLE t1;
    INSERT INTO tbl VALUES(1, 2);
    UPDATE tbl SET b=a+b, a=a+1;
    DELETE FROM tbl;
    SELECT x, a, b FROM log;
  } {{after insert} 1 2 {after update} 2 3 {after delete} 2 3}
}

ifcapable altertable {
  drop_all_tables
  do_execsql_test schema4-2.1 {
    CREATE TABLE log(x, a, b);
    CREATE TABLE tbl(a, b);
  
    CREATE TABLE t1(a, b);
    CREATE INDEX i1 ON t1(a, b);
  } {}
  
  do_execsql_test schema4-2.2 {
    CREATE TRIGGER t1 AFTER INSERT ON tbl BEGIN
      INSERT INTO log VALUES('after insert', new.a, new.b);
    END;
    CREATE TRIGGER i1 AFTER DELETE ON tbl BEGIN
      INSERT INTO log VALUES('after delete', old.a, old.b);
    END;
  } {}

  do_execsql_test schema4-2.3 { ALTER TABLE t1 RENAME TO t2 } {}

  do_execsql_test schema4-2.4 { 
    INSERT INTO tbl VALUES('a', 'b');
    DELETE FROM tbl;
    SELECT * FROM log;
  } {{after insert} a b {after delete} a b}

  db close
  sqlite3 db test.db

  do_execsql_test schema4-2.5 { 
    DELETE FROM log;
    INSERT INTO tbl VALUES('c', 'd');
    DELETE FROM tbl;
    SELECT * FROM log;
  } {{after insert} c d {after delete} c d}

  do_execsql_test schema4-2.6 {
    CREATE TEMP TRIGGER x1 AFTER UPDATE ON tbl BEGIN
      INSERT INTO log VALUES('after update', new.a, new.b);
    END;

    CREATE TEMP TABLE x1(x);
    INSERT INTO x1 VALUES(123);
  } {}

  do_execsql_test schema4-2.8 {
    select sql from temp.sqlite_master WHERE type='table';
  } {{CREATE TABLE x1(x)}}

  do_execsql_test schema4-2.7 { ALTER TABLE tbl RENAME TO tbl2 } {}

  do_execsql_test schema4-2.9 {
    select sql from sqlite_temp_master WHERE type='table';
  } {{CREATE TABLE x1(x)}}

  do_execsql_test schema4-2.10 { 
    DELETE FROM log;
    INSERT INTO tbl2 VALUES('e', 'f');
    UPDATE tbl2 SET a='g', b='h';
    DELETE FROM tbl2;
    SELECT * FROM log;
  } {{after insert} e f {after update} g h {after delete} g h}

  do_execsql_test schema4-2.11 {
    INSERT INTO x1 VALUES(456);
    SELECT * FROM x1
  } {123 456}
}

finish_test
