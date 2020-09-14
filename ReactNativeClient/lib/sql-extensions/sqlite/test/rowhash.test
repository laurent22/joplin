# 2009 April 17
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
# focus of this file is the code in rowhash.c.
#
# NB:  The rowhash.c module is no longer part of the source tree.  But
# we might as well keep this test.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

do_test rowhash-1.1 {
  execsql {
    CREATE TABLE t1(id INTEGER PRIMARY KEY, a, b, c);
    CREATE INDEX i1 ON t1(a);
    CREATE INDEX i2 ON t1(b);
    CREATE INDEX i3 ON t1(c);
  }
} {}

proc do_keyset_test {name lKey} {
  db transaction {
    execsql { DELETE FROM t1 }
    foreach key $lKey {
      execsql { INSERT OR IGNORE INTO t1 VALUES($key, 'a', 'b', 'c') }
    }
  }
  do_test $name {
    lsort -integer [execsql {
      SELECT id FROM t1 WHERE a = 'a' OR b = 'b' OR c = 'c';
    }]
  } [lsort -integer -unique $lKey]
}

do_keyset_test rowhash-2.1 {1 2 3}
do_keyset_test rowhash-2.2 {0 1 2 3}
do_keyset_test rowhash-2.3 {62 125 188}
if {[working_64bit_int]} {
  expr srand(1)
  unset -nocomplain i L
  for {set i 4} {$i < 10} {incr i} {
    for {set j 0} {$j < 5000} {incr j} {
        lappend L [expr int(rand()*1000000000)]
    }
    do_keyset_test rowhash-2.$i $L
  }
}

finish_test
