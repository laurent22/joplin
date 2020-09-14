# 2010 October 29
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

set testdir [file dirname $argv0]
source $testdir/tester.tcl
source $testdir/malloc_common.tcl
source $testdir/lock_common.tcl


do_multiclient_test tn {
  code1 { catch { sqlite3_multiplex_initialize "" 0 } }
  code2 { catch { sqlite3_multiplex_initialize "" 0 } }

  code1 { db close }
  code2 { db2 close }

  code1 { sqlite3 db test.db -vfs multiplex }
  code2 { sqlite3 db2 test.db -vfs multiplex }

  code1 { sqlite3_multiplex_control db main chunk_size [expr 1024*1024] }
  code2 { sqlite3_multiplex_control db2 main chunk_size [expr 1024*1024] }

  sql1 {
    CREATE TABLE t1(a, b);
    INSERT INTO t1 VALUES(randomblob(10), randomblob(4000));          --    1
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --    2
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --    4
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --    8
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --   16
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --   32
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --   64
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --  128
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --  256
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --  512
    SELECT count(*) FROM t1;
  } 

  do_test multiplex-1.$tn.1 { sql1 { SELECT count(*) FROM t1 } } 512
  do_test multiplex-1.$tn.2 { sql2 { SELECT count(*) FROM t1 } } 512
  sql2 { DELETE FROM t1 ; VACUUM }
  do_test multiplex-1.$tn.3 { sql1 { SELECT count(*) FROM t1 } } 0

  sql1 {
    INSERT INTO t1 VALUES(randomblob(10), randomblob(4000));          --    1
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --    2
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --    4
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --    8
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --   16
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --   32
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --   64
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --  128
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --  256
    INSERT INTO t1 SELECT randomblob(10), randomblob(4000) FROM t1;   --  512
    SELECT count(*) FROM t1;
  }

  do_test multiplex-1.$tn.4 { sql2 { SELECT count(*) FROM t1 } } 512
}

catch { sqlite3_multiplex_shutdown }
finish_test
