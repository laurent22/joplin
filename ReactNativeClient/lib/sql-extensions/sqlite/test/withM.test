# 2014 January 11
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
# focus of this file is testing the WITH clause.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set ::testprefix withM

ifcapable {!cte} {
  finish_test
  return
}

do_execsql_test 1.0 {
  CREATE TABLE t1(x INTEGER, y INTEGER);
  INSERT INTO t1 VALUES(123, 456);
}

do_faultsim_test withM-1.1 -prep {
  sqlite3 db test.db
} -body {
  execsql { 
    WITH tmp AS ( SELECT * FROM t1 )
    SELECT * FROM tmp;
  }
} -test {
  faultsim_test_result {0 {123 456}}
  db close
}

do_faultsim_test withM-1.2 -prep {
  sqlite3 db test.db
} -body {
  execsql { 
    WITH w1 AS ( SELECT * FROM t1 ),
         w2 AS ( 
           WITH w3 AS ( SELECT * FROM w1 )
           SELECT * FROM w3
         )
    SELECT * FROM w2;
  }
} -test {
  faultsim_test_result {0 {123 456}}
  db close
}

do_faultsim_test withM-1.3 -prep {
  sqlite3 db test.db
} -body {
  execsql { 
    WITH w1(a,b) AS ( 
      SELECT 1, 1
      UNION ALL
      SELECT a+1, b + 2*a + 1 FROM w1
    )
    SELECT * FROM w1 LIMIT 5;
  }
} -test {
  faultsim_test_result {0 {1 1 2 4 3 9 4 16 5 25}}
  db close
}

finish_test
