# 2007 October 23
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#*************************************************************************
# This file implements regression tests for SQLite library.  The
# focus of this script is measuring executing speed. More specifically,
# the focus is on the speed of:
#
#   * joins
#   * views
#   * sub-selects
#   * triggers
#
# $Id: speed4p.test,v 1.4 2008/04/10 13:32:37 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
speed_trial_init speed1

# Set a uniform random seed
expr srand(0)

set sqlout [open speed1.txt w]
proc tracesql {sql} {
  puts $::sqlout $sql\;
}
#db trace tracesql

# The number_name procedure below converts its argment (an integer)
# into a string which is the English-language name for that number.
#
# Example:
#
#     puts [number_name 123]   ->  "one hundred twenty three"
#
set ones {zero one two three four five six seven eight nine
          ten eleven twelve thirteen fourteen fifteen sixteen seventeen
          eighteen nineteen}
set tens {{} ten twenty thirty forty fifty sixty seventy eighty ninety}
proc number_name {n} {
  if {$n>=1000} {
    set txt "[number_name [expr {$n/1000}]] thousand"
    set n [expr {$n%1000}]
  } else {
    set txt {}
  }
  if {$n>=100} {
    append txt " [lindex $::ones [expr {$n/100}]] hundred"
    set n [expr {$n%100}]
  }
  if {$n>=20} {
    append txt " [lindex $::tens [expr {$n/10}]]"
    set n [expr {$n%10}]
  }
  if {$n>0} {
    append txt " [lindex $::ones $n]"
  }
  set txt [string trim $txt]
  if {$txt==""} {set txt zero}
  return $txt
}

# Summary of tests:
#
#   speed4p-join1: Join three tables using IPK index.
#   speed4p-join2: Join three tables using an index.
#   speed4p-join3: Join two tables without an index.
#
#   speed4p-view1:  Querying a view.
#   speed4p-table1: Same queries as in speed4p-view1, but run directly against
#                  the tables for comparison purposes.
#
#   speed4p-subselect1: A SELECT statement that uses many sub-queries..
#
#   speed4p-trigger1: An INSERT statement that fires a trigger.
#   speed4p-trigger2: An UPDATE statement that fires a trigger.
#   speed4p-trigger3: A DELETE statement that fires a trigger.
#   speed4p-notrigger1: Same operation as trigger1, but without the trigger.
#   speed4p-notrigger2:        "          trigger2           "
#   speed4p-notrigger3:        "          trigger3           "
#

# Set up the schema. Each of the tables t1, t2 and t3 contain 50,000 rows.
# This creates a database of around 16MB.
execsql {
  PRAGMA page_size=1024;
  PRAGMA cache_size=8192;
  PRAGMA locking_mode=EXCLUSIVE;
  BEGIN;
  CREATE TABLE t1(rowid INTEGER PRIMARY KEY, i INTEGER, t TEXT);
  CREATE TABLE t2(rowid INTEGER PRIMARY KEY, i INTEGER, t TEXT);
  CREATE TABLE t3(rowid INTEGER PRIMARY KEY, i INTEGER, t TEXT);

  CREATE VIEW v1 AS SELECT rowid, i, t FROM t1;
  CREATE VIEW v2 AS SELECT rowid, i, t FROM t2;
  CREATE VIEW v3 AS SELECT rowid, i, t FROM t3;
}
for {set jj 1} {$jj <= 3} {incr jj} {
  set stmt [string map "%T% t$jj" {INSERT INTO %T% VALUES(NULL, $i, $t)}]
  for {set ii 0} {$ii < 50000} {incr ii} {
    set i [expr {int(rand()*50000)}]
    set t [number_name $i]
    execsql $stmt
  }
}
execsql {
  CREATE INDEX i1 ON t1(t);
  CREATE INDEX i2 ON t2(t);
  CREATE INDEX i3 ON t3(t);
  COMMIT;
}

# Join t1, t2, t3 on IPK.
set sql "SELECT * FROM t1, t2, t3 WHERE t1.oid = t2.oid AND t2.oid = t3.oid"
speed_trial speed4p-join1 50000 row $sql

# Join t1, t2, t3 on the non-IPK index.
set sql "SELECT * FROM t1, t2, t3 WHERE t1.t = t2.t AND t2.t = t3.t"
speed_trial speed4p-join2 50000 row $sql

# Run 10000 simple queries against the views.
set script {
  for {set ii 1} {$ii < 10000} {incr ii} {
    set v [expr {$ii*3}]
    set t [expr {$ii%3+1}]
    db eval "SELECT * FROM v$t WHERE rowid = \$v"
  }
}
speed_trial_tcl speed4p-view1 10000 stmt $script

# Run the same 10000 simple queries as in the previous test case against
# the underlying tables. The compiled vdbe programs should be identical, so
# the only difference in running time is the extra time taken to compile
# the view definitions.
#
set script {
  for {set ii 1} {$ii < 10000} {incr ii} {
    set v [expr {$ii*3}]
    set t [expr {$ii%3+1}]
    db eval "SELECT t FROM t$t WHERE rowid = \$v"
  }
}
speed_trial_tcl speed4p-table1 10000 stmt $script

# Run a SELECT that uses sub-queries 10000 times. A total of 30000 sub-selects.
#
set script {
  for {set ii 1} {$ii < 10000} {incr ii} {
    set v [expr {$ii*3}]
    db eval {
      SELECT (SELECT t FROM t1 WHERE rowid = $v), 
             (SELECT t FROM t2 WHERE rowid = $v), 
             (SELECT t FROM t3 WHERE rowid = $v)
    }
  }
}
speed_trial_tcl speed4p-subselect1 10000 stmt $script

# Single-row updates performance.
#
set script {
  db eval BEGIN
  for {set ii 1} {$ii < 10000} {incr ii} {
    db eval {UPDATE t1 SET i=i+1 WHERE rowid=$ii}
  }
  db eval COMMIT
}
speed_trial_tcl speed4p-rowid-update 10000 stmt $script


db eval {
   CREATE TABLE t5(t TEXT PRIMARY KEY, i INTEGER);
}
speed_trial speed4p-insert-ignore 50000 row {
  INSERT OR IGNORE INTO t5 SELECT t, i FROM t1;
}

set list [db eval {SELECT t FROM t5}]
set script {
  db eval BEGIN
  foreach t $::list {
    db eval {UPDATE t5 SET i=i+1 WHERE t=$t}
  }
  db eval COMMIT
}
speed_trial_tcl speed4p-unique-update [llength $list] stmt $script

# The following block tests the speed of some DML statements that cause
# triggers to fire.
#
execsql {
  CREATE TABLE log(op TEXT, r INTEGER, i INTEGER, t TEXT);
  CREATE TABLE t4(rowid INTEGER PRIMARY KEY, i INTEGER, t TEXT);
  CREATE TRIGGER t4_trigger1 AFTER INSERT ON t4 BEGIN
    INSERT INTO log VALUES('INSERT INTO t4', new.rowid, new.i, new.t);
  END;
  CREATE TRIGGER t4_trigger2 AFTER UPDATE ON t4 BEGIN
    INSERT INTO log VALUES('UPDATE OF t4', new.rowid, new.i, new.t);
  END;
  CREATE TRIGGER t4_trigger3 AFTER DELETE ON t4 BEGIN
    INSERT INTO log VALUES('DELETE OF t4', old.rowid, old.i, old.t);
  END;
  BEGIN;
}
set list {}
for {set ii 1} {$ii < 10000} {incr ii} {
  lappend list $ii [number_name $ii]
}
set script {
  foreach {ii name} $::list {
    db eval {INSERT INTO t4 VALUES(NULL, $ii, $name)}
  }
}
speed_trial_tcl speed4p-trigger1 10000 stmt $script

set list {}
for {set ii 1} {$ii < 20000} {incr ii 2} {
  set ii2 [expr {$ii*2}]
  lappend list $ii $ii2 [number_name $ii2]
}
set script {
  foreach {ii ii2 name} $::list {
    db eval {
      UPDATE t4 SET i = $ii2, t = $name WHERE rowid = $ii;
    }
  }
}
speed_trial_tcl speed4p-trigger2 10000 stmt $script

set script {
  for {set ii 1} {$ii < 20000} {incr ii 2} {
    db eval {DELETE FROM t4 WHERE rowid = $ii}
  }
}
speed_trial_tcl speed4p-trigger3 10000 stmt $script
execsql {COMMIT}

# The following block contains the same tests as the above block that
# tests triggers, with one crucial difference: no triggers are defined.
# So the difference in speed between these tests and the preceding ones
# is the amount of time taken to compile and execute the trigger programs.
#
execsql {
  DROP TABLE t4;
  DROP TABLE log;
  VACUUM;
  CREATE TABLE t4(rowid INTEGER PRIMARY KEY, i INTEGER, t TEXT);
  BEGIN;
}
set list {}
for {set ii 1} {$ii < 10000} {incr ii} {
  lappend list $ii [number_name $ii]
}
set script {
  foreach {ii name} $::list {
    db eval {INSERT INTO t4 VALUES(NULL, $ii, $name);}
  }
}
speed_trial_tcl speed4p-notrigger1 10000 stmt $script

set list {}
for {set ii 1} {$ii < 20000} {incr ii 2} {
  set ii2 [expr {$ii*2}]
  lappend list $ii $ii2 [number_name $ii2]
}
set script {
  foreach {ii ii2 name} $::list {
    db eval {
      UPDATE t4 SET i = $ii2, t = $name WHERE rowid = $ii;
    }
  }
}
speed_trial_tcl speed4p-notrigger2 10000 stmt $script

set script {
  for {set ii 1} {$ii < 20000} {incr ii 2} {
    db eval {DELETE FROM t4 WHERE rowid = $ii}
  }
}
speed_trial_tcl speed4p-notrigger3 10000 stmt $script
execsql {COMMIT}

speed_trial_summary speed4
finish_test
