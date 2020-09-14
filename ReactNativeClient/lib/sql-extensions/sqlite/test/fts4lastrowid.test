# 2017 Feb 27
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
# Tests of the last_insert_rowid functionality with fts4.
#

set testdir [file dirname $argv0]
source [file join [file dirname [info script]] tester.tcl]
set testprefix fts4lastrowid

ifcapable !fts3 {
  finish_test
  return
}

do_execsql_test 1.0 {
  CREATE VIRTUAL TABLE t1 USING fts4(str);
}

do_execsql_test 1.1 {
  INSERT INTO t1 VALUES('one string');
  INSERT INTO t1 VALUES('two string');
  INSERT INTO t1 VALUES('three string');
  SELECT last_insert_rowid();
} {3}

do_execsql_test 1.2 {
  BEGIN;
    INSERT INTO t1 VALUES('one string');
    INSERT INTO t1 VALUES('two string');
    INSERT INTO t1 VALUES('three string');
  COMMIT;
  SELECT last_insert_rowid();
} {6}

do_execsql_test 1.3 {
  INSERT INTO t1(rowid, str) VALUES(-22, 'some more text');
  SELECT last_insert_rowid();
} {-22}

do_execsql_test 1.4 {
  BEGIN;
    INSERT INTO t1(rowid, str) VALUES(45, 'some more text');
    INSERT INTO t1(rowid, str) VALUES(46, 'some more text');
    INSERT INTO t1(rowid, str) VALUES(222, 'some more text');
    SELECT last_insert_rowid();
  COMMIT;
  SELECT last_insert_rowid();
} {222 222}

do_execsql_test 1.5 {
  CREATE TABLE x1(x);
  INSERT INTO x1 VALUES('john'), ('paul'), ('george'), ('ringo');
  INSERT INTO t1 SELECT x FROM x1;
  SELECT last_insert_rowid();
} {226}

do_execsql_test 1.6 {
  INSERT INTO t1(rowid, str) SELECT rowid+10, x FROM x1;
  SELECT last_insert_rowid();
} {14}


finish_test
