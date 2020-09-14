# 2008 August 28
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
# This file implements regression tests for SQLite library.  The
# focus of this script is correct code generation of aliased result-set
# values.  See ticket #3343.
#
# $Id: alias.test,v 1.3 2009/04/23 13:22:44 drh Exp $
#
set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Aliases are currently evaluated twice.  We might try to change this
# in the future.  But not now.
return

# A procedure to return a sequence of increasing integers.
#
namespace eval ::seq {
  variable counter 0
  proc value {args} {
    variable counter
    incr counter
    return $counter
  }
  proc reset {} {
    variable counter
    set counter 0
  }
}


do_test alias-1.1 {
  db function sequence ::seq::value
  db eval {
    CREATE TABLE t1(x);
    INSERT INTO t1 VALUES(9);
    INSERT INTO t1 VALUES(8);
    INSERT INTO t1 VALUES(7);
    SELECT x, sequence() FROM t1;
  }
} {9 1 8 2 7 3}
do_test alias-1.2 {
  ::seq::reset
  db eval {
    SELECT x, sequence() AS y FROM t1 WHERE y>0
  }
} {9 1 8 2 7 3}
do_test alias-1.3 {
  ::seq::reset
  db eval {
    SELECT x, sequence() AS y FROM t1 WHERE y>0 AND y<99
  }
} {9 1 8 2 7 3}
do_test alias-1.4 {
  ::seq::reset
  db eval {
    SELECT x, sequence() AS y FROM t1 WHERE y>0 AND y<99 AND y!=55
  }
} {9 1 8 2 7 3}
do_test alias-1.5 {
  ::seq::reset
  db eval {
    SELECT x, sequence() AS y FROM t1
     WHERE y>0 AND y<99 AND y!=55 AND y NOT IN (56,57,58)
       AND y NOT LIKE 'abc%' AND y%10==2
  }
} {8 2}
do_test alias-1.6 {
  ::seq::reset
  db eval {
    SELECT x, sequence() AS y FROM t1 WHERE y BETWEEN 0 AND 99
  }
} {9 1 8 2 7 3}
#do_test alias-1.7 {
#  ::seq::reset
#  db eval {
#    SELECT x, sequence() AS y FROM t1 WHERE y IN (55,66,3)
#  }
#} {7 3}
do_test alias-1.8 {
  ::seq::reset
  db eval {
    SELECT x, 1-sequence() AS y FROM t1 ORDER BY y
  }
} {7 -2 8 -1 9 0}
do_test alias-1.9 {
  ::seq::reset
  db eval {
    SELECT x, sequence() AS y FROM t1 ORDER BY -y
  }
} {7 3 8 2 9 1}
do_test alias-1.10 {
  ::seq::reset
  db eval {
    SELECT x, sequence() AS y FROM t1 ORDER BY x%2, y
  }
} {8 2 9 1 7 3}

unset -nocomplain random_int_list
set random_int_list [db eval {
   SELECT random()&2147483647 AS r FROM t1, t1, t1, t1 ORDER BY r
}]
do_test alias-1.11 {
  lsort -integer $::random_int_list
} $random_int_list


do_test alias-2.1 {
  db eval {
    SELECT 4 UNION SELECT 1 ORDER BY 1
  }
} {1 4}
do_test alias-2.2 {
  db eval {
    SELECT 4 UNION SELECT 1 UNION SELECT 9 ORDER BY 1
  }
} {1 4 9}

if 0 {
  # Aliases in the GROUP BY clause cause the expression to be evaluated
  # twice in the current implementation.  This might change in the future.
  #
  do_test alias-3.1 {
    ::seq::reset
    db eval {
      SELECT sequence(*) AS y, count(*) AS z FROM t1 GROUP BY y ORDER BY z, y
    }
  } {1 1 2 1 3 1}
}

finish_test
