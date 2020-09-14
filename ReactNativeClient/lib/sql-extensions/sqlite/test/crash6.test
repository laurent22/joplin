# 2001 September 15
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file tests that rollback journals for databases that use a 
# page-size other than the default page-size can be rolled back Ok.
#
# $Id: crash6.test,v 1.2 2008/04/14 15:27:19 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !crashtest {
  finish_test
  return
}

for {set ii 0} {$ii < 10} {incr ii} {
  catch {db close}
  forcedelete test.db test.db-journal
  crashsql -delay 2 -file test.db {
    PRAGMA auto_vacuum=OFF;
    PRAGMA page_size=4096;
    BEGIN;
    CREATE TABLE abc AS SELECT 1 AS a, 2 AS b, 3 AS c;
    COMMIT;
    BEGIN;
    CREATE TABLE def AS SELECT 1 AS d, 2 AS e, 3 AS f;
    COMMIT;
  }
  sqlite3 db test.db
  integrity_check crash6-1.$ii
}

for {set ii 0} {$ii < 10} {incr ii} {
  catch {db close}
  forcedelete test.db test.db-journal
  sqlite3 db test.db
  execsql {
    PRAGMA auto_vacuum=OFF;
    PRAGMA page_size=2048;
    BEGIN;
    CREATE TABLE abc AS SELECT 1 AS a, 2 AS b, 3 AS c;
    COMMIT;
  }
  db close
  crashsql -delay 1 -file test.db {
    INSERT INTO abc VALUES(5, 6, 7);
  }
  sqlite3 db test.db
  integrity_check crash6-2.$ii
}

proc signature {} {
  return [db eval {SELECT count(*), md5sum(a), md5sum(b), md5sum(c) FROM abc}]
}

# Test case for crashing during database sync with page-size values 
# from 1024 to 8192.
#
for {set ii 0} {$ii < 30} {incr ii} {
  db close
  forcedelete test.db
  sqlite3 db test.db

  set pagesize [expr 1024 << ($ii % 4)]
  if {$pagesize>$::SQLITE_MAX_PAGE_SIZE} {
    set pagesize $::SQLITE_MAX_PAGE_SIZE
  }
  do_test crash6-3.$ii.0 {
    execsql "pragma page_size = $pagesize"
    execsql "pragma page_size"
  } $pagesize

  do_test crash6-3.$ii.1 {
  
    execsql BEGIN
    execsql {CREATE TABLE abc(a, b, c)}
    for {set n 0} {$n < 1000} {incr n} {
      execsql "INSERT INTO abc VALUES($n, [expr 2*$n], [expr 3*$n])"
    }
    execsql {
      INSERT INTO abc SELECT * FROM abc;
      INSERT INTO abc SELECT * FROM abc;
      INSERT INTO abc SELECT * FROM abc;
      INSERT INTO abc SELECT * FROM abc;
      INSERT INTO abc SELECT * FROM abc;
    }
    execsql COMMIT
    expr ([file size test.db] / 1024) > 450
  } {1}

  set sig [signature]
  db close

  do_test crash6-3.$ii.2 {
     crashsql -file test.db "
       BEGIN;
       SELECT random() FROM abc LIMIT $ii;
       INSERT INTO abc SELECT randstr(10,10), 0, 0 FROM abc WHERE random()%2==0;
       DELETE FROM abc WHERE random()%2!=0;
       COMMIT;
     "
  } {1 {child process exited abnormally}}

  do_test crash6-3.$ii.3 {
    sqlite3 db test.db
    signature
  } $sig
} 

finish_test
