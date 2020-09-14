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
# focus of this file is testing the SELECT statement.
#
# $Id: select2.test,v 1.28 2009/01/15 15:23:59 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Create a table with some data
#
execsql {CREATE TABLE tbl1(f1 int, f2 int)}
execsql {BEGIN}
for {set i 0} {$i<=30} {incr i} {
  execsql "INSERT INTO tbl1 VALUES([expr {$i%9}],[expr {$i%10}])"
}
execsql {COMMIT}

# Do a second query inside a first.
#
do_test select2-1.1 {
  set sql {SELECT DISTINCT f1 FROM tbl1 ORDER BY f1}
  set r {}
  catch {unset data}
  db eval $sql data {
    set f1 $data(f1)
    lappend r $f1:
    set sql2 "SELECT f2 FROM tbl1 WHERE f1=$f1 ORDER BY f2"
    db eval $sql2 d2 {
      lappend r $d2(f2)
    }
  }
  set r
} {0: 0 7 8 9 1: 0 1 8 9 2: 0 1 2 9 3: 0 1 2 3 4: 2 3 4 5: 3 4 5 6: 4 5 6 7: 5 6 7 8: 6 7 8}

do_test select2-1.2 {
  set sql {SELECT DISTINCT f1 FROM tbl1 WHERE f1>3 AND f1<5}
  set r {}
  db eval $sql data {
    set f1 $data(f1)
    lappend r $f1:
    set sql2 "SELECT f2 FROM tbl1 WHERE f1=$f1 ORDER BY f2"
    db eval $sql2 d2 {
      lappend r $d2(f2)
    }
  }
  set r
} {4: 2 3 4}
unset data

# Create a largish table. Do this twice, once using the TCL cache and once
# without.  Compare the performance to make sure things go faster with the
# cache turned on.
#
ifcapable tclvar {
  do_test select2-2.0.1 {
    set t1 [time {
      execsql {CREATE TABLE tbl2(f1 int, f2 int, f3 int); BEGIN;}
      for {set i 1} {$i<=30000} {incr i} {
        set i2 [expr {$i*2}]
        set i3 [expr {$i*3}]
        db eval {INSERT INTO tbl2 VALUES($i,$i2,$i3)}
      }
      execsql {COMMIT}
    }]
    list
  } {}
  puts "time with cache: $::t1"
}
catch {execsql {DROP TABLE tbl2}}
do_test select2-2.0.2 {
  set t2 [time {
    execsql {CREATE TABLE tbl2(f1 int, f2 int, f3 int); BEGIN;}
    for {set i 1} {$i<=30000} {incr i} {
      set i2 [expr {$i*2}]
      set i3 [expr {$i*3}]
      execsql "INSERT INTO tbl2 VALUES($i,$i2,$i3)"
    }
    execsql {COMMIT}
  }]
  list
} {}
puts "time without cache: $t2"
#ifcapable tclvar {
#  do_test select2-2.0.3 {
#    expr {[lindex $t1 0]<[lindex $t2 0]}
#  } 1
#}

do_test select2-2.1 {
  execsql {SELECT count(*) FROM tbl2}
} {30000}
do_test select2-2.2 {
  execsql {SELECT count(*) FROM tbl2 WHERE f2>1000}
} {29500}

do_test select2-3.1 {
  execsql {SELECT f1 FROM tbl2 WHERE 1000=f2}
} {500}

do_test select2-3.2a {
  execsql {CREATE INDEX idx1 ON tbl2(f2)}
} {}
do_test select2-3.2b {
  execsql {SELECT f1 FROM tbl2 WHERE 1000=f2}
} {500}
do_test select2-3.2c {
  execsql {SELECT f1 FROM tbl2 WHERE f2=1000}
} {500}
do_test select2-3.2d {
  set sqlite_search_count 0
  execsql {SELECT * FROM tbl2 WHERE 1000=f2}
  set sqlite_search_count
} {3}
do_test select2-3.2e {
  set sqlite_search_count 0
  execsql {SELECT * FROM tbl2 WHERE f2=1000}
  set sqlite_search_count
} {3}

# Make sure queries run faster with an index than without
#
do_test select2-3.3 {
  execsql {DROP INDEX idx1}
  set sqlite_search_count 0
  execsql {SELECT f1 FROM tbl2 WHERE f2==2000}
  set sqlite_search_count
} {29999}

# Make sure we can optimize functions in the WHERE clause that
# use fields from two or more different table.  (Bug #6)
#
do_test select2-4.1 {
  execsql {
    CREATE TABLE aa(a);
    CREATE TABLE bb(b);
    INSERT INTO aa VALUES(1);
    INSERT INTO aa VALUES(3);
    INSERT INTO bb VALUES(2);
    INSERT INTO bb VALUES(4);
    SELECT * FROM aa, bb WHERE max(a,b)>2;
  }
} {1 4 3 2 3 4}
do_test select2-4.2 {
  execsql {
    INSERT INTO bb VALUES(0);
    SELECT * FROM aa CROSS JOIN bb WHERE b;
  }
} {1 2 1 4 3 2 3 4}
do_test select2-4.3 {
  execsql {
    SELECT * FROM aa CROSS JOIN bb WHERE NOT b;
  }
} {1 0 3 0}
do_test select2-4.4 {
  execsql {
    SELECT * FROM aa, bb WHERE min(a,b);
  }
} {1 2 1 4 3 2 3 4}
do_test select2-4.5 {
  execsql {
    SELECT * FROM aa, bb WHERE NOT min(a,b);
  }
} {1 0 3 0}
do_test select2-4.6 {
  execsql {
    SELECT * FROM aa, bb WHERE CASE WHEN a=b-1 THEN 1 END;
  }
} {1 2 3 4}
do_test select2-4.7 {
  execsql {
    SELECT * FROM aa, bb WHERE CASE WHEN a=b-1 THEN 0 ELSE 1 END;
  }
} {1 4 1 0 3 2 3 0}

finish_test
