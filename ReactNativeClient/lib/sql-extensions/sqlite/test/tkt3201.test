# 2008 July 4
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
# Specifically, it tests that bug #3201 has been fixed.
#
# $Id: tkt3201.test,v 1.3 2008/07/12 14:52:21 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt3201-1 {
  execsql {
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b TEXT);
    INSERT INTO t1 VALUES(1, 'one');
    INSERT INTO t1 VALUES(2, 'two');
  }
} {}

do_test tkt3201-2 {
  execsql {
    SELECT l.a, r.a FROM t1 AS l, t1 AS r WHERE l.a < r.a;
  }
} {1 2}

do_test tkt3201-3 {
  execsql {
    CREATE TABLE t2(a INTEGER PRIMARY KEY, b TEXT);
    INSERT INTO t2 VALUES(2, 'two');
  }
  execsql {
    SELECT l.a, r.a FROM t1 AS l, t2 AS r WHERE l.a < r.a;
  }
} {1 2}

do_test tkt3201-4 {
  execsql {
    DELETE FROM t1 WHERE a = 2;
  }
  execsql {
    SELECT l.a, r.a FROM t1 AS l, t2 AS r WHERE l.a < r.a;
  }
} {1 2}

do_test tkt3201-5 {
  execsql {
    DELETE FROM t1 WHERE a = 2;
  }
  execsql {
    SELECT t1.a, t1.b, t2.a, t2.b FROM t1, t2;
  }
} {1 one 2 two}

do_test tkt3201-6 {
  execsql {
    CREATE TABLE t3(c INTEGER PRIMARY KEY, d TEXT);
    INSERT INTO t3 VALUES(2, 'two');
  }
  execsql { SELECT a, b, c, d FROM t1, t3 }
} {1 one 2 two}

do_test tkt3201-7 {
  execsql { SELECT a, b, c, d FROM t1, t3 WHERE a < c }
} {1 one 2 two}

# Ticket [efc02f977919]
#
ifcapable trigger {
  do_test tkt3201-4.0 {
    db eval {
     CREATE TABLE t4(x);
     CREATE TABLE t4_log(x);
     CREATE TRIGGER r4_1 AFTER INSERT ON t4 WHEN new.x=1 BEGIN
       INSERT INTO t4_log(x) VALUES(new.x);
     END;
     CREATE TRIGGER r4_2 AFTER INSERT ON t4 WHEN new.x=2 BEGIN
       INSERT INTO t4_log(x) VALUES(new.x);
     END;
     CREATE TRIGGER r4_3 AFTER INSERT ON t4 WHEN new.x=3 BEGIN
       INSERT INTO t4_log(x) VALUES(new.x);
     END;
     CREATE TRIGGER r4_4 AFTER INSERT ON t4 WHEN new.x=4 BEGIN
       INSERT INTO t4_log(x) VALUES(new.x);
     END;
     INSERT INTO t4 VALUES(1);
     INSERT INTO t4 VALUES(2);
     INSERT INTO t4 VALUES(3);
     INSERT INTO t4 VALUES(4);
     SELECT * FROM t4_log;
    }
  } {1 2 3 4}
}





finish_test
