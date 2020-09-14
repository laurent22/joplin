# 2004 September 2
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
# This file implements tests for the page_size PRAGMA.
#
# $Id: pagesize.test,v 1.13 2008/08/26 21:07:27 drh Exp $


set testdir [file dirname $argv0]
source $testdir/tester.tcl

# This test script depends entirely on "PRAGMA page_size". So if this
# pragma is not available, omit the whole file.
ifcapable !pager_pragmas {
  finish_test
  return
}

do_test pagesize-1.1 {
  execsql {PRAGMA page_size}
} 1024
ifcapable {explain} {
  do_test pagesize-1.2 {
    catch {execsql {EXPLAIN PRAGMA page_size}}
  } 0
}
do_test pagesize-1.3 {
  execsql {
    CREATE TABLE t1(a);
    PRAGMA page_size=2048;
    PRAGMA page_size;
  }
} 1024

do_test pagesize-1.4 {
  db close
  forcedelete test.db
  sqlite3 db test.db
  execsql {
    PRAGMA page_size=511;
    PRAGMA page_size;
  }
} 1024
do_test pagesize-1.5 {
  execsql {
    PRAGMA page_size=512;
    PRAGMA page_size;
  }
} 512
if {![info exists SQLITE_MAX_PAGE_SIZE] || $SQLITE_MAX_PAGE_SIZE>=8192} {
  do_test pagesize-1.6 {
    execsql {
      PRAGMA page_size=8192;
      PRAGMA page_size;
    }
  } 8192
  do_test pagesize-1.7 {
    execsql {
      PRAGMA page_size=65537;
      PRAGMA page_size;
    }
  } 8192
  do_test pagesize-1.8 {
    execsql {
      PRAGMA page_size=1234;
      PRAGMA page_size
    }
  } 8192
}  
foreach PGSZ {512 2048 4096 8192} {
  if {[info exists SQLITE_MAX_PAGE_SIZE]
           && $SQLITE_MAX_PAGE_SIZE<$PGSZ} continue
  ifcapable memorydb {
    do_test pagesize-2.$PGSZ.0.1 {
      db close
      sqlite3 db :memory:
      execsql "PRAGMA page_size=$PGSZ;"
      execsql {PRAGMA page_size}
    } $PGSZ
    do_test pagesize-2.$PGSZ.0.2 {
      execsql {CREATE TABLE t1(x UNIQUE, y UNIQUE, z UNIQUE)}
      execsql {PRAGMA page_size}
    } $PGSZ
    do_test pagesize-2.$PGSZ.0.3 {
      execsql {
        INSERT INTO t1 VALUES(1,2,3);
        INSERT INTO t1 VALUES(2,3,4);
        SELECT * FROM t1;
      }
    } {1 2 3 2 3 4}
  }
  do_test pagesize-2.$PGSZ.1 {
    db close
    forcedelete test.db
    sqlite3 db test.db
    execsql "PRAGMA page_size=$PGSZ"
    execsql {
      CREATE TABLE t1(x);
      PRAGMA page_size;
    }
  } $PGSZ
  do_test pagesize-2.$PGSZ.2 {
    db close
    sqlite3 db test.db
    execsql {
      PRAGMA page_size
    }
  } $PGSZ
  do_test pagesize-2.$PGSZ.3 {
    file size test.db
  } [expr {$PGSZ*($AUTOVACUUM?3:2)}]
  ifcapable {vacuum} {
    do_test pagesize-2.$PGSZ.4 {
      execsql {VACUUM}
    } {}
  }
  integrity_check pagesize-2.$PGSZ.5
  do_test pagesize-2.$PGSZ.6 {
    db close
    sqlite3 db test.db
    execsql {PRAGMA page_size}
  } $PGSZ
  do_test pagesize-2.$PGSZ.7 {
    execsql {
      INSERT INTO t1 VALUES(randstr(10,9000));
      INSERT INTO t1 VALUES(randstr(10,9000));
      INSERT INTO t1 VALUES(randstr(10,9000));
      BEGIN;
      INSERT INTO t1 SELECT x||x FROM t1;
      INSERT INTO t1 SELECT x||x FROM t1;
      INSERT INTO t1 SELECT x||x FROM t1;
      INSERT INTO t1 SELECT x||x FROM t1;
      SELECT count(*) FROM t1;
    }
  } 48
  do_test pagesize-2.$PGSZ.8 {
    execsql {
      ROLLBACK;
      SELECT count(*) FROM t1;
    }
  } 3
  integrity_check pagesize-2.$PGSZ.9
  do_test pagesize-2.$PGSZ.10 {
    db close
    sqlite3 db test.db
    execsql {PRAGMA page_size}
  } $PGSZ
  do_test pagesize-2.$PGSZ.11 {
    execsql {
      INSERT INTO t1 SELECT x||x FROM t1;
      INSERT INTO t1 SELECT x||x FROM t1;
      INSERT INTO t1 SELECT x||x FROM t1;
      INSERT INTO t1 SELECT x||x FROM t1;
      INSERT INTO t1 SELECT x||x FROM t1;
      INSERT INTO t1 SELECT x||x FROM t1;
      SELECT count(*) FROM t1;
    }
  } 192
  do_test pagesize-2.$PGSZ.12 {
    execsql {
      BEGIN;
      DELETE FROM t1 WHERE rowid%5!=0;
      SELECT count(*) FROM t1;
    }
  } 38
  do_test pagesize-2.$PGSZ.13 {
    execsql {
      ROLLBACK;
      SELECT count(*) FROM t1;
    }
  } 192
  integrity_check pagesize-2.$PGSZ.14
  do_test pagesize-2.$PGSZ.15 {
    execsql {DELETE FROM t1 WHERE rowid%5!=0}
    ifcapable {vacuum} {execsql VACUUM}
    execsql {SELECT count(*) FROM t1}
  } 38
  do_test pagesize-2.$PGSZ.16 {
    execsql {DROP TABLE t1}
    ifcapable {vacuum} {execsql VACUUM}
  } {}
  integrity_check pagesize-2.$PGSZ.17

  db close
  forcedelete test.db
  sqlite3 db test.db
  do_test pagesize-2.$PGSZ.30 {
    execsql "
      CREATE TABLE t1(x);
      PRAGMA temp.page_size=$PGSZ;
      CREATE TEMP TABLE t2(y);
      PRAGMA main.page_size;
      PRAGMA temp.page_size;
    "
  } [list 1024 $PGSZ]

  db close
  forcedelete test.db
  sqlite3 db test.db
  do_test pagesize-2.$PGSZ.40 {
    execsql "
      PRAGMA page_size=$PGSZ;
      CREATE TABLE t1(x);
      CREATE TEMP TABLE t2(y);
      PRAGMA main.page_size;
      PRAGMA temp.page_size;
    "
  } [list $PGSZ $PGSZ]
}

reset_db
do_execsql_test pagesize-3.1 {
  BEGIN;
  SELECT * FROM sqlite_master;
  PRAGMA page_size=2048;
  PRAGMA main.page_size;
} {1024}
do_execsql_test pagesize-3.2 {
  CREATE TABLE t1(x);
  COMMIT;
}
do_execsql_test pagesize-3.3 {
  BEGIN;
    PRAGMA page_size = 2048;
  COMMIT;
  PRAGMA main.page_size;
} {1024}

finish_test
