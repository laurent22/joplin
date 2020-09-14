# 2012 May 11
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
# This file implements tests to verify that ticket [bdc6bbbb38] has been
# fixed.  
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix tkt-bdc6bbbb38

# If SQLITE_ENABLE_FTS3 is defined, omit this file.
ifcapable !fts3 { finish_test ; return }
set sqlite_fts3_enable_parentheses 1

foreach {tn idxdir} {1 ASC 2 DESC} {
  execsql { DROP TABLE IF EXISTS t2 }

  do_execsql_test $tn.1.1 "CREATE VIRTUAL TABLE t2 USING fts4(x, order=$idxdir)"
  do_execsql_test $tn.1.2 { INSERT INTO t2 VALUES('a b c') }

  do_execsql_test $tn.1.3 {
    SELECT offsets(t2) FROM t2 WHERE t2 MATCH 'a AND d OR b' ORDER BY docid ASC
  } {
    {0 0 0 1 0 2 2 1}
  }
  do_execsql_test $tn.1.4 {
    SELECT snippet(t2,'[',']') FROM t2 WHERE t2 MATCH 'a AND d OR b' 
    ORDER BY docid ASC
  } {
    {[a] [b] c}
  }
  do_execsql_test $tn.1.5 { INSERT INTO t2 VALUES('a c d') }
  do_execsql_test $tn.1.6 {
    SELECT offsets(t2) FROM t2 WHERE t2 MATCH 'a AND d OR b' ORDER BY docid ASC
  } {
    {0 0 0 1 0 2 2 1}
    {0 0 0 1 0 1 4 1}
  }
  do_execsql_test $tn.1.7 {
    SELECT snippet(t2,'[',']') FROM t2 WHERE t2 MATCH 'a AND d OR b'
    ORDER BY docid ASC
  } {
    {[a] [b] c}
    {[a] c [d]}
  }

  execsql { DROP TABLE IF EXISTS t3 }
  do_execsql_test $tn.2.1 "CREATE VIRTUAL TABLE t3 USING fts4(x, order=$idxdir)"
  do_execsql_test $tn.2.2 { INSERT INTO t3 VALUES('a c d') }
  do_execsql_test $tn.2.3 {
    SELECT offsets(t3) FROM t3 WHERE t3 MATCH 'a AND d OR b' ORDER BY docid DESC
  } {
    {0 0 0 1 0 1 4 1}
  }
  do_execsql_test $tn.2.4 {
    SELECT snippet(t3,'[',']') FROM t3 WHERE t3 MATCH 'a AND d OR b'
      ORDER BY docid DESC
  } {
    {[a] c [d]}
  }
  do_execsql_test $tn.2.5 { 
    INSERT INTO t3 VALUES('a b c');
  }
  do_execsql_test $tn.2.6 {
    SELECT offsets(t3) FROM t3 WHERE t3 MATCH 'a AND d OR b' ORDER BY docid DESC
  } {
    {0 0 0 1 0 2 2 1}
    {0 0 0 1 0 1 4 1}
  }
  do_execsql_test $tn.2.7 {
    SELECT snippet(t3,'[',']') FROM t3 WHERE t3 MATCH 'a AND d OR b'
      ORDER BY docid DESC
  } {
    {[a] [b] c}
    {[a] c [d]}
  }
}

set sqlite_fts3_enable_parentheses 0
finish_test
