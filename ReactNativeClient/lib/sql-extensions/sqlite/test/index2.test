# 2005-01-11
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
# focus of this file is testing the CREATE INDEX statement.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Create a table with a large number of columns
#
do_test index2-1.1 {
  set sql {CREATE TABLE t1(}
  for {set i 1} {$i<1000} {incr i} {
    append sql "c$i,"
  }
  append sql "c1000);"
  execsql $sql
} {}
do_test index2-1.2 {
  set sql {INSERT INTO t1 VALUES(}
  for {set i 1} {$i<1000} {incr i} {
    append sql $i,
  }
  append sql {1000);}
  execsql $sql
} {}
do_test index2-1.3 {
  execsql {SELECT c123 FROM t1}
} 123
do_test index2-1.4 {
  execsql BEGIN
  for {set j 1} {$j<=100} {incr j} {
    set sql {INSERT INTO t1 VALUES(}
    for {set i 1} {$i<1000} {incr i} {
      append sql [expr {$j*10000+$i}],
    }
    append sql "[expr {$j*10000+1000}]);"
    execsql $sql
  }
  execsql COMMIT
  execsql {SELECT count(*) FROM t1}
} 101
do_test index2-1.5 {
  execsql {SELECT round(sum(c1000)) FROM t1}
} {50601000.0}

# Create indices with many columns
#
do_test index2-2.1 {
  set sql "CREATE INDEX t1i1 ON t1("
  for {set i 1} {$i<1000} {incr i} {
    append sql c$i,
  }
  append sql c1000)
  execsql $sql
} {}
do_test index2-2.2 {
  ifcapable explain {
    execsql {EXPLAIN SELECT c9 FROM t1 ORDER BY c1, c2, c3, c4, c5}
  }
  execsql {SELECT c9 FROM t1 ORDER BY c1, c2, c3, c4, c5, c6 LIMIT 5}
} {9 10009 20009 30009 40009}

finish_test
