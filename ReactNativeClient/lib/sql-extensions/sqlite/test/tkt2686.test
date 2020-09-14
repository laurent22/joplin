# 2007 Oct 3
#
# The author disclaims copyright to this source code. In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file is to test that ticket #2686 has been fixed.
#
# $Id: tkt2686.test,v 1.3 2008/02/02 02:48:52 drh Exp $
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !subquery {
  finish_test
  return
}

db eval {
  PRAGMA page_size=1024;
  PRAGMA max_page_count=50;
  PRAGMA auto_vacuum=0;
  CREATE TABLE filler (fill);
}
for {set i 1} {$i<2000} {incr i} {
  do_test tkt2686-$i.1 {
    db eval BEGIN
    set rc [catch {
      while 1 {
        db eval {INSERT INTO filler (fill) VALUES (randstr(1000, 10000)) }
      }
    } msg]
    lappend rc $msg
  } {1 {database or disk is full}}
  do_test tkt2686-$i.2 {
    execsql {
      DELETE FROM filler 
       WHERE rowid <= (SELECT MAX(rowid) FROM filler LIMIT 20)
    }
  } {}
  integrity_check tkt2686-$i.3
  catch {db eval COMMIT}
}

db close
forcedelete test.db test.db-journal
sqlite3 db test.db

db eval {
  PRAGMA page_size=1024;
  PRAGMA max_page_count=50;
  PRAGMA auto_vacuum=1;
  CREATE TABLE filler (fill);
}
for {set i 10000} {$i<12000} {incr i} {
  do_test tkt2686-$i.1 {
    db eval BEGIN
    set rc [catch {
      while 1 {
        db eval {INSERT INTO filler (fill) VALUES (randstr(1000, 10000)) }
      }
    } msg]
    lappend rc $msg
  } {1 {database or disk is full}}
  do_test tkt2686-$i.2 {
    execsql {
      DELETE FROM filler 
       WHERE rowid <= (SELECT MAX(rowid) FROM filler LIMIT 20)
    }
  } {}
  integrity_check tkt2686-$i.3
  catch {db eval COMMIT}
}

finish_test
