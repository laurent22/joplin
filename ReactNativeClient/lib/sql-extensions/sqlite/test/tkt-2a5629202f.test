# 2012 April 19
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# The tests in this file were used while developing the SQLite 4 code. 
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix tkt-2a5629202f

# This procedure executes the SQL.  Then it checks to see if the OP_Sort
# opcode was executed.  If an OP_Sort did occur, then "sort" is appended
# to the result.  If no OP_Sort happened, then "nosort" is appended.
#
# This procedure is used to check to make sure sorting is or is not
# occurring as expected.
#
proc cksort {sql} {
  set data [execsql $sql]
  if {[db status sort]} {set x sort} {set x nosort}
  lappend data $x
  return $data
}

do_execsql_test 1.1 {
  CREATE TABLE t8(b TEXT, c TEXT);
  INSERT INTO t8 VALUES('a',  'one');
  INSERT INTO t8 VALUES('b',  'two');
  INSERT INTO t8 VALUES(NULL, 'three');
  INSERT INTO t8 VALUES(NULL, 'four');
}

do_execsql_test 1.2 {
  SELECT coalesce(b, 'null') || '/' || c FROM t8 x ORDER BY x.b, x.c
} {null/four null/three a/one b/two}

do_execsql_test 1.3 {
  CREATE UNIQUE INDEX i1 ON t8(b);
  SELECT coalesce(b, 'null') || '/' || c FROM t8 x ORDER BY x.b, x.c
} {null/four null/three a/one b/two}

do_execsql_test 1.4 {
  DROP INDEX i1;
  CREATE UNIQUE INDEX i1 ON t8(b, c);
  SELECT coalesce(b, 'null') || '/' || c FROM t8 x ORDER BY x.b, x.c
} {null/four null/three a/one b/two}

#-------------------------------------------------------------------------
#

do_execsql_test 2.1 {
  CREATE TABLE t2(a, b NOT NULL, c);
  CREATE UNIQUE INDEX t2ab ON t2(a, b);
  CREATE UNIQUE INDEX t2ba ON t2(b, a);
}

do_test 2.2 {
  cksort { SELECT * FROM t2 WHERE a = 10 ORDER BY a, b, c }
} {nosort}

do_test 2.3 {
  cksort { SELECT * FROM t2 WHERE b = 10 ORDER BY a, b, c }
} {sort}

do_test 2.4 {
  cksort { SELECT * FROM t2 WHERE a IS NULL ORDER BY a, b, c }
} {sort}

finish_test
