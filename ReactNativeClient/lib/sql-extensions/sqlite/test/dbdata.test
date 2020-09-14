# 2019-04-11
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this file is testing the sqlite_dbpage virtual table.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix dbdata

ifcapable !vtab||!compound {
  finish_test
  return
}
if { [catch { db enable_load_extension 1 }]
  || [catch { db eval { SELECT load_extension('../dbdata') } }] 
} {
  finish_test
  return
}

do_execsql_test 1.0 {
  CREATE TABLE T1(a, b);
  INSERT INTO t1(rowid, a ,b) VALUES(5, 'v', 'five');
  INSERT INTO t1(rowid, a, b) VALUES(10, 'x', 'ten');
}

do_execsql_test 1.1 {
  SELECT pgno, cell, field, quote(value) FROM sqlite_dbdata WHERE pgno=2;
} {
  2 0 -1 5 
  2 0  0 'v' 
  2 0  1 'five' 
  2 1 -1 10 
  2 1  0 'x' 
  2 1  1 'ten'
}

breakpoint
do_execsql_test 1.2 {
  SELECT pgno, cell, field, quote(value) FROM sqlite_dbdata;
} {
  1 0 -1 1 
  1 0 0 'table' 
  1 0 1 'T1' 
  1 0 2 'T1' 
  1 0 3 2 
  1 0 4 {'CREATE TABLE T1(a, b)'}
  2 0 -1 5 
  2 0  0 'v' 
  2 0  1 'five' 
  2 1 -1 10 
  2 1  0 'x' 
  2 1  1 'ten'
}

set big [string repeat big 2000]
do_execsql_test 1.3 {
  INSERT INTO t1 VALUES(NULL, $big);
  SELECT value FROM sqlite_dbdata WHERE pgno=2 AND cell=2 AND field=1;
} $big

do_execsql_test 1.4 {
  DELETE FROM t1;
  INSERT INTO t1 VALUES(NULL, randomblob(5050));
}
do_test 1.5 {
  execsql {
    SELECT quote(value) FROM sqlite_dbdata WHERE pgno=2 AND cell=0 AND field=1;
  }
} [db one {SELECT quote(b) FROM t1}]

#-------------------------------------------------------------------------
reset_db
db enable_load_extension 1
db eval { SELECT load_extension('../dbdata') }

do_execsql_test 2.0 {
  CREATE TABLE t1(a);
  CREATE INDEX i1 ON t1(a);
  WITH s(i) AS (
    SELECT 1 UNION ALL SELECT i+1 FROM s WHERE i<10
  )
  INSERT INTO t1 SELECT randomblob(900) FROM s;
}

do_execsql_test 2.1 {
  SELECT * FROM sqlite_dbptr WHERE pgno=2;
} {
  2 25   2 6   2 7   2 9   2 11   2 13   2 15   2 17   2 19   2 21
}

do_execsql_test 2.2 {
  SELECT * FROM sqlite_dbptr WHERE pgno=3;
} {
  3 24   3 23
}

do_execsql_test 2.3 {
  SELECT * FROM sqlite_dbptr
} {
  2 25   2 6   2 7   2 9   2 11   2 13   2 15   2 17   2 19   2 21
  3 24   3 23
}


finish_test
