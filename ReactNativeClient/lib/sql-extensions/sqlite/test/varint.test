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
# focus of this script is variable-length integer encoding scheme.
#
# $Id: varint.test,v 1.1 2004/05/18 15:57:42 drh Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Test reading and writing of varints.
#
set cnt 0
foreach start {0 100 10000 1000000 0x10000000} {
  foreach mult {1 0x10 0x100 0x1000 0x10000 0x100000 0x1000000 0x10000000} {
    foreach incr {1 500 10000 50000000} {
      incr cnt
      do_test varint-1.$cnt {
        btree_varint_test $start $mult 5000 $incr
      } {}
    }
  }
}

finish_test
