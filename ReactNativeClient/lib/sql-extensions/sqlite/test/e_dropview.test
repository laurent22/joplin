# 2010 November 30
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
# This file implements tests to verify that the "testable statements" in 
# the lang_dropview.html document are correct.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix e_dropview

proc dropview_reopen_db {} {
  db close
  forcedelete test.db test.db2
  sqlite3 db test.db

  db eval {
    ATTACH 'test.db2' AS aux;
    CREATE TABLE t1(a, b); 
    INSERT INTO t1 VALUES('a main', 'b main');
    CREATE VIEW v1 AS SELECT * FROM t1;
    CREATE VIEW v2 AS SELECT * FROM t1;

    CREATE TEMP TABLE t1(a, b);
    INSERT INTO temp.t1 VALUES('a temp', 'b temp');
    CREATE VIEW temp.v1 AS SELECT * FROM t1;

    CREATE TABLE aux.t1(a, b);
    INSERT INTO aux.t1 VALUES('a aux', 'b aux');
    CREATE VIEW aux.v1 AS SELECT * FROM t1;
    CREATE VIEW aux.v2 AS SELECT * FROM t1;
    CREATE VIEW aux.v3 AS SELECT * FROM t1;
  }
}

proc list_all_views {{db db}} {
  set res [list]
  $db eval { PRAGMA database_list } {
    set tbl "$name.sqlite_master"
    if {$name == "temp"} { set tbl temp.sqlite_master }

    set sql "SELECT '$name.' || name FROM $tbl WHERE type = 'view'"
    lappend res {*}[$db eval $sql]
  }
  set res
}

proc list_all_data {{db db}} {
  set res [list]
  $db eval { PRAGMA database_list } {
    set tbl "$name.sqlite_master"
    if {$name == "temp"} { set tbl sqlite_temp_master }

    db eval "SELECT '$name.' || name AS x FROM $tbl WHERE type = 'table'" {
      lappend res [list $x [db eval "SELECT * FROM $x"]]
    }
  }
  set res
}

proc do_dropview_tests {nm args} {
  uplevel do_select_tests $nm $args
}

# -- syntax diagram drop-view-stmt
#
# All paths in the syntax diagram for DROP VIEW are tested by tests 1.*.
#
do_dropview_tests 1 -repair {
  dropview_reopen_db
} -tclquery {
  list_all_views
} {
  1   "DROP VIEW v1"                  {main.v1 main.v2 aux.v1 aux.v2 aux.v3}
  2   "DROP VIEW v2"                  {main.v1 temp.v1 aux.v1 aux.v2 aux.v3}
  3   "DROP VIEW main.v1"             {main.v2 temp.v1 aux.v1 aux.v2 aux.v3}
  4   "DROP VIEW main.v2"             {main.v1 temp.v1 aux.v1 aux.v2 aux.v3}
  5   "DROP VIEW IF EXISTS v1"        {main.v1 main.v2 aux.v1 aux.v2 aux.v3}
  6   "DROP VIEW IF EXISTS v2"        {main.v1 temp.v1 aux.v1 aux.v2 aux.v3}
  7   "DROP VIEW IF EXISTS main.v1"   {main.v2 temp.v1 aux.v1 aux.v2 aux.v3}
  8   "DROP VIEW IF EXISTS main.v2"   {main.v1 temp.v1 aux.v1 aux.v2 aux.v3}
}

# EVIDENCE-OF: R-27002-52307 The DROP VIEW statement removes a view
# created by the CREATE VIEW statement.
#
dropview_reopen_db
do_execsql_test 2.1 {
  CREATE VIEW "new view" AS SELECT * FROM t1 AS x, t1 AS y;
  SELECT * FROM "new view";
} {{a main} {b main} {a main} {b main}}
do_execsql_test 2.2 {;
  SELECT * FROM sqlite_master WHERE name = 'new view';
} {
  view {new view} {new view} 0 
  {CREATE VIEW "new view" AS SELECT * FROM t1 AS x, t1 AS y}
}
do_execsql_test 2.3 {
  DROP VIEW "new view";
  SELECT * FROM sqlite_master WHERE name = 'new view';
} {}
do_catchsql_test 2.4 {
  SELECT * FROM "new view"
} {1 {no such table: new view}}

# EVIDENCE-OF: R-00359-41639 The view definition is removed from the
# database schema, but no actual data in the underlying base tables is
# modified.
#
#     For each view in the database, check that it can be queried. Then drop
#     it. Check that it can no longer be queried and is no longer listed
#     in any schema table. Then check that the contents of the db tables have 
#     not changed
#
set databasedata [list_all_data]

do_execsql_test  3.1.0 { SELECT * FROM temp.v1 } {{a temp} {b temp}}
do_execsql_test  3.1.1 { DROP VIEW temp.v1 } {}
do_catchsql_test 3.1.2 { SELECT * FROM temp.v1 } {1 {no such table: temp.v1}}
do_test          3.1.3 { list_all_views } {main.v1 main.v2 aux.v1 aux.v2 aux.v3}
do_test          3.1.4 { string compare [list_all_data] $databasedata } 0

do_execsql_test  3.2.0 { SELECT * FROM v1 } {{a main} {b main}}
do_execsql_test  3.2.1 { DROP VIEW v1 } {}
do_catchsql_test 3.2.2 { SELECT * FROM main.v1 } {1 {no such table: main.v1}}
do_test          3.2.3 { list_all_views } {main.v2 aux.v1 aux.v2 aux.v3}
do_test          3.2.4 { string compare [list_all_data] $databasedata } 0

do_execsql_test  3.3.0 { SELECT * FROM v2 } {{a main} {b main}}
do_execsql_test  3.3.1 { DROP VIEW v2 } {}
do_catchsql_test 3.3.2 { SELECT * FROM main.v2 } {1 {no such table: main.v2}}
do_test          3.3.3 { list_all_views } {aux.v1 aux.v2 aux.v3}
do_test          3.3.4 { string compare [list_all_data] $databasedata } 0

do_execsql_test  3.4.0 { SELECT * FROM v1 } {{a aux} {b aux}}
do_execsql_test  3.4.1 { DROP VIEW v1 } {}
do_catchsql_test 3.4.2 { SELECT * FROM v1 } {1 {no such table: v1}}
do_test          3.4.3 { list_all_views } {aux.v2 aux.v3}
do_test          3.4.4 { string compare [list_all_data] $databasedata } 0

do_execsql_test  3.5.0 { SELECT * FROM aux.v2 } {{a aux} {b aux}}
do_execsql_test  3.5.1 { DROP VIEW aux.v2 } {}
do_catchsql_test 3.5.2 { SELECT * FROM aux.v2 } {1 {no such table: aux.v2}}
do_test          3.5.3 { list_all_views } {aux.v3}
do_test          3.5.4 { string compare [list_all_data] $databasedata } 0

do_execsql_test  3.6.0 { SELECT * FROM v3 } {{a aux} {b aux}}
do_execsql_test  3.6.1 { DROP VIEW v3 } {}
do_catchsql_test 3.6.2 { SELECT * FROM v3 } {1 {no such table: v3}}
do_test          3.6.3 { list_all_views } {}
do_test          3.6.4 { string compare [list_all_data] $databasedata } 0

# EVIDENCE-OF: R-25558-37487 If the specified view cannot be found and
# the IF EXISTS clause is not present, it is an error.
#
do_dropview_tests 4 -repair {
  dropview_reopen_db 
} -errorformat {
  no such view: %s
} {
  1   "DROP VIEW xx"                  xx
  2   "DROP VIEW main.xx"             main.xx
  3   "DROP VIEW temp.v2"             temp.v2
}

# EVIDENCE-OF: R-07490-32536 If the specified view cannot be found and
# an IF EXISTS clause is present in the DROP VIEW statement, then the
# statement is a no-op.
#
do_dropview_tests 5 -repair {
  dropview_reopen_db
} -tclquery {
  list_all_views
  #expr {[list_all_views] == "main.v1 main.v2 temp.v1 aux.v1 aux.v2 aux.v3"}
} {
  1    "DROP VIEW IF EXISTS xx" "main.v1 main.v2 temp.v1 aux.v1 aux.v2 aux.v3"
  2    "DROP VIEW IF EXISTS main.xx" "main.v1 main.v2 temp.v1 aux.v1 aux.v2 aux.v3"
  3    "DROP VIEW IF EXISTS temp.v2" "main.v1 main.v2 temp.v1 aux.v1 aux.v2 aux.v3"
}




finish_test
