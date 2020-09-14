# 2018 September 2
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
#

set testdir [file dirname $argv0]

source $testdir/tester.tcl

# If SQLITE_OMIT_ALTERTABLE is defined, omit this file.
ifcapable !altertable {
  finish_test
  return
}
set testprefix alterauth

set ::auth [list]
proc xAuth {type args} {
  if {$type == "SQLITE_ALTER_TABLE"} {
    lappend ::auth [concat $type [lrange $args 0 3]]
  }
  return SQLITE_OK
}
db auth xAuth

do_execsql_test 1.0 { CREATE TABLE t1(a, b, c); }

do_test 1.1 {
  set ::auth [list]
  execsql { ALTER TABLE t1 RENAME TO t2 }
  set ::auth
} {{SQLITE_ALTER_TABLE main t1 {} {}}}

do_test 1.2 {
  set ::auth [list]
  execsql { ALTER TABLE t2 RENAME c TO ccc }
  set ::auth
} {{SQLITE_ALTER_TABLE main t2 {} {}}}

do_test 1.3 {
  set ::auth [list]
  execsql { ALTER TABLE t2 ADD COLUMN d }
  set ::auth
} {{SQLITE_ALTER_TABLE main t2 {} {}}}

proc xAuth {type args} {
  if {$type == "SQLITE_ALTER_TABLE"} {
    return SQLITE_DENY
  }
  return SQLITE_OK
}

do_test 2.1 {
  catchsql { ALTER TABLE t2 RENAME TO t3 }
} {1 {not authorized}}

do_test 2.2 {
  catchsql { ALTER TABLE t2 RENAME d TO ddd }
} {1 {not authorized}}

do_test 2.3 {
  catchsql { ALTER TABLE t2 ADD COLUMN e }
} {1 {not authorized}}

finish_test
