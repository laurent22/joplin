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
# This file implements regression tests for SQLite library.  The
# focus of this script is in-memory database backend.
#
# $Id: memdb.test,v 1.19 2009/05/18 16:04:38 danielk1977 Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable memorydb {

# In the following sequence of tests, compute the MD5 sum of the content
# of a table, make lots of modifications to that table, then do a rollback.
# Verify that after the rollback, the MD5 checksum is unchanged.
#
# These tests were browed from trans.tcl.
#
do_test memdb-1.1 {
  db close
  sqlite3 db :memory:
  # sqlite3 db test.db
  execsql {
    BEGIN;
    CREATE TABLE t3(x TEXT);
    INSERT INTO t3 VALUES(randstr(10,400));
    INSERT INTO t3 VALUES(randstr(10,400));
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    INSERT INTO t3 SELECT randstr(10,400) FROM t3;
    COMMIT;
    SELECT count(*) FROM t3;
  }
} {1024}

# The following procedure computes a "signature" for table "t3".  If
# T3 changes in any way, the signature should change.  
#
# This is used to test ROLLBACK.  We gather a signature for t3, then
# make lots of changes to t3, then rollback and take another signature.
# The two signatures should be the same.
#
proc signature {{fn {}}} {
  set rx [db eval {SELECT x FROM t3}]
  # set r1 [md5 $rx\n]
  if {$fn!=""} {
    # set fd [open $fn w]
    # puts $fd $rx
    # close $fd
  }
  # set r [db eval {SELECT count(*), md5sum(x) FROM t3}]
  # puts "SIG($fn)=$r1"
  return [list [string length $rx] $rx]
}

# Do rollbacks.  Make sure the signature does not change.
#
set limit 10
for {set i 2} {$i<=$limit} {incr i} {
  set ::sig [signature one]
  # puts "sig=$sig"
  set cnt [lindex $::sig 0]
  if {$i%2==0} {
    execsql {PRAGMA synchronous=FULL}
  } else {
    execsql {PRAGMA synchronous=NORMAL}
  }
  do_test memdb-1.$i.1-$cnt {
     execsql {
       BEGIN;
       DELETE FROM t3 WHERE random()%10!=0;
       INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
       INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
       ROLLBACK;
     }
     set sig2 [signature two]
  } $sig
  # puts "sig2=$sig2"
  # if {$sig2!=$sig} exit
  do_test memdb-1.$i.2-$cnt {
     execsql {
       BEGIN;
       DELETE FROM t3 WHERE random()%10!=0;
       INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
       DELETE FROM t3 WHERE random()%10!=0;
       INSERT INTO t3 SELECT randstr(10,10)||x FROM t3;
       ROLLBACK;
     }
     signature
  } $sig
  if {$i<$limit} {
    do_test memdb-1.$i.9-$cnt {
       execsql {
         INSERT INTO t3 SELECT randstr(10,400) FROM t3 WHERE random()%10==0;
       }
    } {}
  }
  set ::pager_old_format 0
}

integrity_check memdb-2.1

do_test memdb-3.1 {
  execsql {
    CREATE TABLE t4(a,b,c,d);
    BEGIN;
    INSERT INTO t4 VALUES(1,2,3,4);
    SELECT * FROM t4;
  }
} {1 2 3 4}
do_test memdb-3.2 {
  execsql {
    SELECT name FROM sqlite_master WHERE type='table';
  }
} {t3 t4}
do_test memdb-3.3 {
  execsql {
    DROP TABLE t4;
    SELECT name FROM sqlite_master WHERE type='table';
  }
} {t3}
do_test memdb-3.4 {
  execsql {
    ROLLBACK;
    SELECT name FROM sqlite_master WHERE type='table';
  }
} {t3 t4}

# Create tables for the first group of tests.
#
do_test memdb-4.0 {
  execsql {
    CREATE TABLE t1(a, b, c, UNIQUE(a,b));
    CREATE TABLE t2(x);
    SELECT c FROM t1 ORDER BY c;
  }
} {}

# Six columns of configuration data as follows:
#
#   i      The reference number of the test
#   conf   The conflict resolution algorithm on the BEGIN statement
#   cmd    An INSERT or REPLACE command to execute against table t1
#   t0     True if there is an error from $cmd
#   t1     Content of "c" column of t1 assuming no error in $cmd
#   t2     Content of "x" column of t2
#
foreach {i conf cmd t0 t1 t2} {
  1 {}       INSERT                  1 {}  1
  2 {}       {INSERT OR IGNORE}      0 3   1
  3 {}       {INSERT OR REPLACE}     0 4   1
  4 {}       REPLACE                 0 4   1
  5 {}       {INSERT OR FAIL}        1 {}  1
  6 {}       {INSERT OR ABORT}       1 {}  1
  7 {}       {INSERT OR ROLLBACK}    1 {}  {}
} {

  # All tests after test 1 depend on conflict resolution. So end the
  # loop if that is not available in this build.
  ifcapable !conflict {if {$i>1} break}

  do_test memdb-4.$i {
    if {$conf!=""} {set conf "ON CONFLICT $conf"}
    set r0 [catch {execsql [subst {
      DELETE FROM t1;
      DELETE FROM t2;
      INSERT INTO t1 VALUES(1,2,3);
      BEGIN $conf;
      INSERT INTO t2 VALUES(1); 
      $cmd INTO t1 VALUES(1,2,4);
    }]} r1]
    catch {execsql {COMMIT}}
    if {$r0} {set r1 {}} {set r1 [execsql {SELECT c FROM t1}]}
    set r2 [execsql {SELECT x FROM t2}]
    list $r0 $r1 $r2
  } [list $t0 $t1 $t2]
}

do_test memdb-5.0 {
  execsql {
    DROP TABLE t2;
    DROP TABLE t3;
    CREATE TABLE t2(a,b,c);
    INSERT INTO t2 VALUES(1,2,1);
    INSERT INTO t2 VALUES(2,3,2);
    INSERT INTO t2 VALUES(3,4,1);
    INSERT INTO t2 VALUES(4,5,4);
    SELECT c FROM t2 ORDER BY b;
    CREATE TABLE t3(x);
    INSERT INTO t3 VALUES(1);
  }
} {1 2 1 4}

# Six columns of configuration data as follows:
#
#   i      The reference number of the test
#   conf1  The conflict resolution algorithm on the UNIQUE constraint
#   conf2  The conflict resolution algorithm on the BEGIN statement
#   cmd    An UPDATE command to execute against table t1
#   t0     True if there is an error from $cmd
#   t1     Content of "b" column of t1 assuming no error in $cmd
#   t2     Content of "x" column of t3
#
foreach {i conf1 conf2 cmd t0 t1 t2} {
  1 {}       {}       UPDATE                  1 {6 7 8 9}  1
  2 REPLACE  {}       UPDATE                  0 {7 6 9}    1
  3 IGNORE   {}       UPDATE                  0 {6 7 3 9}  1
  4 FAIL     {}       UPDATE                  1 {6 7 3 4}  1
  5 ABORT    {}       UPDATE                  1 {1 2 3 4}  1
  6 ROLLBACK {}       UPDATE                  1 {1 2 3 4}  0
  7 REPLACE  {}       {UPDATE OR IGNORE}      0 {6 7 3 9}  1
  8 IGNORE   {}       {UPDATE OR REPLACE}     0 {7 6 9}    1
  9 FAIL     {}       {UPDATE OR IGNORE}      0 {6 7 3 9}  1
 10 ABORT    {}       {UPDATE OR REPLACE}     0 {7 6 9}    1
 11 ROLLBACK {}       {UPDATE OR IGNORE}      0 {6 7 3 9}   1
 12 {}       {}       {UPDATE OR IGNORE}      0 {6 7 3 9}  1
 13 {}       {}       {UPDATE OR REPLACE}     0 {7 6 9}    1
 14 {}       {}       {UPDATE OR FAIL}        1 {6 7 3 4}  1
 15 {}       {}       {UPDATE OR ABORT}       1 {1 2 3 4}  1
 16 {}       {}       {UPDATE OR ROLLBACK}    1 {1 2 3 4}  0
} {
  # All tests after test 1 depend on conflict resolution. So end the
  # loop if that is not available in this build.
  ifcapable !conflict {
    if {$i>1} break
  }

  if {$t0} {set t1 {UNIQUE constraint failed: t1.a}}
  do_test memdb-5.$i {
    if {$conf1!=""} {set conf1 "ON CONFLICT $conf1"}
    if {$conf2!=""} {set conf2 "ON CONFLICT $conf2"}
    set r0 [catch {execsql "
      DROP TABLE t1;
      CREATE TABLE t1(a,b,c, UNIQUE(a) $conf1);
      INSERT INTO t1 SELECT * FROM t2;
      UPDATE t3 SET x=0;
      BEGIN $conf2;
      $cmd t3 SET x=1;
      $cmd t1 SET b=b*2;
      $cmd t1 SET a=c+5;
    "} r1]
    catch {execsql {COMMIT}}
    if {!$r0} {set r1 [execsql {SELECT a FROM t1 ORDER BY b}]}
    set r2 [execsql {SELECT x FROM t3}]
    list $r0 $r1 $r2
  } [list $t0 $t1 $t2]
}

do_test memdb-6.1 {
  execsql {
    SELECT * FROM t2;
  }
} {1 2 1 2 3 2 3 4 1 4 5 4}
do_test memdb-6.2 {
  execsql {
    BEGIN;
    DROP TABLE t2;
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1;
  }
} {t1 t3 t4}
do_test memdb-6.3 {
  execsql {
    ROLLBACK;
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1;
  }
} {t1 t2 t3 t4}
do_test memdb-6.4 {
  execsql {
    SELECT * FROM t2;
  }
} {1 2 1 2 3 2 3 4 1 4 5 4}
ifcapable compound {
do_test memdb-6.5 {
  execsql {
    SELECT a FROM t2 UNION SELECT b FROM t2 ORDER BY 1;
  }
} {1 2 3 4 5}
} ;# ifcapable compound 
do_test memdb-6.6 {
  execsql {
    CREATE INDEX i2 ON t2(c);
    SELECT a FROM t2 ORDER BY c;
  }
} {1 3 2 4}
do_test memdb-6.6 {
  execsql {
    SELECT a FROM t2 ORDER BY c DESC;
  }
} {4 2 3 1}
do_test memdb-6.7 {
  execsql {
    BEGIN;
    CREATE TABLE t5(x,y);
    INSERT INTO t5 VALUES(1,2);
    SELECT * FROM t5;
  }
} {1 2}
do_test memdb-6.8 {
  execsql {
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1;
  }
} {t1 t2 t3 t4 t5}
do_test memdb-6.9 {
  execsql {
    ROLLBACK;
    SELECT name FROM sqlite_master WHERE type='table' ORDER BY 1;
  }
} {t1 t2 t3 t4}
do_test memdb-6.10 {
  execsql {
    CREATE TABLE t5(x PRIMARY KEY, y UNIQUE);
    SELECT * FROM t5;
  }
} {}
do_test memdb-6.11 {
  execsql {
    SELECT * FROM t5 ORDER BY y DESC;
  }
} {}

ifcapable conflict {
  do_test memdb-6.12 {
    execsql {
      INSERT INTO t5 VALUES(1,2);
      INSERT INTO t5 VALUES(3,4);
      REPLACE INTO t5 VALUES(1,4);
      SELECT rowid,* FROM t5;
    }
  } {3 1 4}
  do_test memdb-6.13 {
    execsql {
      DELETE FROM t5 WHERE x>5;
      SELECT * FROM t5;
    }
  } {1 4}
  do_test memdb-6.14 {
    execsql {
      DELETE FROM t5 WHERE y<3;
      SELECT * FROM t5;
    }
  } {1 4}
}

do_test memdb-6.15 {
  execsql {
    DELETE FROM t5 WHERE x>0;
    SELECT * FROM t5;
  }
} {}

ifcapable subquery&&vtab {
  do_test memdb-7.1 {
    load_static_extension db wholenumber
    execsql {
      CREATE TABLE t6(x);
      CREATE VIRTUAL TABLE nums USING wholenumber;
      INSERT INTO t6 SELECT value FROM nums WHERE value BETWEEN 1 AND 256;
      SELECT count(*) FROM (SELECT DISTINCT x FROM t6);
    }
  } {256}
  for {set i 1} {$i<=256} {incr i} {
    do_test memdb-7.2.$i {
       execsql "DELETE FROM t6 WHERE x=\
                (SELECT x FROM t6 ORDER BY random() LIMIT 1)"
       execsql {SELECT count(*) FROM t6}
    } [expr {256-$i}]
  }
}

# Ticket #1524
#
do_test memdb-8.1 {
  db close
  sqlite3 db {:memory:}
  execsql {
    PRAGMA auto_vacuum=TRUE;
    CREATE TABLE t1(a);
    INSERT INTO t1 VALUES(randstr(5000,6000));
    INSERT INTO t1 VALUES(randstr(5000,6000));
    INSERT INTO t1 VALUES(randstr(5000,6000));
    INSERT INTO t1 VALUES(randstr(5000,6000));
    INSERT INTO t1 VALUES(randstr(5000,6000));
    SELECT count(*) FROM t1;
  }
} 5
do_test memdb-8.2 {
  execsql {
    DELETE FROM t1;
    SELECT count(*) FROM t1;
  }
} 0

# Test that auto-vacuum works with in-memory databases.
# 
ifcapable autovacuum {
  do_test memdb-9.1 {
    db close
    sqlite3 db test.db
    db cache size 0
    execsql {
      PRAGMA auto_vacuum = full;
      CREATE TABLE t1(a);
      INSERT INTO t1 VALUES(randstr(1000,1000));
      INSERT INTO t1 VALUES(randstr(1000,1000));
      INSERT INTO t1 VALUES(randstr(1000,1000));
    }
    set before [db one {PRAGMA page_count}]
    execsql { DELETE FROM t1 }
    set after [db one {PRAGMA page_count}]
    expr {$before>$after}
  } {1}
}

} ;# ifcapable memorydb

finish_test
