# 2006 June 10
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
# focus of this file is the authorisation callback and virtual tables.
#
# $Id: vtab3.test,v 1.3 2008/07/12 14:52:21 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab||!auth {
  finish_test
  return
}

set ::auth_fail 0
set ::auth_log [list]
set ::auth_filter [list SQLITE_READ SQLITE_UPDATE SQLITE_SELECT SQLITE_PRAGMA]

proc auth {code arg1 arg2 arg3 arg4 args} {
  if {[lsearch $::auth_filter $code]>-1} {
    return SQLITE_OK
  }
  lappend ::auth_log $code $arg1 $arg2 $arg3 $arg4
  incr ::auth_fail -1
  if {$::auth_fail == 0} {
    return SQLITE_DENY
  }
  return SQLITE_OK
}

do_test vtab3-1.1 {
  execsql {
    CREATE TABLE elephant(
      name VARCHAR(32), 
      color VARCHAR(16), 
      age INTEGER, 
      UNIQUE(name, color)
    );
  }
} {}


do_test vtab3-1.2 {
  register_echo_module [sqlite3_connection_pointer db]
  db authorizer ::auth
  execsql {
    CREATE VIRTUAL TABLE pachyderm USING echo(elephant);
  }
  set ::auth_log
} [list \
  SQLITE_INSERT        sqlite_master {}   main {} \
  SQLITE_CREATE_VTABLE pachyderm     echo main {} \
]

do_test vtab3-1.3 {
  set ::auth_log [list]
  execsql {
    DROP TABLE pachyderm;
  }
  set ::auth_log
} [list \
  SQLITE_DELETE        sqlite_master {}   main {} \
  SQLITE_DROP_VTABLE   pachyderm     echo main {} \
  SQLITE_DELETE        pachyderm     {}   main {} \
  SQLITE_DELETE        sqlite_master {}   main {} \
]

do_test vtab3-1.4 {
  set ::auth_fail 1
  catchsql {
    CREATE VIRTUAL TABLE pachyderm USING echo(elephant);
  }
} {1 {not authorized}}
do_test vtab3-1.5 {
  execsql {
    SELECT name FROM sqlite_master WHERE type = 'table';
  }
} {elephant}

do_test vtab3-1.5 {
  set ::auth_fail 2
  catchsql {
    CREATE VIRTUAL TABLE pachyderm USING echo(elephant);
  }
} {1 {not authorized}}
do_test vtab3-1.6 {
  execsql {
    SELECT name FROM sqlite_master WHERE type = 'table';
  }
} {elephant}

do_test vtab3-1.5 {
  set ::auth_fail 3
  catchsql {
    CREATE VIRTUAL TABLE pachyderm USING echo(elephant);
  }
} {0 {}}
do_test vtab3-1.6 {
  execsql {
    SELECT name FROM sqlite_master WHERE type = 'table';
  }
} {elephant pachyderm}

foreach i [list 1 2 3 4] {
  set ::auth_fail $i
  do_test vtab3-1.7.$i.1 {
    set rc [catch {
      execsql {DROP TABLE pachyderm;}
    } msg]
    if {$msg eq "authorization denied"} {set msg "not authorized"}
    list $rc $msg
  } {1 {not authorized}}
  do_test vtab3-1.7.$i.2 {
    execsql {
      SELECT name FROM sqlite_master WHERE type = 'table';
    }
  } {elephant pachyderm}
}
do_test vtab3-1.8.1 {
  set ::auth_fail 0
  catchsql {
    DROP TABLE pachyderm;
  }
} {0 {}}
do_test vtab3-1.8.2 {
  execsql {
    SELECT name FROM sqlite_master WHERE type = 'table';
  }
} {elephant}

finish_test
