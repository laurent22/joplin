# 2008 March 20
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
# $Id: crash7.test,v 1.1 2008/04/03 14:36:26 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix crash7

ifcapable !crashtest {
  finish_test
  return
}

proc signature {} {
  return [db eval {SELECT count(*), md5sum(a), md5sum(b), md5sum(c) FROM abc}]
}

foreach f [list test.db test.db-journal] {
  for {set ii 1} {$ii < 64} {incr ii} {
    db close
    delete_file test.db
    sqlite3 db test.db
  
    set from_size [expr 1024 << ($ii&3)]
    set to_size   [expr 1024 << (($ii>>2)&3)]
  
    execsql "
      PRAGMA page_size = $from_size;
      BEGIN;
      CREATE TABLE abc(a PRIMARY KEY, b, c);
      INSERT INTO abc VALUES(randomblob(100), randomblob(200), randomblob(1000));
      INSERT INTO abc 
          SELECT randomblob(1000), randomblob(200), randomblob(100)
          FROM abc;
      INSERT INTO abc 
          SELECT randomblob(100), randomblob(200), randomblob(1000)
          FROM abc;
      INSERT INTO abc 
          SELECT randomblob(100), randomblob(200), randomblob(1000)
          FROM abc;
      INSERT INTO abc 
          SELECT randomblob(100), randomblob(200), randomblob(1000)
          FROM abc;
      INSERT INTO abc 
          SELECT randomblob(100), randomblob(200), randomblob(1000)
          FROM abc WHERE [expr $ii&16];
      INSERT INTO abc 
          SELECT randomblob(25), randomblob(45), randomblob(9456)
          FROM abc WHERE [expr $ii&32];
      INSERT INTO abc 
          SELECT randomblob(100), randomblob(200), randomblob(1000)
          FROM abc WHERE [expr $ii&8];
      INSERT INTO abc 
          SELECT randomblob(25), randomblob(45), randomblob(9456)
          FROM abc WHERE [expr $ii&4];
      COMMIT;
    "
  
    set sig [signature]
    db close
  
    do_test crash7-1.$ii.crash {
       crashsql -file $f "
         PRAGMA page_size = $to_size;
         VACUUM;
       "
    } {1 {child process exited abnormally}}
  
    sqlite3 db test.db
    integrity_check crash7-1.$ii.integrity
  } 
}

db close
forcedelete test.db
sqlite3 db test.db
do_execsql_test 2.0 {
  CREATE TABLE t1(a, b, UNIQUE(a, b));
  INSERT INTO t1 VALUES(randomblob(100), randomblob(100));
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  INSERT INTO t1 SELECT randomblob(100), randomblob(100) FROM t1;
  DELETE FROM t1 WHERE rowid%2;
}
db_save_and_close

for {set i 0} {$i < 20} {incr i} {
  db_restore_and_reopen
  do_test 2.[expr $i+1].1 {
    crashsql -file test.db -seed $i {VACUUM}
  } {1 {child process exited abnormally}}
  do_execsql_test 2.[expr $i+1].2 { PRAGMA integrity_check } {ok}
}


finish_test
