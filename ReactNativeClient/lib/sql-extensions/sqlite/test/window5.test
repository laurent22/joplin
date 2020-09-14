# 2018 May 8
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. Specifically,
# it tests the sqlite3_create_window_function() API.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix window5

ifcapable !windowfunc {
  finish_test
  return
}

proc m_step {ctx val} {
  lappend ctx $val
  return $ctx
}
proc m_value {ctx} {
  set lSort [lsort $ctx]

  set nVal [llength $lSort]
  set n [expr $nVal/2]
  
  if {($nVal % 2)==0 && $nVal>0} {
    set a [lindex $lSort $n]
    set b [lindex $lSort $n-1]
    if {($a+$b) % 2} {
      set ret [expr ($a+$b)/2.0]
    } else {
      set ret [expr ($a+$b)/2]
    }
  } else {
    set ret [lindex $lSort $n]
  }
  return $ret
}
proc m_inverse {ctx val} {
  set ctx [lrange $ctx 1 end]
  return $ctx
}
proc w_value {ctx} {
  lsort $ctx
}

sqlite3_create_window_function db median m_step m_value m_value m_inverse
sqlite3_create_window_function db win m_step w_value w_value m_inverse

do_test 0.0 {
  test_create_window_function_misuse db
} {}

do_execsql_test 1.0 {
  CREATE TABLE t1(a, b);
  INSERT INTO t1 VALUES(4, 'a');
  INSERT INTO t1 VALUES(6, 'b');
  INSERT INTO t1 VALUES(1, 'c');
  INSERT INTO t1 VALUES(5, 'd');
  INSERT INTO t1 VALUES(2, 'e');
  INSERT INTO t1 VALUES(3, 'f');
}

do_execsql_test 1.1 {
  SELECT win(a) OVER (ORDER BY b), median(a) OVER (ORDER BY b) FROM t1;
} {4 4  {4 6} 5  {1 4 6} 4  {1 4 5 6} 4.5  {1 2 4 5 6} 4 {1 2 3 4 5 6} 3.5}

test_create_sumint db
do_execsql_test 2.0 {
  SELECT sumint(a) OVER (ORDER BY rowid) FROM t1 ORDER BY rowid;
} {4 10 11 16 18 21}

do_execsql_test 2.1 {
  SELECT sumint(a) OVER (ORDER BY rowid ROWS BETWEEN 1 PRECEDING AND 1 FOLLOWING) FROM t1 ORDER BY rowid;
} {10 11 12 8 10 5}

test_override_sum db
do_catchsql_test 3.0 {
  SELECT sum(a) OVER 
  (ORDER BY b ROWS BETWEEN 1 PRECEDING AND CURRENT ROW) 
  FROM t1;
} {1 {sum() may not be used as a window function}}
do_execsql_test 3.1 {
  SELECT sum(a) FROM t1;
} {21}


finish_test
