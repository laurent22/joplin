# 2008 August 12
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
# This file tests changes to the name resolution logic that occurred
# in august of 2008 and where associated with tickets #3298 and #3301
#
# $Id: tkt3298.test,v 1.3 2009/04/07 14:14:23 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !trigger { finish_test ; return }

do_test tkt3298-1.1 {
  execsql {
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b INT);
    INSERT INTO t1 VALUES(0, 1);
    INSERT INTO t1 VALUES(1, 1);
    INSERT INTO t1 VALUES(2, 1);
    CREATE VIEW v1 AS SELECT a AS x, b+1 AS y FROM t1;
    CREATE TRIGGER r1 INSTEAD OF UPDATE ON v1
      BEGIN
        UPDATE t1 SET b=new.y-1 WHERE a=new.x;
      END;
    CREATE TRIGGER r2 INSTEAD OF DELETE ON v1
      BEGIN
        DELETE FROM t1 WHERE a=old.x;
      END;
    SELECT * FROM v1 ORDER BY x;
  }
} {0 2 1 2 2 2}
do_test tkt3298-1.2 {
  execsql {
    UPDATE v1 SET y=3 WHERE x=0;
    SELECT * FROM v1 ORDER by x;
  }
} {0 3 1 2 2 2}
do_test tkt3298-1.3 {
  execsql {
    UPDATE v1 SET y=4 WHERE v1.x=2;
    SELECT * FROM v1 ORDER by x;
  }
} {0 3 1 2 2 4}
do_test tkt3298-1.4 {
  execsql {
    DELETE FROM v1 WHERE x=1;
    SELECT * FROM v1 ORDER BY x;
  }
} {0 3 2 4}
do_test tkt3298-1.5 {
  execsql {
    DELETE FROM v1 WHERE v1.x=2;
    SELECT * FROM v1 ORDER BY x;
  }
} {0 3}

# Ticket #3301
#
do_test tkt3298-2.1 {
  execsql {
    CREATE TABLE t2(p,q);
    INSERT INTO t2 VALUES(1,11);
    INSERT INTO t2 VALUES(2,22);
    CREATE TABLE t3(x,y);
    INSERT INTO t3 VALUES(1,'one');

    SELECT *, (SELECT z FROM (SELECT y AS z FROM t3 WHERE x=t1.a+1) ) FROM t1;
  }
} {0 2 one}


finish_test
