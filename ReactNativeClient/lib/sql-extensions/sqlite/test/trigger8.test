# 2006 February 27
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
# This file implements tests to make sure abusively large triggers
# (triggers with 100s or 1000s of statements) work.
#
# $Id: trigger8.test,v 1.2 2008/09/17 16:14:10 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable {!trigger} {
  finish_test
  return
}

# Set variable $nStatement to the number of statements to include in the
# body of the trigger. On a workstation with virtually unlimited memory, 
# use 10000. But on symbian, which allows each application at most a 32MB
# heap, use 1000.
#
set nStatement 10000
if {$tcl_platform(platform) == "symbian"} {
  set nStatement 1000
}

set nStatement 5
do_test trigger8-1.1 {
  execsql {
    CREATE TABLE t1(x);
    CREATE TABLE t2(y);
  }
  set sql "CREATE TRIGGER r${nStatement} AFTER INSERT ON t1 BEGIN\n"
  for {set i 0} {$i<$nStatement} {incr i} {
    append sql "  INSERT INTO t2 VALUES($i);\n"
  }
  append sql "END;"
  execsql $sql
  execsql {
    INSERT INTO t1 VALUES(5);
    SELECT count(*) FROM t2;
  }
} $nStatement

finish_test
