# 2001 September 15
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
# focus of this file is testing the 'progress callback'.
#
# $Id: progress.test,v 1.8 2007/06/15 14:53:53 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If the progress callback is not available in this build, skip this
# whole file.
ifcapable !progress {
  finish_test
  return
}

# Build some test data
#
execsql {
  BEGIN;
  CREATE TABLE t1(a);
  INSERT INTO t1 VALUES(1);
  INSERT INTO t1 VALUES(2);
  INSERT INTO t1 VALUES(3);
  INSERT INTO t1 VALUES(4);
  INSERT INTO t1 VALUES(5);
  INSERT INTO t1 VALUES(6);
  INSERT INTO t1 VALUES(7);
  INSERT INTO t1 VALUES(8);
  INSERT INTO t1 VALUES(9);
  INSERT INTO t1 VALUES(10);
  COMMIT;
}


# Test that the progress callback is invoked.
do_test progress-1.0 {
  set counter 0
  db progress 1 "[namespace code {incr counter}] ; expr 0"
  execsql {
    SELECT * FROM t1
  }
  expr $counter > 1
} 1
do_test progress-1.0.1 {
  db progress
} {::namespace inscope :: {incr counter} ; expr 0}
do_test progress-1.0.2 {
  set v [catch {db progress xyz bogus} msg]
  lappend v $msg
} {1 {expected integer but got "xyz"}}

# Test that the query is abandoned when the progress callback returns non-zero
do_test progress-1.1 {
  set counter 0
  db progress 1 "[namespace code {incr counter}] ; expr 1"
  set rc [catch {execsql {
    SELECT * FROM t1
  }}]
  list $counter $rc
} {1 1}

# Test that the query is rolled back when the progress callback returns
# non-zero.
do_test progress-1.2 {

  # This figures out how many opcodes it takes to copy 5 extra rows into t1.
  db progress 1 "[namespace code {incr five_rows}] ; expr 0"
  set five_rows 0
  execsql {
    INSERT INTO t1 SELECT a+10 FROM t1 WHERE a < 6
  }
  db progress 0 ""
  execsql {
    DELETE FROM t1 WHERE a > 10
  }

  # Now set up the progress callback to abandon the query after the number of
  # opcodes to copy 5 rows. That way, when we try to copy 6 rows, we know
  # some data will have been inserted into the table by the time the progress
  # callback abandons the query.
  db progress $five_rows "expr 1"
  catchsql {
    INSERT INTO t1 SELECT a+10 FROM t1 WHERE a < 9
  }
  execsql {
    SELECT count(*) FROM t1
  }
} 10

# Test that an active transaction remains active and not rolled back 
# after the progress query abandons a query. 
#
# UPDATE: It is now recognised that this is a sure route to database
# corruption. So the transaction is rolled back.
do_test progress-1.3 {

  db progress 0 ""
  execsql BEGIN
  execsql {
    INSERT INTO t1 VALUES(11)
  }
  db progress 1 "expr 1"
  catchsql {
    INSERT INTO t1 VALUES(12)
  }
  db progress 0 ""
  catchsql COMMIT
} {1 {cannot commit - no transaction is active}}
do_test progress-1.3.1 {
  execsql {
    SELECT count(*) FROM t1
  }
} 10

# Check that a value of 0 for N means no progress callback
do_test progress-1.4 {
  set counter 0
  db progress 0 "[namespace code {incr counter}] ; expr 0"
  execsql {
    SELECT * FROM t1;
  }
  set counter
} 0

db progress 0 ""

# Make sure other queries can be run from within the progress
# handler.  Ticket #1827
#
do_test progress-1.5 {
  set rx 0
  proc set_rx {args} {
    db progress 0 {}
    set ::rx [db eval {SELECT count(*) FROM t1}]
    return [expr 0]
  }
  db progress 10 set_rx
  db eval {
    SELECT sum(a) FROM t1
  }
} {55}
do_test progress-1.6 {
  set ::rx
} {10}

# Check that abandoning a query using the progress handler does
# not cause other queries to abort. Ticket #2415.
do_test progress-1.7 {
  execsql {
    CREATE TABLE abc(a, b, c);
    INSERT INTO abc VALUES(1, 2, 3);
    INSERT INTO abc VALUES(4, 5, 6);
    INSERT INTO abc VALUES(7, 8, 9);
  }

  set ::res [list]
  db eval {SELECT a, b, c FROM abc} {
    lappend ::res $a $b $c
    db progress 5 "expr 1"
    catch {db eval {SELECT a, b, c FROM abc} { }} msg
    db progress 5 "expr 0"
    lappend ::res $msg
  }

  set ::res
} {1 2 3 interrupted 4 5 6 interrupted 7 8 9 interrupted}

finish_test
