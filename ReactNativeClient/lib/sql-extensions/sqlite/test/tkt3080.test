# 2008 April 27
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
# Ticket #3080
#
# Make sure that application-defined functions are able to recursively
# invoke SQL statements that create and drop virtual tables.
#
# $Id: tkt3080.test,v 1.2 2008/11/05 16:37:35 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3080.1 {
  db function execsql execsql
  db eval {
    SELECT execsql('CREATE TABLE t1(x)');
  }
  execsql {SELECT name FROM sqlite_master}
} {t1}
do_test tkt3080.2 {
  db eval {
    INSERT INTO t1 VALUES('CREATE TABLE t2(y);');
    SELECT execsql(x) FROM t1;
  }
  db eval {
    SELECT name FROM sqlite_master;
  }
} {t1 t2}
do_test tkt3080.3 {
  execsql {
    INSERT INTO t1 VALUES('CREATE TABLE t3(z); DROP TABLE t3;');
  }
  catchsql {
    SELECT execsql(x) FROM t1 WHERE rowid=2;
  }
} {1 {database table is locked}}
do_test tkt3080.4 {
  db eval {
    SELECT name FROM sqlite_master;
  }
} {t1 t2 t3}

ifcapable vtab {
  register_echo_module [sqlite3_connection_pointer db]
  do_test tkt3080.10 {
     set sql {
       CREATE VIRTUAL TABLE t4 USING echo(t2);
       INSERT INTO t4 VALUES(123);
       DROP TABLE t4;
     }
     execsql {
       DELETE FROM t1;
       INSERT INTO t1 VALUES($sql);
     }
     db eval {
       SELECT execsql(x) FROM t1
     }
     execsql {SELECT name FROM sqlite_master}
  } {t1 t2 t3}
  do_test tkt3080.11 {
     execsql {SELECT * FROM t2}
  } {123}
}
  


finish_test
