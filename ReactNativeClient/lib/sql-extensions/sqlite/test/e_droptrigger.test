# 2010 November 29
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
# the lang_droptrigger.html document are correct.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set ::testprefix e_droptrigger

ifcapable !trigger { finish_test ; return }

proc do_droptrigger_tests {nm args} {
  uplevel do_select_tests [list e_createtable-$nm] $args
}

proc list_all_triggers {{db db}} {
  set res [list]
  $db eval { PRAGMA database_list } {
    if {$name == "temp"} {
      set tbl sqlite_temp_master
    } else {
      set tbl "$name.sqlite_master"
    }
    lappend res {*}[
      db eval "SELECT '$name.' || name FROM $tbl WHERE type = 'trigger'"
    ]
  }
  set res
}


proc droptrigger_reopen_db {{event INSERT}} {
  db close
  forcedelete test.db test.db2
  sqlite3 db test.db

  set ::triggers_fired [list]
  proc r {x} { lappend ::triggers_fired $x }
  db func r r

  db eval "
    ATTACH 'test.db2' AS aux;

    CREATE TEMP TABLE t1(a, b);
    INSERT INTO t1 VALUES('a', 'b');
    CREATE TRIGGER tr1 AFTER $event ON t1 BEGIN SELECT r('temp.tr1') ; END;

    CREATE TABLE t2(a, b);
    INSERT INTO t2 VALUES('a', 'b');
    CREATE TRIGGER tr1 BEFORE $event ON t2 BEGIN SELECT r('main.tr1') ; END;
    CREATE TRIGGER tr2 AFTER  $event ON t2 BEGIN SELECT r('main.tr2') ; END;

    CREATE TABLE aux.t3(a, b);
    INSERT INTO t3 VALUES('a', 'b');
    CREATE TRIGGER aux.tr1 BEFORE $event ON t3 BEGIN SELECT r('aux.tr1') ; END;
    CREATE TRIGGER aux.tr2 AFTER  $event ON t3 BEGIN SELECT r('aux.tr2') ; END;
    CREATE TRIGGER aux.tr3 AFTER  $event ON t3 BEGIN SELECT r('aux.tr3') ; END;
  "
}


# -- syntax diagram drop-trigger-stmt
#
do_droptrigger_tests 1.1 -repair {
  droptrigger_reopen_db
} -tclquery {
  list_all_triggers 
} {
  1   "DROP TRIGGER main.tr1"            
      {main.tr2 temp.tr1 aux.tr1 aux.tr2 aux.tr3}
  2   "DROP TRIGGER IF EXISTS main.tr1"  
      {main.tr2 temp.tr1 aux.tr1 aux.tr2 aux.tr3}
  3   "DROP TRIGGER tr1"                 
      {main.tr1 main.tr2 aux.tr1 aux.tr2 aux.tr3}
  4   "DROP TRIGGER IF EXISTS tr1"       
      {main.tr1 main.tr2 aux.tr1 aux.tr2 aux.tr3}

  5   "DROP TRIGGER aux.tr1"             
      {main.tr1 main.tr2 temp.tr1 aux.tr2 aux.tr3}
  6   "DROP TRIGGER IF EXISTS aux.tr1"   
      {main.tr1 main.tr2 temp.tr1 aux.tr2 aux.tr3}

  7   "DROP TRIGGER IF EXISTS aux.xxx"   
      {main.tr1 main.tr2 temp.tr1 aux.tr1 aux.tr2 aux.tr3}
  8   "DROP TRIGGER IF EXISTS aux.xxx"   
      {main.tr1 main.tr2 temp.tr1 aux.tr1 aux.tr2 aux.tr3}
}

# EVIDENCE-OF: R-61172-15671 The DROP TRIGGER statement removes a
# trigger created by the CREATE TRIGGER statement.
#
foreach {tn tbl droptrigger before after} {
  1   t1  "DROP TRIGGER tr1" {temp.tr1}                {}
  2   t2  "DROP TRIGGER tr1" {main.tr1 main.tr2}       {main.tr1 main.tr2}
  3   t3  "DROP TRIGGER tr1" {aux.tr1 aux.tr3 aux.tr2} {aux.tr1 aux.tr3 aux.tr2}

  4   t1  "DROP TRIGGER tr2" {temp.tr1}                {temp.tr1}
  5   t2  "DROP TRIGGER tr2" {main.tr1 main.tr2}       {main.tr1}
  6   t3  "DROP TRIGGER tr2" {aux.tr1 aux.tr3 aux.tr2} {aux.tr1 aux.tr3 aux.tr2}

  7   t1  "DROP TRIGGER tr3" {temp.tr1}                {temp.tr1}
  8   t2  "DROP TRIGGER tr3" {main.tr1 main.tr2}       {main.tr1 main.tr2}
  9   t3  "DROP TRIGGER tr3" {aux.tr1 aux.tr3 aux.tr2} {aux.tr1 aux.tr2}
} {

  do_test 2.$tn.1 {
    droptrigger_reopen_db
    execsql " INSERT INTO $tbl VALUES('1', '2') "
    set ::triggers_fired
  } $before

  do_test 2.$tn.2 {
    droptrigger_reopen_db
    execsql $droptrigger
    execsql " INSERT INTO $tbl VALUES('1', '2') "
    set ::triggers_fired
  } $after
}

# EVIDENCE-OF: R-04950-25529 Once removed, the trigger definition is no
# longer present in the sqlite_schema (or sqlite_temp_schema) table and
# is not fired by any subsequent INSERT, UPDATE or DELETE statements.
#
#   Test cases e_droptrigger-1.* test the first part of this statement
#   (that dropped triggers do not appear in the schema table), and tests
#   droptrigger-2.* test that dropped triggers are not fired by INSERT
#   statements. The following tests verify that they are not fired by
#   UPDATE or DELETE statements.
#
foreach {tn tbl droptrigger before after} {
  1   t1  "DROP TRIGGER tr1" {temp.tr1}                {}
  2   t2  "DROP TRIGGER tr1" {main.tr1 main.tr2}       {main.tr1 main.tr2}
  3   t3  "DROP TRIGGER tr1" {aux.tr1 aux.tr3 aux.tr2} {aux.tr1 aux.tr3 aux.tr2}

  4   t1  "DROP TRIGGER tr2" {temp.tr1}                {temp.tr1}
  5   t2  "DROP TRIGGER tr2" {main.tr1 main.tr2}       {main.tr1}
  6   t3  "DROP TRIGGER tr2" {aux.tr1 aux.tr3 aux.tr2} {aux.tr1 aux.tr3 aux.tr2}

  7   t1  "DROP TRIGGER tr3" {temp.tr1}                {temp.tr1}
  8   t2  "DROP TRIGGER tr3" {main.tr1 main.tr2}       {main.tr1 main.tr2}
  9   t3  "DROP TRIGGER tr3" {aux.tr1 aux.tr3 aux.tr2} {aux.tr1 aux.tr2}
} {

  do_test 3.1.$tn.1 {
    droptrigger_reopen_db UPDATE
    execsql "UPDATE $tbl SET a = 'abc'"
    set ::triggers_fired
  } $before

  do_test 3.1.$tn.2 {
    droptrigger_reopen_db UPDATE
    execsql $droptrigger
    execsql "UPDATE $tbl SET a = 'abc'"
    set ::triggers_fired
  } $after
}
foreach {tn tbl droptrigger before after} {
  1   t1  "DROP TRIGGER tr1" {temp.tr1}                {}
  2   t2  "DROP TRIGGER tr1" {main.tr1 main.tr2}       {main.tr1 main.tr2}
  3   t3  "DROP TRIGGER tr1" {aux.tr1 aux.tr3 aux.tr2} {aux.tr1 aux.tr3 aux.tr2}

  4   t1  "DROP TRIGGER tr2" {temp.tr1}                {temp.tr1}
  5   t2  "DROP TRIGGER tr2" {main.tr1 main.tr2}       {main.tr1}
  6   t3  "DROP TRIGGER tr2" {aux.tr1 aux.tr3 aux.tr2} {aux.tr1 aux.tr3 aux.tr2}

  7   t1  "DROP TRIGGER tr3" {temp.tr1}                {temp.tr1}
  8   t2  "DROP TRIGGER tr3" {main.tr1 main.tr2}       {main.tr1 main.tr2}
  9   t3  "DROP TRIGGER tr3" {aux.tr1 aux.tr3 aux.tr2} {aux.tr1 aux.tr2}
} {

  do_test 3.2.$tn.1 {
    droptrigger_reopen_db DELETE
    execsql "DELETE FROM $tbl"
    set ::triggers_fired
  } $before

  do_test 3.2.$tn.2 {
    droptrigger_reopen_db DELETE
    execsql $droptrigger
    execsql "DELETE FROM $tbl"
    set ::triggers_fired
  } $after
}

# EVIDENCE-OF: R-37808-62273 Note that triggers are automatically
# dropped when the associated table is dropped.
#
do_test 4.1 {
  droptrigger_reopen_db
  list_all_triggers
} {main.tr1 main.tr2 temp.tr1 aux.tr1 aux.tr2 aux.tr3}
do_test 4.2 {
  droptrigger_reopen_db
  execsql "DROP TABLE t1"
  list_all_triggers
} {main.tr1 main.tr2 aux.tr1 aux.tr2 aux.tr3}
do_test 4.3 {
  droptrigger_reopen_db
  execsql "DROP TABLE t1"
  list_all_triggers
} {main.tr1 main.tr2 aux.tr1 aux.tr2 aux.tr3}
do_test 4.4 {
  droptrigger_reopen_db
  execsql "DROP TABLE t1"
  list_all_triggers
} {main.tr1 main.tr2 aux.tr1 aux.tr2 aux.tr3}

finish_test
