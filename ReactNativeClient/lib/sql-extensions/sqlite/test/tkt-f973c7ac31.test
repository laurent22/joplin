# 2010 June 09
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test tkt-f973c7ac3-1.0 {
  execsql {
    CREATE TABLE t(c1 INTEGER, c2 INTEGER);
    INSERT INTO t VALUES(5, 5);
    INSERT INTO t VALUES(5, 4);
  }
} {}

foreach {tn sql} {
  1 ""
  2 "CREATE INDEX i1 ON t(c1, c2)"
} {

  execsql $sql

  do_test tkt-f973c7ac3-1.$tn.1 {
    execsql { 
      SELECT * FROM t WHERE c1 = 5 AND c2>0 AND c2<='2' ORDER BY c2 DESC 
    }
  } {}
  do_test tkt-f973c7ac3-1.$tn.2 {
    execsql { 
      SELECT * FROM t WHERE c1 = 5 AND c2>0 AND c2<=5 ORDER BY c2 DESC 
    }
  } {5 5 5 4}
  do_test tkt-f973c7ac3-1.$tn.3 {
    execsql { 
      SELECT * FROM t WHERE c1 = 5 AND c2>0 AND c2<='5' ORDER BY c2 DESC 
    }
  } {5 5 5 4}
  do_test tkt-f973c7ac3-1.$tn.4 {
    execsql { 
      SELECT * FROM t WHERE c1 = 5 AND c2>'0' AND c2<=5 ORDER BY c2 DESC 
    }
  } {5 5 5 4}
  do_test tkt-f973c7ac3-1.$tn.5 {
    execsql { 
      SELECT * FROM t WHERE c1 = 5 AND c2>'0' AND c2<='5' ORDER BY c2 DESC 
    }
  } {5 5 5 4}

  do_test tkt-f973c7ac3-1.$tn.6 {
    execsql { 
      SELECT * FROM t WHERE c1 = 5 AND c2>0 AND c2<='2' ORDER BY c2 ASC 
    }
  } {}
  do_test tkt-f973c7ac3-1.$tn.7 {
    execsql { 
      SELECT * FROM t WHERE c1 = 5 AND c2>0 AND c2<=5 ORDER BY c2 ASC 
    }
  } {5 4 5 5}
  do_test tkt-f973c7ac3-1.$tn.8 {
    execsql { 
      SELECT * FROM t WHERE c1 = 5 AND c2>0 AND c2<='5' ORDER BY c2 ASC 
    }
  } {5 4 5 5}
  do_test tkt-f973c7ac3-1.$tn.9 {
    execsql { 
      SELECT * FROM t WHERE c1 = 5 AND c2>'0' AND c2<=5 ORDER BY c2 ASC 
    }
  } {5 4 5 5}
  do_test tkt-f973c7ac3-1.$tn.10 {
    execsql { 
      SELECT * FROM t WHERE c1 = 5 AND c2>'0' AND c2<='5' ORDER BY c2 ASC 
    }
  } {5 4 5 5}
} 


finish_test
