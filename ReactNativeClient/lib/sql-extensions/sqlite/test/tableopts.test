# 2013-10-19
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
# Test the operation of table-options in the WITH clause of the
# CREATE TABLE statement.
#


set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tableopt-1.1 {
  catchsql {
    CREATE TABLE t1(a,b) WITHOUT rowid;
  }
} {1 {PRIMARY KEY missing on table t1}}
do_test tableopt-1.1b {
  catchsql {
    CREATE TABLE t1(a INTEGER PRIMARY KEY AUTOINCREMENT,b) WITHOUT rowid;
  }
} {1 {AUTOINCREMENT not allowed on WITHOUT ROWID tables}}
do_test tableopt-1.2 {
  catchsql {
    CREATE TABLE t1(a,b) WITHOUT unknown2;
  }
} {1 {unknown table option: unknown2}}

do_execsql_test tableopt-2.1 {
  CREATE TABLE t1(a, b, c, PRIMARY KEY(a,b)) WITHOUT rowid;
  INSERT INTO t1 VALUES(1,2,3),(2,3,4);
  SELECT c FROM t1 WHERE a IN (1,2) ORDER BY b;
} {3 4}
do_test tableopt-2.1.1 {
  catchsql {
    SELECT rowid, * FROM t1;
  }
} {1 {no such column: rowid}}
do_test tableopt-2.1.2 {
  catchsql {
    SELECT _rowid_, * FROM t1;
  }
} {1 {no such column: _rowid_}}
do_test tableopt-2.1.3 {
  catchsql {
    SELECT oid, * FROM t1;
  }
} {1 {no such column: oid}}
do_execsql_test tableopt-2.2 {
  VACUUM;
  SELECT c FROM t1 WHERE a IN (1,2) ORDER BY b;
} {3 4}
do_test tableopt-2.3 {
  sqlite3 db2 test.db
  db2 eval {SELECT c FROM t1 WHERE a IN (1,2) ORDER BY b;}
} {3 4}
db2 close

# Make sure the "without" keyword is still usable as a table or
# column name.
#
do_execsql_test tableopt-3.1 {
  CREATE TABLE without(x INTEGER PRIMARY KEY, without TEXT);
  INSERT INTO without VALUES(1, 'xyzzy'), (2, 'fizzle');
  SELECT * FROM without WHERE without='xyzzy';
} {1 xyzzy}

  
finish_test
