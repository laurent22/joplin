# 2009 November 23
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
# The focus of this file making sure the register cache logic works
# correctly with virtual tables.  Ticket [16fbf14cb2].
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}

register_tclvar_module [sqlite3_connection_pointer db]

unset -nocomplain vtabE
set vtabE(vtabE1) 11
set vtabE(vtabE2) 22
unset -nocomplain vtabE1
set vtabE1(w) x
set vtabE1(y) z
unset -nocomplain vtabE2
set vtabE2(a) b
set vtabE2(c) d

do_test vtabE-1 {
  db eval {
    CREATE VIRTUAL TABLE t1 USING tclvar;
    CREATE VIRTUAL TABLE t2 USING tclvar;
    CREATE TABLE t3(a INTEGER PRIMARY KEY, b);
    SELECT t1.name, t1.arrayname, t1.value,
           t2.name, t2.arrayname, t2.value,
           abs(t3.b + abs(t2.value + abs(t1.value)))
      FROM t1 LEFT JOIN t2 ON t2.name = t1.arrayname
           LEFT JOIN t3 ON t3.a=t2.value
     WHERE t1.name = 'vtabE'
     ORDER BY t1.value, t2.value;
  }
} {vtabE vtabE1 11 vtabE1 w x {} vtabE vtabE1 11 vtabE1 y z {} vtabE vtabE2 22 vtabE2 a b {} vtabE vtabE2 22 vtabE2 c d {}}

finish_test
