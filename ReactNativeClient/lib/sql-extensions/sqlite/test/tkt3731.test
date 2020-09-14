# 2009 March 18
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
# $Id: tkt3731.test,v 1.1 2009/03/17 22:33:01 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable {!trigger} {
  finish_test
  return
}

# The tests in this file were written before SQLite supported recursive
# trigger invocation, and some tests depend on that to pass. So disable
# recursive triggers for this file.
catchsql { pragma recursive_triggers = off } 

do_test tkt3731-1.1 {
  execsql {
    CREATE TABLE t1(a PRIMARY KEY, b);
    CREATE TRIGGER tr1 AFTER INSERT ON t1 BEGIN
      INSERT INTO t1 VALUES(new.a || '+', new.b || '+');
    END;
  }
} {}

do_test tkt3731-1.2 {
  execsql {
    INSERT INTO t1 VALUES('a', 'b');
    INSERT INTO t1 VALUES('c', 'd');
    SELECT * FROM t1;
  }
} {a b a+ b+ c d c+ d+}

do_test tkt3731-1.3 {
  execsql {
    DELETE FROM t1;
    CREATE TABLE t2(a, b);
    INSERT INTO t2 VALUES('e', 'f');
    INSERT INTO t2 VALUES('g', 'h');
    INSERT INTO t1 SELECT * FROM t2;
    SELECT * FROM t1;
  }
} {e f e+ f+ g h g+ h+}

integrity_check tkt3731-1.4

finish_test
