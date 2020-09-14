# 2002 May 24
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
# This file implements tests for joins, including outer joins, where
# there are a large number of tables involved in the join.
#
# $Id: join3.test,v 1.4 2005/01/19 23:24:51 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# An unrestricted join
#
catch {unset ::result}
set result {}
for {set N 1} {$N<=$bitmask_size} {incr N} {
  lappend result $N
  do_test join3-1.$N {
    execsql "CREATE TABLE t${N}(x);"
    execsql "INSERT INTO t$N VALUES($N)"
    set sql "SELECT * FROM t1"
    for {set i 2} {$i<=$N} {incr i} {append sql ", t$i"}
    execsql $sql
  } $result
}

# Joins with a comparison
#
set result {}
for {set N 1} {$N<=$bitmask_size} {incr N} {
  lappend result $N
  do_test join3-2.$N {
    set sql "SELECT * FROM t1"
    for {set i 2} {$i<=$N} {incr i} {append sql ", t$i"}
    set sep WHERE
    for {set i 1} {$i<$N} {incr i} {
      append sql " $sep t[expr {$i+1}].x==t$i.x+1"
      set sep AND
    }
    execsql $sql
  } $result
}

# Error of too many tables in the join
#
do_test join3-3.1 {
  set sql "SELECT * FROM t1 AS t0, t1"
  for {set i 2} {$i<=$bitmask_size} {incr i} {append sql ", t$i"}
  catchsql $sql
} [list 1 "at most $bitmask_size tables in a join"]


finish_test
