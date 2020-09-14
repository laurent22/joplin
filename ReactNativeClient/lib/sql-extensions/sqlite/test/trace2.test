# 2011 Jan 21
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
# This file implements tests for the "sqlite3_trace()" API. Specifically,
# it tests the special handling of nested SQL statements (those executed
# by virtual table or user function callbacks). These statements are treated
# differently in two respects:
#
#   1. Each line of the statement is prefixed with "-- " to turn it into
#      an SQL comment.
#
#   2. Parameter expansion is not performed.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable !trace { finish_test ; return }
set ::testprefix trace2

proc sql {zSql} { db one $zSql }
proc trace {zSql} { lappend ::trace $zSql }

db func sql sql
db trace trace

proc do_trace_test {tn sql expected} {
  # Test that the list of string passed to the trace callback when $sql
  # is executed is equivalent to the list of strings in $expected.
  #
  set ::trace [list]
  execsql $sql
  uplevel do_test $tn [list {set ::trace}] [list [list {*}$expected]]
}

proc do_trace_select_test {tn sql expected} {

  uplevel [list do_trace_test ${tn}.a $sql $expected]

  # Now execute each SQL statement passed to the trace callback in the
  # block above. Check that this causes the same set of strings to be
  # passed to the trace callback again. i.e. that executing the output
  # of the trace callback is equivalent to the SQL script in $sql.
  #
  set sqllist $::trace
  set ::trace [list]
  foreach item $sqllist { execsql $item }
  uplevel do_test $tn.b [list {set ::trace}] [list $sqllist]
}

do_trace_select_test 1.1  {
  SELECT 1, 2, 3;
} {
  "SELECT 1, 2, 3;"
}

do_trace_select_test 1.2  {
  SELECT sql('SELECT 1, 2, 3');
} {
  "SELECT sql('SELECT 1, 2, 3');"
  "-- SELECT 1, 2, 3"
}

do_trace_select_test 1.3  {
  SELECT sql('SELECT 1, 
    2, 
    3'
  );
} {
  "SELECT sql('SELECT 1, 
    2, 
    3'
  );"
  "-- SELECT 1, 
--     2, 
--     3"
}

do_trace_select_test 1.4  {
  SELECT sql('SELECT 1, 


    3'
  );
} {
  "SELECT sql('SELECT 1, 


    3'
  );"
  "-- SELECT 1, 
-- 
-- 
--     3"
}

do_trace_select_test 1.5  {
  SELECT $var, sql('SELECT 1, 
    $var, 
    3'
  );
} {
  "SELECT NULL, sql('SELECT 1, 
    $var, 
    3'
  );"
  "-- SELECT 1, 
--     $var, 
--     3"
}

ifcapable fts3 {
  do_execsql_test 2.1 {
    CREATE VIRTUAL TABLE x1 USING fts4;
    INSERT INTO x1 VALUES('Cloudy, with a high near 16');
    INSERT INTO x1 VALUES('Wind chill values as low as -13');
  }

  do_trace_test 2.2 {
    INSERT INTO x1 VALUES('North northwest wind between 8 and 14 mph');
  } {
    "INSERT INTO x1 VALUES('North northwest wind between 8 and 14 mph');" 
    "-- DELETE FROM 'main'.'x1_segdir' WHERE level = ?"
    "-- INSERT INTO 'main'.'x1_content' VALUES(?,(?))" 
    "-- REPLACE INTO 'main'.'x1_docsize' VALUES(?,?)" 
    "-- SELECT value FROM 'main'.'x1_stat' WHERE id=?" 
    "-- REPLACE INTO 'main'.'x1_stat' VALUES(?,?)" 
    "-- SELECT (SELECT max(idx) FROM 'main'.'x1_segdir' WHERE level = ?) + 1" 
    "-- SELECT coalesce((SELECT max(blockid) FROM 'main'.'x1_segments') + 1, 1)"
    "-- REPLACE INTO 'main'.'x1_segdir' VALUES(?,?,?,?,?,?)"
    "-- SELECT level, idx, end_block FROM 'main'.'x1_segdir' WHERE level BETWEEN ? AND ? ORDER BY level DESC, idx ASC"
  }

  do_trace_test 2.3 {
    INSERT INTO x1(x1) VALUES('optimize');
  } {
    "INSERT INTO x1(x1) VALUES('optimize');"
    "-- SELECT ? UNION SELECT level / (1024 * ?) FROM 'main'.'x1_segdir'"
    "-- SELECT idx, start_block, leaves_end_block, end_block, root FROM 'main'.'x1_segdir' WHERE level BETWEEN ? AND ?ORDER BY level DESC, idx ASC"
    "-- SELECT max(level) FROM 'main'.'x1_segdir' WHERE level BETWEEN ? AND ?"
    "-- SELECT coalesce((SELECT max(blockid) FROM 'main'.'x1_segments') + 1, 1)"
    "-- DELETE FROM 'main'.'x1_segdir' WHERE level BETWEEN ? AND ?"
    "-- REPLACE INTO 'main'.'x1_segdir' VALUES(?,?,?,?,?,?)"
  }
}

finish_test
