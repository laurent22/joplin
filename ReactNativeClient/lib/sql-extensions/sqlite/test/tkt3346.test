# 2008 September 1
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
# This file implements regression tests for SQLite library.  The
# focus of this file is testing the fix for ticket #3346
#
# $Id: tkt3346.test,v 1.3 2008/12/09 13:12:57 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3346-1.1 {
  db eval {
   CREATE TABLE t1(a,b);
   INSERT INTO t1 VALUES(2,'bob');
   INSERT INTO t1 VALUES(1,'alice');
   INSERT INTO t1 VALUES(3,'claire');
   SELECT *, ( SELECT y FROM (SELECT x.b='alice' AS y) )
     FROM ( SELECT * FROM t1 ) AS x;
  }
} {2 bob 0 1 alice 1 3 claire 0}
do_test tkt3346-1.2 {
  db eval {
    SELECT b FROM (SELECT * FROM t1) AS x
     WHERE (SELECT y FROM (SELECT x.b='alice' AS y))=0
  }
} {bob claire}
do_test tkt3346-1.3 {
  db eval {
    SELECT b FROM (SELECT * FROM t1 ORDER BY a) AS x
     WHERE (SELECT y FROM (SELECT a||b y FROM t1 WHERE t1.b=x.b))=(x.a||x.b)
  }
} {alice bob claire}
do_test tkt3346-1.4 {
  db eval {
    SELECT b FROM (SELECT * FROM t1 ORDER BY a) AS x
     WHERE (SELECT y FROM (SELECT a||b y FROM t1 WHERE t1.b=x.b))=('2'||x.b)
  }
} {bob}

# Ticket #3530
#
# As shown by ticket #3346 above (see also ticket #3298) it is important
# that a subquery in the result-set be able to look up through multiple
# FROM levels in order to view tables in the FROM clause at the top level.
#
# But ticket #3530 shows us that a subquery in the FROM clause should not
# be able to look up to higher levels:
#
do_test tkt3346-2.1 {
  catchsql {
    CREATE TABLE t2(a);
    INSERT INTO t2 VALUES(1);
    
    SELECT * FROM (SELECT * FROM t1 WHERE 1=x.a) AS x;
  }
} {1 {no such column: x.a}}

finish_test
