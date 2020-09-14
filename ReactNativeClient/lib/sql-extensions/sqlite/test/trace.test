# 2004 Jun 29
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
# This file implements tests for the "sqlite3_trace()" API.
#
# $Id: trace.test,v 1.8 2009/04/07 14:14:23 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !trace {
  finish_test
  return
}

set ::stmtlist {}
do_test trace-1.1 {
  set rc [catch {db trace 1 2 3} msg]
  lappend rc $msg
} {1 {wrong # args: should be "db trace ?CALLBACK?"}}
proc trace_proc cmd {
  lappend ::stmtlist [string trim $cmd]
}
do_test trace-1.2 {
  db trace trace_proc
  db trace
} {trace_proc}
do_test trace-1.3 {
  execsql {
    CREATE TABLE t1(a,b);
    INSERT INTO t1 VALUES(1,2);
    SELECT * FROM t1;
  }
} {1 2}
do_test trace-1.4 {
  set ::stmtlist
} {{CREATE TABLE t1(a,b);} {INSERT INTO t1 VALUES(1,2);} {SELECT * FROM t1;}}
do_test trace-1.5 {
  db trace {}
  db trace
} {}
do_test trace-1.6 {
  db eval {
     CREATE TABLE t1b(x TEXT PRIMARY KEY, y);
     INSERT INTO t1b VALUES('abc','def'),('ghi','jkl'),('mno','pqr');
  }
  set ::stmtlist {}
  set xyzzy a*
  db trace trace_proc
  db eval {
     SELECT y FROM t1b WHERE x GLOB $xyzzy
  }
} {def}
do_test trace-1.7 {
  set ::stmtlist
} {{SELECT y FROM t1b WHERE x GLOB 'a*'}}
db trace {}

# If we prepare a statement and execute it multiple times, the trace
# happens on each execution.
#
db close
sqlite3 db test.db; set DB [sqlite3_connection_pointer db]
do_test trace-2.1 {
  set STMT [sqlite3_prepare $DB {INSERT INTO t1 VALUES(2,3)} -1 TAIL]
  db trace trace_proc
  proc trace_proc sql {
    global TRACE_OUT
    lappend TRACE_OUT [string trim $sql]
  }
  set TRACE_OUT {}
  sqlite3_step $STMT
  set TRACE_OUT
} {{INSERT INTO t1 VALUES(2,3)}}
do_test trace-2.2 {
  set TRACE_OUT {}
  sqlite3_reset $STMT
  set TRACE_OUT 
} {}
do_test trace-2.3 {
  sqlite3_step $STMT
  set TRACE_OUT
} {{INSERT INTO t1 VALUES(2,3)}}
do_test trace-2.4 {
  set TRACE_OUT {}
  execsql {SELECT * FROM t1}
} {1 2 2 3 2 3}
do_test trace-2.5 {
  set TRACE_OUT
} {{SELECT * FROM t1}}
catch {sqlite3_finalize $STMT}

do_test trace-2.6 {
  set TRACE_OUT {}
  db eval VACUUM
  set TRACE_OUT
} {VACUUM}

# Similar tests, but this time for profiling.
# 
do_test trace-3.1 {
  set rc [catch {db profile 1 2 3} msg]
  lappend rc $msg
} {1 {wrong # args: should be "db profile ?CALLBACK?"}}
set ::stmtlist {}
proc profile_proc {cmd tm} {
  lappend ::stmtlist [string trim $cmd]
}
do_test trace-3.2 {
  db trace {}
  db profile profile_proc
  db profile
} {profile_proc}
do_test trace-3.3 {
  execsql {
    CREATE TABLE t2(a,b);
    INSERT INTO t2 VALUES(1,2);
    SELECT * FROM t2;
  }
} {1 2}
do_test trace-3.4 {
  set ::stmtlist
} {{CREATE TABLE t2(a,b);} {INSERT INTO t2 VALUES(1,2);} {SELECT * FROM t2;}}
do_test trace-3.5 {
  db profile {}
  db profile
} {}

# If we prepare a statement and execute it multiple times, the profile
# happens on each execution.
#
db close
sqlite3 db test.db; set DB [sqlite3_connection_pointer db]
do_test trace-4.1 {
  set STMT [sqlite3_prepare $DB {INSERT INTO t2 VALUES(2,3)} -1 TAIL]
  db trace trace_proc
  proc profile_proc {sql tm} {
    global TRACE_OUT
    lappend TRACE_OUT [string trim $sql]
  }
  set TRACE_OUT {}
  sqlite3_step $STMT
  set TRACE_OUT
} {{INSERT INTO t2 VALUES(2,3)}}
do_test trace-4.2 {
  set TRACE_OUT {}
  sqlite3_reset $STMT
  set TRACE_OUT 
} {}
do_test trace-4.3 {
  sqlite3_step $STMT
  set TRACE_OUT
} {{INSERT INTO t2 VALUES(2,3)}}
do_test trace-4.4 {
  set TRACE_OUT {}
  execsql {SELECT * FROM t1}
} {1 2 2 3 2 3}
do_test trace-4.5 {
  set TRACE_OUT
} {{SELECT * FROM t1}}
catch {sqlite3_finalize $STMT}

# 3.8.11: Profile output even if the statement is not run to completion.
do_test trace-4.6 {
  set TRACE_OUT {}
  db eval {SELECT * FROM t1} {} {if {$a>=1} break}
  set TRACE_OUT
} {{SELECT * FROM t1}}


# Trigger tracing.
#
ifcapable trigger {
  do_test trace-5.1 {
    db eval {
      CREATE TRIGGER r1t1 AFTER UPDATE ON t1 BEGIN
        UPDATE t2 SET a=new.a WHERE rowid=new.rowid;
      END;
      CREATE TRIGGER r1t2 AFTER UPDATE ON t2 BEGIN
        SELECT 'hello';
      END;
    }
    set TRACE_OUT {}
    proc trace_proc cmd {
      lappend ::TRACE_OUT [string trim $cmd]
    }
    db eval {
      UPDATE t1 SET a=a+1;
    }
    set TRACE_OUT
  } {{UPDATE t1 SET a=a+1;} {-- TRIGGER r1t1} {-- UPDATE t2 SET a=new.a WHERE rowid=new.rowid} {-- TRIGGER r1t2} {-- SELECT 'hello'} {-- TRIGGER r1t1} {-- UPDATE t2 SET a=new.a WHERE rowid=new.rowid} {-- TRIGGER r1t2} {-- SELECT 'hello'} {-- TRIGGER r1t1} {-- UPDATE t2 SET a=new.a WHERE rowid=new.rowid} {-- TRIGGER r1t2} {-- SELECT 'hello'}}
}

# With 3.6.21, we add the ability to expand host parameters in the trace
# output.  Test this feature.
#
do_test trace-6.1 {
  set ::t6int [expr {3+3}]
  set ::t6real [expr {1.5*4.0}]
  set ::t6str {test-six y'all}
  db eval {SELECT x'3031323334' AS x} {set ::t6blob $x}
  unset -nocomplain t6null
  set TRACE_OUT {}
  execsql {SELECT $::t6int, $::t6real, $t6str, $t6blob, $t6null}
} {6 6.0 {test-six y'all} 01234 {}}
do_test trace-6.2 {
  set TRACE_OUT
} {{SELECT 6, 6.0, 'test-six y''all', x'3031323334', NULL}}
do_test trace-6.3 {
  set TRACE_OUT {}
  execsql {SELECT $::t6int, ?1, $::t6int}
} {6 6 6}
do_test trace-6.4 {
  set TRACE_OUT
} {{SELECT 6, 6, 6}}
do_test trace-6.5 {
  execsql {CREATE TABLE t6([$::t6int],"?1"); INSERT INTO t6 VALUES(1,2)}
  set TRACE_OUT {}
  execsql {SELECT '$::t6int', [$::t6int], $::t6int, ?1, "?1", $::t6int FROM t6}
} {{$::t6int} 1 6 6 2 6}
do_test trace-6.6 {
  set TRACE_OUT
} {{SELECT '$::t6int', [$::t6int], 6, 6, "?1", 6 FROM t6}}

# Do these same tests with a UTF16 database.
#
do_test trace-6.100 {
  db close
  sqlite3 db :memory:
  db eval {
     PRAGMA encoding=UTF16be;
     CREATE TABLE t6([$::t6str],"?1");
     INSERT INTO t6 VALUES(1,2);
  }
  db trace trace_proc
  set TRACE_OUT {}
  execsql {SELECT '$::t6str', [$::t6str], $::t6str, ?1, "?1", $::t6str FROM t6}
} {{$::t6str} 1 {test-six y'all} {test-six y'all} 2 {test-six y'all}}
do_test trace-6.101 {
  set TRACE_OUT
} {{SELECT '$::t6str', [$::t6str], 'test-six y''all', 'test-six y''all', "?1", 'test-six y''all' FROM t6}}

do_test trace-6.200 {
  db close
  sqlite3 db :memory:
  db eval {
     PRAGMA encoding=UTF16le;
     CREATE TABLE t6([$::t6str],"?1");
     INSERT INTO t6 VALUES(1,2);
  }
  db trace trace_proc
  set TRACE_OUT {}
  execsql {SELECT '$::t6str', [$::t6str], $::t6str, ?1, "?1", $::t6str FROM t6}
} {{$::t6str} 1 {test-six y'all} {test-six y'all} 2 {test-six y'all}}
do_test trace-6.201 {
  set TRACE_OUT
} {{SELECT '$::t6str', [$::t6str], 'test-six y''all', 'test-six y''all', "?1", 'test-six y''all' FROM t6}}


finish_test
