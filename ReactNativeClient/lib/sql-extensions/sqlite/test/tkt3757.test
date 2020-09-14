# 2009 March 28
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
# Ticket #3757:  The cost functions on the query optimizer for the
# IN operator can be improved.
#
# $Id: tkt3757.test,v 1.1 2009/03/29 00:13:04 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Evaluate SQL.  Return the result set followed by the
# and the number of full-scan steps.
#
proc count_steps {sql} {
  set r [db eval $sql]
  lappend r scan [db status step] sort [db status sort]
}

# Construct tables
#
do_test tkt3757-1.1 {
  db eval {
     CREATE TABLE t1(x INTEGER, y INTEGER, z TEXT);
     CREATE INDEX t1i1 ON t1(y,z);
     INSERT INTO t1 VALUES(1,2,'three');
     CREATE TABLE t2(a INTEGER, b TEXT);
     INSERT INTO t2 VALUES(2, 'two');
     ANALYZE;
     SELECT * FROM sqlite_stat1 ORDER BY 1, 2;
  }
} {t1 t1i1 {1 1 1} t2 {} 1}

# Modify statistics in order to make the optimizer then that:
#
#   (1)  Table T1 has about 250K entries
#   (2)  There are only about 5 distinct values of T1.
#
# Then run a query with "t1.y IN (SELECT ..)" in the WHERE clause.
# Make sure the index is used.
#
do_test tkt3757-1.2 {
  db eval {
    DELETE FROM sqlite_stat1;
    INSERT INTO sqlite_stat1 VALUES('t1','t1i1','250000 50000 30');
  }
  count_steps {
    SELECT * FROM t1 WHERE y IN (SELECT a FROM t2)
  }
} {1 2 three scan 0 sort 0}

finish_test
