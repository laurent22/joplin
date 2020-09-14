# 2008 December 24
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
# This file implements tests to verify that ticket #3554 has been
# fixed.  
#
# $Id: tkt3554.test,v 1.2 2009/06/05 17:09:12 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !trigger {
  finish_test
  return
}

do_test tkt3544-1.1 {
  execsql {
    CREATE TABLE test ( obj, t1, t2, PRIMARY KEY(obj, t1, t2) );
  
    CREATE TRIGGER test_insert BEFORE INSERT ON test BEGIN
      UPDATE test SET t1 = new.t1 
        WHERE obj = new.obj AND new.t1 < t1 AND new.t2 >= t1;
  
      UPDATE test SET t2 = new.t2 
        WHERE obj = new.obj AND new.t2 > t2 AND new.t1 <= t2;
  
      SELECT RAISE(IGNORE) WHERE EXISTS (
        SELECT obj FROM test 
        WHERE obj = new.obj AND new.t1 >= t1 AND new.t2 <= t2
      );
    END;
  }
} {}

do_test tkt3544-1.2 {
  execsql {
    INSERT INTO test VALUES('a', 10000, 11000);
    SELECT * FROM test;
  }
} {a 10000 11000}


do_test tkt3544-1.3 {
  execsql {
    INSERT INTO test VALUES('a', 9000, 10500);
  }
  execsql { SELECT * FROM test }
} {a 9000 11000}

do_test tkt3544-1.4 {
  execsql {
    INSERT INTO test VALUES('a', 10000, 12000);
  }
  execsql { SELECT * FROM test }
} {a 9000 12000}

finish_test
