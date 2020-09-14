# 2007 May 12
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file tests a special case in the b-tree code that can be
# hit by the "IN" operator (or EXISTS, NOT IN, etc.).
#
# $Id: in2.test,v 1.3 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test in2-1 {
  execsql {
    CREATE TABLE a(i INTEGER PRIMARY KEY, a);
  }
} {}

set ::N 2000

do_test in2-2 {
  db transaction {
    for {set ::ii 0} {$::ii < $::N} {incr ::ii} {
      execsql {INSERT INTO a VALUES($::ii, $::ii)}
    }
    execsql {INSERT INTO a VALUES(4000, '')}

    for {set ::ii 0} {$::ii < $::N} {incr ::ii} {
      set ::t [format "x%04d" $ii]
      execsql {INSERT INTO a VALUES(NULL, $::t)}
    }
  }
} {}

# Each iteration of this loop builds a slightly different b-tree to
# evaluate the "IN (...)" operator in the SQL statement. The contents
# of the b-tree are (in sorted order):
#
#     $::ii integers.
#     a string of zero length.
#     $::N short strings.
#
# Records are inserted in sorted order.
#
# The string of zero-length is stored in a b-tree cell with 3 bytes
# of payload. Moving this cell from a leaf node to a internal node 
# during b-tree balancing was causing an assertion failure. 
#
# This bug only applied to b-trees generated to evaluate IN (..) 
# clauses, as it is impossible for persistent b-trees (SQL tables + 
# indices) to contain cells smaller than 4 bytes.
#
for {set ::ii 3} {$::ii < $::N} {incr ::ii} {
  do_test in2-$::ii {
    execsql {
      SELECT 1 IN (SELECT a FROM a WHERE (i < $::ii) OR (i >= $::N))
    }
  } {1}
}

finish_test
