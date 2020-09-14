# 2007 Febuary 24
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
# This file implements tests to verify that table column values
# are pulled out of the database correctly.
#
# Long ago, the OP_Column opcode was sufficient to pull out the
# value of a table column.  But then we added the ALTER TABLE ADD COLUMN
# feature.  An added column might not actually exist in every row,
# and so the OP_Column opcode has to contain a default value.  Later
# still we added a feature whereby a REAL value with no fractional
# part is stored in the database file as an integer to save space.
# After extracting the value, we have to call OP_RealAffinity to
# convert it back to a REAL.
#
# The sqlite3ExprCodeGetColumn() routine was added to take care of
# all of the complications above.  The tests in this file attempt
# to verify that sqlite3ExprCodeGetColumn() is used instead of a
# raw OP_Column in all places where a table column is extracted from
# the database.
#
# $Id: tkt2251.test,v 1.2 2007/09/12 17:01:45 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !altertable {
  finish_test
  return
}

# Create sample data.  Verify that the default value and type of an added
# column is correct for aggregates.
do_test tkt2251-1.1 {
  execsql {
    CREATE TABLE t1(a INTEGER);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(1);
    INSERT INTO t1 VALUES(2);
    INSERT INTO t1 VALUES(9);
    INSERT INTO t1 VALUES(9);
    INSERT INTO t1 VALUES(9);
    INSERT INTO t1 VALUES(3);
    INSERT INTO t1 VALUES(2);
    ALTER TABLE t1 ADD COLUMN b REAL DEFAULT 4.0;
    SELECT avg(b), typeof(avg(b)) FROM t1;
  }
} {4.0 real}
do_test tkt2251-1.2 {
  execsql {
    SELECT sum(b), typeof(sum(b)) FROM t1;
  }
} {32.0 real}
do_test tkt2251-1.3 {
  execsql {
    SELECT a, sum(b), typeof(sum(b)) FROM t1 GROUP BY a ORDER BY a;
  }
} {1 8.0 real 2 8.0 real 3 4.0 real 9 12.0 real}

# Make sure that the REAL value comes out when values are accessed
# by index.
#
do_test tkt2251-2.1 {
  execsql {
    SELECT b, typeof(b) FROM t1 WHERE a=3;
  }
} {4.0 real}
do_test tkt2251-2.2 {
  execsql {
    CREATE INDEX t1i1 ON t1(a,b);
    SELECT b, typeof(b) FROM t1 WHERE a=3;
  }
} {4.0 real}
do_test tkt2251-2.3 {
  execsql {
    REINDEX;
    SELECT b, typeof(b) FROM t1 WHERE a=3;
  }
} {4.0 real}

# Make sure the correct REAL value is used when copying from one
# table to another.
#
do_test tkt2251-3.1 {
  execsql {
    CREATE TABLE t2(x,y);
    INSERT INTO t2 SELECT * FROM t1;
    SELECT y, typeof(y) FROM t2 WHERE x=3;
  }
} {4.0 real}
do_test tkt2251-3.2 {
  execsql {
    CREATE TABLE t3 AS SELECT * FROM t1;
    SELECT b, typeof(b) FROM t3 WHERE a=3;
  }
} {4.0 real}


finish_test
