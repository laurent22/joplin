# 2004 December 07
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
#
# This file implements tests to make sure expression of an INSERT
# and UPDATE statement are only evaluated once.  See ticket #980.
# If an expression uses a function that has side-effects or which
# is not deterministic (ex: random()) then we want to make sure
# that the same evaluation occurs for the actual INSERT/UPDATE and
# for the NEW.* fields of any triggers that fire.
#
# $Id: trigger6.test,v 1.2 2005/05/05 11:04:50 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable {!trigger} {
  finish_test
  return
}

do_test trigger6-1.1 {
  execsql {
    CREATE TABLE t1(x, y);
    CREATE TABLE log(a, b, c);
    CREATE TRIGGER r1 BEFORE INSERT ON t1 BEGIN
      INSERT INTO log VALUES(1, new.x, new.y);
    END;
    CREATE TRIGGER r2 BEFORE UPDATE ON t1 BEGIN
      INSERT INTO log VALUES(2, new.x, new.y);
    END;
  }
  set ::trigger6_cnt 0
  proc trigger6_counter {args} {
    incr ::trigger6_cnt
    return $::trigger6_cnt
  }
  db function counter trigger6_counter
  execsql {
    INSERT INTO t1 VALUES(1,counter());
    SELECT * FROM t1;
  }
} {1 1}
do_test trigger6-1.2 {
  execsql {
    SELECT * FROM log;
  }
} {1 1 1}
do_test trigger6-1.3 {
  execsql {
    DELETE FROM t1;
    DELETE FROM log;
    INSERT INTO t1 VALUES(2,counter(2,3)+4);
    SELECT * FROM t1;
  }
} {2 6}
do_test trigger6-1.4 {
  execsql {
    SELECT * FROM log;
  }
} {1 2 6}
do_test trigger6-1.5 {
  execsql {
    DELETE FROM log;
    UPDATE t1 SET y=counter(5);
    SELECT * FROM t1;
  }
} {2 3}
do_test trigger6-1.6 {
  execsql {
    SELECT * FROM log;
  }
} {2 2 3}

finish_test
