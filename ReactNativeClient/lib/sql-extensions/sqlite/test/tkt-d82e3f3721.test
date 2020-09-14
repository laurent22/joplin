# 2009 September 2
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
# This file implements tests to verify that ticket [d82e3f3721] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !compound {
  finish_test
  return
}

do_test tkt-d82e3-1.1 {
  db eval {
    CREATE TABLE t1(a INTEGER PRIMARY KEY AUTOINCREMENT, b);
    INSERT INTO t1 VALUES(null,'abc');
    INSERT INTO t1 VALUES(null,'def');
    DELETE FROM t1;
    INSERT INTO t1 VALUES(null,'ghi');
    SELECT * FROM t1;
  }
} {3 ghi}
do_test tkt-d82e3-1.2 {
  db eval {
    CREATE TEMP TABLE t2(a INTEGER PRIMARY KEY AUTOINCREMENT, b);
    INSERT INTO t2 VALUES(null,'jkl');
    INSERT INTO t2 VALUES(null,'mno');
    DELETE FROM t2;
    INSERT INTO t2 VALUES(null,'pqr');
    SELECT * FROM t2;
  }
} {3 pqr}
do_test tkt-d82e3-1.3 {
  db eval {
    SELECT 'main', * FROM main.sqlite_sequence
    UNION ALL
    SELECT 'temp', * FROM temp.sqlite_sequence
    ORDER BY 2
  }
} {main t1 3 temp t2 3}
do_test tkt-d82e3-1.4 {
  db eval {
    VACUUM;
    SELECT 'main', * FROM main.sqlite_sequence
    UNION ALL
    SELECT 'temp', * FROM temp.sqlite_sequence
    ORDER BY 2
  }
} {main t1 3 temp t2 3}

sqlite3 db2 test.db
do_test tkt-d82e3-2.1 {
  db eval {
    CREATE TEMP TABLE t3(x);
    INSERT INTO t3 VALUES(1);
  }
  db2 eval {
    CREATE TABLE t3(y,z);
    INSERT INTO t3 VALUES(8,9);
  }
  db eval {
    SELECT * FROM temp.t3 JOIN main.t3;
  }
} {1 8 9}
do_test tkt-d82e3-2.2 {
  db eval {
    VACUUM;
    SELECT * FROM temp.t3 JOIN main.t3;
  }
} {1 8 9}
db2 close

finish_test
