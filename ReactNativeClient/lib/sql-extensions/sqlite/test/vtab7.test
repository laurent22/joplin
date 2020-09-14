# 2006 July 25
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file implements regression tests for SQLite library. The focus
# of this test is reading and writing to the database from within a
# virtual table xSync() callback.
#
# $Id: vtab7.test,v 1.4 2007/12/04 16:54:53 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab {
  finish_test
  return
}

# Register the echo module. Code inside the echo module appends elements
# to the global tcl list variable ::echo_module whenever SQLite invokes
# certain module callbacks. This includes the xSync(), xCommit() and 
# xRollback() callbacks. For each of these callback, two elements are
# appended to ::echo_module, as follows:
#
#     Module method        Elements appended to ::echo_module
#     -------------------------------------------------------
#     xSync()              xSync echo($tablename)
#     xCommit()            xCommit echo($tablename)
#     xRollback()          xRollback echo($tablename)
#     -------------------------------------------------------
#
# In each case, $tablename is replaced by the name of the real table (not
# the echo table). By setting up a tcl trace on the ::echo_module variable,
# code in this file arranges for a Tcl script to be executed from within
# the echo module xSync() callback.
#
register_echo_module [sqlite3_connection_pointer db]
trace add variable ::echo_module write echo_module_trace

# This Tcl proc is invoked whenever the ::echo_module variable is written.
#
proc echo_module_trace {args} {
  # Filter out writes to ::echo_module that are not xSync, xCommit or 
  # xRollback callbacks.
  if {[llength $::echo_module] < 2} return
  set x [lindex $::echo_module end-1]
  if {$x ne "xSync" && $x ne "xCommit" && $x ne "xRollback"} return

  regexp {^echo.(.*).$} [lindex $::echo_module end] dummy tablename
  # puts "Ladies and gentlemen, an $x on $tablename!"

  if {[info exists ::callbacks($x,$tablename)]} {
    eval $::callbacks($x,$tablename)
  }
}

# The following tests, vtab7-1.*, test that the trace callback on 
# ::echo_module is providing the expected tcl callbacks.
do_test vtab7-1.1 {
  execsql {
    CREATE TABLE abc(a, b, c);
    CREATE VIRTUAL TABLE abc2 USING echo(abc);
  }
} {}

do_test vtab7-1.2 {
  set ::callbacks(xSync,abc) {incr ::counter}
  set ::counter 0
  execsql {
    INSERT INTO abc2 VALUES(1, 2, 3);
  }
  set ::counter
} {1}

# Write to an existing database table from within an xSync callback.
do_test vtab7-2.1 {
  set ::callbacks(xSync,abc) {
    execsql {INSERT INTO log VALUES('xSync');}
  }
  execsql {
    CREATE TABLE log(msg);
    INSERT INTO abc2 VALUES(4, 5, 6);
    SELECT * FROM log;
  }
} {xSync}
do_test vtab7-2.3 {
  execsql {
    INSERT INTO abc2 VALUES(4, 5, 6);
    SELECT * FROM log;
  }
} {xSync xSync}
do_test vtab7-2.4 {
  execsql {
    INSERT INTO abc2 VALUES(4, 5, 6);
    SELECT * FROM log;
  }
} {xSync xSync xSync}

# Create a database table from within xSync callback.
do_test vtab7-2.5 {
  set ::callbacks(xSync,abc) {
    execsql { CREATE TABLE newtab(d, e, f); }
  }
  execsql {
    INSERT INTO abc2 VALUES(1, 2, 3);
    SELECT name FROM sqlite_master ORDER BY name;
  }
} {abc abc2 log newtab}

# Drop a database table from within xSync callback.
# This is not allowed.  Tables cannot be dropped while
# any other statement is active.
#
do_test vtab7-2.6 {
  set ::callbacks(xSync,abc) {
    set ::rc [catchsql { DROP TABLE newtab }]
  }
  execsql {
    INSERT INTO abc2 VALUES(1, 2, 3);
    SELECT name FROM sqlite_master ORDER BY name;
  }
} {abc abc2 log newtab}
do_test vtab7-2.6.1 {
  set ::rc
} {1 {database table is locked}}
execsql {DROP TABLE newtab}

# Write to an attached database from xSync().
ifcapable attach {
  do_test vtab7-3.1 {
    forcedelete test2.db
    forcedelete test2.db-journal
    execsql {
      ATTACH 'test2.db' AS db2;
      CREATE TABLE db2.stuff(description, shape, color);
    }
    set ::callbacks(xSync,abc) {
      execsql { INSERT INTO db2.stuff VALUES('abc', 'square', 'green'); }
    }
    execsql {
      INSERT INTO abc2 VALUES(1, 2, 3);
      SELECT * from stuff;
    }
  } {abc square green}
}

# UPDATE: The next test passes, but leaks memory. So leave it out.
#
# The following tests test that writing to the database from within
# the xCommit callback causes a misuse error.
# do_test vtab7-4.1 {
#   unset -nocomplain ::callbacks(xSync,abc)
#   set ::callbacks(xCommit,abc) {
#     execsql { INSERT INTO log VALUES('hello') }
#   }
#   catchsql {
#     INSERT INTO abc2 VALUES(1, 2, 3);
#   }
# } {1 {bad parameter or other API misuse}}

# These tests, vtab7-4.*, test that an SQLITE_LOCKED error is returned
# if an attempt to write to a virtual module table or create a new 
# virtual table from within an xSync() callback.
do_test vtab7-4.1 {
  execsql {
    CREATE TABLE def(d, e, f);
    CREATE VIRTUAL TABLE def2 USING echo(def);
  }
  set ::callbacks(xSync,abc) {
    set ::error [catchsql { INSERT INTO def2 VALUES(1, 2, 3) }]
  }
  execsql {
    INSERT INTO abc2 VALUES(1, 2, 3);
  }
  set ::error
} {1 {database table is locked}}
do_test vtab7-4.2 {
  set ::callbacks(xSync,abc) {
    set ::error [catchsql { CREATE VIRTUAL TABLE def3 USING echo(def) }]
  }
  execsql {
    INSERT INTO abc2 VALUES(1, 2, 3);
  }
  set ::error
} {1 {database table is locked}}

do_test vtab7-4.3 {
  set ::callbacks(xSync,abc) {
    set ::error [catchsql { DROP TABLE def2 }]
  }
  execsql {
    INSERT INTO abc2 VALUES(1, 2, 3);
    SELECT name FROM sqlite_master ORDER BY name;
  }
  set ::error
} {1 {database table is locked}}

trace remove variable ::echo_module write echo_module_trace
unset -nocomplain ::callbacks

finish_test
