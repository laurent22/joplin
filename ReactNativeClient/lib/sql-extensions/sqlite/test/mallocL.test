# 2014 August 12
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This test script is designed to show that the assert() fix at 
# [f1cb48f412] really is required.
# 

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
set testprefix mallocL

do_test 1.0 {
  for {set i 0} {$i < 40} {incr i} { 
    lappend cols "c$i" 
    lappend vals $i
  }

  execsql "CREATE TABLE t1([join $cols ,])"
  execsql "CREATE INDEX i1 ON t1([join $cols ,])"
  execsql "INSERT INTO t1 VALUES([join $vals ,])"
} {}

for {set j 1} {$j < 40} {incr j} {
  set ::sql "SELECT DISTINCT [join [lrange $cols 0 $j] ,] FROM t1"
  do_faultsim_test 1.$j -faults oom* -body {
    execsql $::sql
  } -test {
    faultsim_test_result [list 0 [lrange $::vals 0 $::j]]
  }
}


finish_test
