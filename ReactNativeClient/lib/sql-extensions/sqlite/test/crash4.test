# 2008 January 8
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
# This file contains additional tests to verify that SQLite database
# file survive a power loss or OS crash.
#
# $Id: crash4.test,v 1.3 2008/01/16 17:46:38 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !crashtest {
  finish_test
  return
}


# A sequence of SQL commands:
#
set sql_cmd_list {
  {CREATE TABLE a(id INTEGER, name CHAR(50))}
  {INSERT INTO a(id,name) VALUES(1,'one')}
  {INSERT INTO a(id,name) VALUES(2,'two')}
  {INSERT INTO a(id,name) VALUES(3,'three')}
  {INSERT INTO a(id,name) VALUES(4,'four')}
  {INSERT INTO a(id,name) VALUES(5,'five')}
  {INSERT INTO a(id,name) VALUES(6,'six')}
  {INSERT INTO a(id,name) VALUES(7,'seven')}
  {INSERT INTO a(id,name) VALUES(8,'eight')}
  {INSERT INTO a(id,name) VALUES(9,'nine')}
  {INSERT INTO a(id,name) VALUES(10,'ten')}
  {UPDATE A SET name='new text for row 3' WHERE id=3}
}

# Assume that a database is created by evaluating the SQL statements
# in $sql_cmd_list.  Compute a set of checksums that capture the state
# of the database after each statement.  Also include a checksum for
# the state of the database prior to any of these statements.
#
set crash4_cksum_set {}
lappend crash4_cksum_set [allcksum db]
foreach cmd $sql_cmd_list {
  db eval $cmd
  lappend crash4_cksum_set [allcksum db]
}

# Run the sequence of SQL statements shown above repeatedly.
# Close and reopen the database right before the UPDATE statement.
# On each repetition, introduce database corruption typical of
# what might be seen in a power loss or OS crash.  
#
# Slowly increase the delay before the crash, repeating the test
# over and over.  Stop testing when the entire sequence of SQL
# statements runs to completing without hitting the crash.
#
for {set cnt 1; set fin 0} {!$fin} {incr cnt} {
  db close
  forcedelete test.db test.db-journal
  do_test crash4-1.$cnt.1 {
    set seed [expr {int(abs(rand()*10000))}]
    set delay [expr {int($cnt/50)+1}]
    set file [expr {($cnt&1)?"test.db":"test.db-journal"}]
    set c [crashsql -delay $delay -file $file -seed $seed -tclbody {
      db eval {CREATE TABLE a(id INTEGER, name CHAR(50))}
      db eval {INSERT INTO a(id,name) VALUES(1,'one')}
      db eval {INSERT INTO a(id,name) VALUES(2,'two')}
      db eval {INSERT INTO a(id,name) VALUES(3,'three')}
      db eval {INSERT INTO a(id,name) VALUES(4,'four')}
      db eval {INSERT INTO a(id,name) VALUES(5,'five')}
      db eval {INSERT INTO a(id,name) VALUES(6,'six')}
      db eval {INSERT INTO a(id,name) VALUES(7,'seven')}
      db eval {INSERT INTO a(id,name) VALUES(8,'eight')}
      db eval {INSERT INTO a(id,name) VALUES(9,'nine')}
      db eval {INSERT INTO a(id,name) VALUES(10,'ten')}
      db close
      sqlite3 db test.db
      db eval {UPDATE A SET name='new text for row 3' WHERE id=3}
      db close
    } {}]
    if {$c==[list 0 {}]} {
      set ::fin 1
      set c [list 1 {child process exited abnormally}]
    }
    set c
  } {1 {child process exited abnormally}}
  sqlite3 db test.db
  integrity_check crash4-1.$cnt.2
  do_test crash4-1.$cnt.3 {
    set x [lsearch $::crash4_cksum_set [allcksum db]]
    expr {$x>=0}
  } {1}
}

finish_test
