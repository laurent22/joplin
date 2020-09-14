# 2005 April 21
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
# focus of this script testing the sqlite_transfer_bindings() API.
#
# $Id: bindxfer.test,v 1.9 2009/04/17 11:56:28 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

proc sqlite_step {stmt VALS COLS} {
  upvar #0 $VALS vals
  upvar #0 $COLS cols
  set vals [list]
  set cols [list]

  set rc [sqlite3_step $stmt]
  for {set i 0} {$i < [sqlite3_column_count $stmt]} {incr i} {
    lappend cols [sqlite3_column_name $stmt $i]
  }
  for {set i 0} {$i < [sqlite3_data_count $stmt]} {incr i} {
    lappend vals [sqlite3_column_text $stmt $i]
  }

  return $rc
}

do_test bindxfer-1.1 {
  set DB [sqlite3_connection_pointer db]
  execsql {CREATE TABLE t1(a,b,c);}
  set VM1 [sqlite3_prepare $DB {SELECT ?, ?, ?} -1 TAIL]
  set TAIL
} {}
do_test bindxfer-1.2 {
  sqlite3_bind_parameter_count $VM1
} 3
do_test bindxfer-1.3 {
  set VM2 [sqlite3_prepare $DB {SELECT ?, ?, ?} -1 TAIL]
  set TAIL
} {}
do_test bindxfer-1.4 {
  sqlite3_bind_parameter_count $VM2
} 3
ifcapable deprecated {
  do_test bindxfer-1.5 {
    sqlite_bind $VM1 1 one normal
    set sqlite_static_bind_value two
    sqlite_bind $VM1 2 {} static
    sqlite_bind $VM1 3 {} null
    sqlite3_transfer_bindings $VM1 $VM2
    sqlite_step $VM1 VALUES COLNAMES
  } SQLITE_ROW
  do_test bindxfer-1.6 {
    set VALUES
  } {{} {} {}}
  do_test bindxfer-1.7 {
    sqlite_step $VM2 VALUES COLNAMES
  } SQLITE_ROW
  do_test bindxfer-1.8 {
    set VALUES
  } {one two {}}
}
catch {sqlite3_finalize $VM1}
catch {sqlite3_finalize $VM2}


finish_test
