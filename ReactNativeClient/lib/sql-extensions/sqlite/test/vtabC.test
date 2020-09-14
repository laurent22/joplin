# 2008 April 10
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
# focus of this file is is verifying that the xUpdate, xSync, xCommit
# and xRollback methods are only invoked after an xBegin or xCreate.
# Ticket #3083.
#
# $Id: vtabC.test,v 1.2 2009/04/07 14:14:23 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}

ifcapable !trigger { finish_test ; return }


# N will be the number of virtual tables we have defined.
#
unset -nocomplain N
for {set N 1} {$N<=20} {incr N} {
  db close
  forcedelete test.db test.db-journal
  sqlite3 db test.db
  register_echo_module [sqlite3_connection_pointer db]

  # Create $N tables and $N virtual tables to echo them.
  #
  unset -nocomplain tablist
  set tablist {}
  do_test vtabC-1.$N.1 {
    for {set i 1} {$i<=$::N} {incr i} {
      execsql "CREATE TABLE t${i}(x)"
      execsql "CREATE VIRTUAL TABLE vt$i USING echo(t$i)"
      lappend ::tablist t$i vt$i
    }
    execsql {SELECT count(*) FROM sqlite_master}
  } [expr {$N*2}]
  do_test vtabC-1.$N.2 {
    execsql {SELECT name FROM sqlite_master}
  } $tablist

  # Create a table m and add triggers to make changes on all
  # of the virtual tables when m is changed.
  #
  do_test vtabC-1.$N.3 {
    execsql {CREATE TABLE m(a)}
    set sql "CREATE TRIGGER rins AFTER INSERT ON m BEGIN\n"
    for {set i 1} {$i<=$::N} {incr i} {
      append sql "  INSERT INTO vt$i VALUES(NEW.a+$i);\n"
    }
    append sql "END;"
    execsql $sql
    execsql {SELECT count(*) FROM sqlite_master}
  } [expr {$N*2+2}]
  do_test vtabC-1.$N.4 {
    execsql {
      INSERT INTO m VALUES(1000);
      SELECT * FROM m;
    }
  } {1000}
  for {set j 1} {$j<=$::N} {incr j} {
    do_test vtabC-1.$N.5.$j {
      execsql "SELECT * FROM t$::j"
    } [expr {$j+1000}]
    do_test vtabC-1.$N.6.$j {
      execsql "SELECT * FROM vt$::j"
    } [expr {$j+1000}]
  }
  do_test vtabC-1.$N.7 {
    set sql "CREATE TRIGGER rins2 BEFORE INSERT ON m BEGIN\n"
    for {set i 1} {$i<=$::N} {incr i} {
      append sql "  INSERT INTO vt$i VALUES(NEW.a+$i*100);\n"
    }
    for {set i 1} {$i<=$::N} {incr i} {
      append sql "  INSERT INTO vt$i VALUES(NEW.a+$i*10000);\n"
    }
    append sql "END;"
    execsql $sql
    execsql {SELECT count(*) FROM sqlite_master}
  } [expr {$N*2+3}]
  do_test vtabC-1.$N.8 {
    execsql {
      INSERT INTO m VALUES(9000000);
      SELECT * FROM m;
    }
  } {1000 9000000}
  unset -nocomplain res
  for {set j 1} {$j<=$::N} {incr j} {
    set res [expr {$j+1000}]
    lappend res [expr {$j*100+9000000}]
    lappend res [expr {$j*10000+9000000}]
    lappend res [expr {$j+9000000}]
    do_test vtabC-1.$N.9.$j {
      execsql "SELECT * FROM t$::j"
    } $res
    do_test vtabC-1.$N.10.$j {
      execsql "SELECT * FROM vt$::j"
    } $res
  }
}
unset -nocomplain res N i j


finish_test
