# 2007 Dec 12
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file contains test cases for stressing database
# changes that involve side effects that delete rows from
# the table being changed.  Ticket #2832 shows that in
# older versions of SQLite that behavior was implemented
# incorrectly and resulted in corrupt database files.
#
# $Id: sidedelete.test,v 1.2 2008/08/04 03:51:24 danielk1977 Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# The sequence table is created to store a sequence of integers
# starting with 1.  This is used to reinitialize other tables
# as part of other tests.
#
do_test sidedelete-1.1 {
  execsql {
    CREATE TABLE sequence(a INTEGER PRIMARY KEY);
    INSERT INTO sequence VALUES(1);
    INSERT INTO sequence VALUES(2);
  }
  for {set i 0} {$i<8} {incr i} {
    execsql {
      INSERT INTO sequence SELECT a+(SELECT max(a) FROM sequence) FROM sequence;
    }
  }
  execsql {SELECT count(*) FROM sequence}
} {512}

# Make a series of changes using an UPDATE OR REPLACE and a
# correlated subquery.  This would cause database corruption
# prior to the fix for ticket #2832.
#
do_test sidedelete-2.0 {
  execsql {
    CREATE TABLE t1(a PRIMARY KEY, b);
    CREATE TABLE chng(a PRIMARY KEY, b);
    SELECT count(*) FROM t1;
    SELECT count(*) FROM chng;
  }
} {0 0}
for {set i 2} {$i<=100} {incr i} {
  set n [expr {($i+2)/2}]
  do_test sidedelete-2.$i.1 {
    execsql {
      DELETE FROM t1;
      INSERT INTO t1 SELECT a, a FROM sequence WHERE a<=$i;
      DELETE FROM chng;
      INSERT INTO chng SELECT a*2, a*2+1 FROM sequence WHERE a<=$i/2;
      UPDATE OR REPLACE t1 SET a=(SELECT b FROM chng WHERE a=t1.a);
      SELECT count(*), sum(a) FROM t1;
    }
  } [list $n [expr {$n*$n-1}]]
  integrity_check sidedelete-2.$i.2
}

# This will cause stacks leaks but not database corruption prior
# to the #2832 fix.
#
do_test sidedelete-3.0 {
  execsql {
     DROP TABLE t1;
     CREATE TABLE t1(a PRIMARY KEY);
     SELECT * FROM t1;
  }
} {}
for {set i 1} {$i<=100} {incr i} {
  set n [expr {($i+1)/2}]
  do_test sidedelete-3.$i.1 {
    execsql {
      DELETE FROM t1;
      INSERT INTO t1 SELECT a FROM sequence WHERE a<=$i;
      UPDATE OR REPLACE t1 SET a=a+1;
      SELECT count(*), sum(a) FROM t1;
    }
  } [list $n [expr {$n*($n+1)}]]
  integrity_check sidedelete-3.$i.2
}

finish_test
