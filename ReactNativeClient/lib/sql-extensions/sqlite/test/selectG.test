# 2015-01-05
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
# This file verifies that INSERT operations with a very large number of
# VALUE terms works and does not hit the SQLITE_LIMIT_COMPOUND_SELECT limit.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix selectG

# Do an INSERT with a VALUES clause that contains 100,000 entries.  Verify
# that this insert happens quickly (in less than 10 seconds).  Actually, the
# insert will normally happen in less than 0.5 seconds on a workstation, but
# we allow plenty of overhead for slower machines.  The speed test checks
# for an O(N*N) inefficiency that was once in the code and that would make
# the insert run for over a minute.
#
do_test 100 {
  set sql "CREATE TABLE t1(x);\nINSERT INTO t1(x) VALUES"
  for {set i 1} {$i<100000} {incr i} {
    append sql "($i),"
  }
  append sql "($i);"
  set microsec [lindex [time {db eval $sql}] 0]
  db eval {
    SELECT count(x), sum(x), avg(x), $microsec<10000000 FROM t1;
  }
} {100000 5000050000 50000.5 1}
  
# 2018-01-14.  A 100K-entry VALUES clause within a scalar expression does
# not cause processor stack overflow.
#
do_test 110 {
  set sql "SELECT (VALUES"
  for {set i 1} {$i<100000} {incr i} {
    append sql "($i),"
  }
  append sql "($i));"
  db eval $sql
} {1}

# Only the left-most term of a multi-valued VALUES within a scalar
# expression is evaluated.
#
do_test 120 {
  set n [llength [split [db eval "explain $sql"] \n]]
  expr {$n<10}
} {1}

finish_test
