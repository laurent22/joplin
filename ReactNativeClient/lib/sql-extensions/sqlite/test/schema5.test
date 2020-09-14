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
#
# This file checks corner cases in the CREATE TABLE syntax to make
# sure that legacy syntax (syntax that is disallowed according to the
# syntax diagrams) is still accepted, so that older databases that use
# that syntax can still be read.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Table constraints should be separated by commas, but they do not have
# to be.
#
do_test schema5-1.1 {
  db eval {
    CREATE TABLE t1(a,b,c, PRIMARY KEY(a) UNIQUE (a) CONSTRAINT one);
    INSERT INTO t1 VALUES(1,2,3);
    SELECT * FROM t1;
  }
} {1 2 3}
do_test schema5-1.2 {
  catchsql {INSERT INTO t1 VALUES(1,3,4);}
} {1 {UNIQUE constraint failed: t1.a}}
do_test schema5-1.3 {
  db eval {
    DROP TABLE t1;
    CREATE TABLE t1(a,b,c,
        CONSTRAINT one PRIMARY KEY(a) CONSTRAINT two CHECK(b<10) UNIQUE(b)
        CONSTRAINT three
    );
    INSERT INTO t1 VALUES(1,2,3);
    SELECT * FROM t1;
  }
} {1 2 3}
do_test schema5-1.4 {
  catchsql {INSERT INTO t1 VALUES(10,11,12);}
} {1 {CHECK constraint failed: two}}
do_test schema5-1.5 {
  db eval {
    DROP TABLE t1;
    CREATE TABLE t1(a,b,c,
       UNIQUE(a) CONSTRAINT one,
       PRIMARY KEY(b,c) CONSTRAINT two
    );
    INSERT INTO t1 VALUES(1,2,3);
  }
} {}
do_test schema5-1.6 {
  catchsql {INSERT INTO t1 VALUES(1,3,4)}
} {1 {UNIQUE constraint failed: t1.a}}
do_test schema5-1.7 {
  catchsql {INSERT INTO t1 VALUES(10,2,3)}
} {1 {UNIQUE constraint failed: t1.b, t1.c}}



    

finish_test
