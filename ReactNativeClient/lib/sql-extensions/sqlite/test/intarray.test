# 2009 November 10
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
# This file implements tests for the "intarray" object implemented
# in test_intarray.c.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  return
}

do_test intarray-1.0 {
  db eval {
    CREATE TABLE t1(a INTEGER PRIMARY KEY, b);
  }
  for {set i 1} {$i<=999} {incr i} {
    set b [format {x%03d} $i]
    db eval {INSERT INTO t1(a,b) VALUES($i,$b)}
  }
  db eval {
    CREATE TABLE t2(x INTEGER PRIMARY KEY, y);
    INSERT INTO t2 SELECT * FROM t1;
    SELECT b FROM t1 WHERE a IN (12,34,56,78) ORDER BY a
  }
} {x012 x034 x056 x078}

do_test intarray-1.1 {
  set ia1 [sqlite3_intarray_create db ia1]
  set ia2 [sqlite3_intarray_create db ia2]
  set ia3 [sqlite3_intarray_create db ia3]
  set ia4 [sqlite3_intarray_create db ia4]
  db eval {
    SELECT type, name FROM temp.sqlite_master
     ORDER BY name
  }
} {table ia1 table ia2 table ia3 table ia4}

# Verify the ability to DROP and recreate an intarray virtual table.
do_test intarray-1.1b {
  db eval {DROP TABLE ia1}
  set rc [catch {sqlite3_intarray_create db ia1} ia1]
  lappend rc $ia1
} {/0 [0-9A-Z]+/} 

do_test intarray-1.2 {
  db eval {
    SELECT b FROM t1 WHERE a IN ia3 ORDER BY a
  }
} {}

do_test intarray-1.3 {
  sqlite3_intarray_bind $ia3 45 123 678
  db eval {
    SELECT b FROM t1 WHERE a IN ia3 ORDER BY a
  }
} {x045 x123 x678}

do_test intarray-1.4 {
  db eval {
    SELECT count(b) FROM t1 WHERE a NOT IN ia3 ORDER BY a
  }
} {996}

#explain {SELECT b FROM t1 WHERE a NOT IN ia3}

do_test intarray-1.5 {
  set cmd sqlite3_intarray_bind
  lappend cmd $ia1
  for {set i 1} {$i<=999} {incr i} {
    lappend cmd $i
    lappend cmd [expr {$i+1000}]
    lappend cmd [expr {$i+2000}]
  }
  eval $cmd
  db eval {
    REPLACE INTO t1 SELECT * FROM t2;
    DELETE FROM t1 WHERE a NOT IN ia1;
    SELECT count(*) FROM t1;
  }
} {999}

do_test intarray-1.6 {
  db eval {
    DELETE FROM t1 WHERE a IN ia1;
    SELECT count(*) FROM t1;
  }
} {0}

do_test intarray-2.1 {
  db eval {
    CREATE TEMP TABLE t3(p,q);
    INSERT INTO t3 SELECT * FROM t2;
    SELECT count(*) FROM t3 WHERE p IN ia1;
  }
} {999}

do_test intarray-2.2 {
  set ia5 [sqlite3_intarray_create db ia5]
  db eval {
    SELECT count(*) FROM t3 WHERE p IN ia1;
  }
} {999}

finish_test
