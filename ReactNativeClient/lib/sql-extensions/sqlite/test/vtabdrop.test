# 2018 December 28
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# The tests in this file test edge cases surrounding DROP TABLE on 
# virtual tables.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !vtab { finish_test ; return }
source $testdir/fts3_common.tcl
source $testdir/malloc_common.tcl

set testprefix vtabdrop

#-------------------------------------------------------------------------
# Test that if a DROP TABLE is executed against an rtree table, but the
# xDestroy() call fails, the rtree table is not dropped, the sqlite_master
# table is not modified and the internal schema remains intact.
# 
ifcapable rtree {
  do_execsql_test 1.0 {
    CREATE VIRTUAL TABLE rt USING rtree(id, x1, x2);
    CREATE TABLE t1(x, y);
    INSERT INTO t1 VALUES(1, 2);
  }
  
  do_test 1.1 {
    execsql {
      BEGIN;
        INSERT INTO t1 VALUES(3, 4);
    }
    db eval { SELECT * FROM t1 } {
      catchsql { DROP TABLE rt }
    }
    execsql COMMIT
  } {}
  
  do_execsql_test 1.2 {
    SELECT name FROM sqlite_master ORDER BY 1;
    SELECT * FROM t1;
    SELECT * FROM rt;
  } {rt rt_node rt_parent rt_rowid t1 1 2 3 4}
  
  db close
  sqlite3 db test.db
  
  do_execsql_test 1.3 {
    SELECT name FROM sqlite_master ORDER BY 1;
  } {rt rt_node rt_parent rt_rowid t1}
}

#-------------------------------------------------------------------------
# Same as tests 1.*, except with fts5 instead of rtree.
# 
ifcapable fts5 {
  reset_db
  do_execsql_test 2.0 {
    CREATE VIRTUAL TABLE ft USING fts5(x);
    CREATE TABLE t1(x, y);
    INSERT INTO t1 VALUES(1, 2);
  }
  
  do_test 2.1 {
    execsql {
      BEGIN;
        INSERT INTO t1 VALUES(3, 4);
    }
    db eval { SELECT * FROM t1 } {
      catchsql { DROP TABLE ft }
    }
    execsql COMMIT
  } {}
  
  do_execsql_test 2.2 {
    SELECT name FROM sqlite_master ORDER BY 1;
  } {ft ft_config ft_content ft_data ft_docsize ft_idx t1}
  
  db close
  sqlite3 db test.db
  
  do_execsql_test 2.3 {
    SELECT name FROM sqlite_master ORDER BY 1;
  } {ft ft_config ft_content ft_data ft_docsize ft_idx t1}
}

#-------------------------------------------------------------------------
# Same as tests 1.*, except with fts3 instead of rtree.
# 
ifcapable fts3 {
  reset_db
  do_execsql_test 2.0 {
    CREATE VIRTUAL TABLE ft USING fts3(x);
    CREATE TABLE t1(x, y);
    INSERT INTO t1 VALUES(1, 2);
  }
  
  do_test 2.1 {
    execsql {
      BEGIN;
        INSERT INTO t1 VALUES(3, 4);
    }
    db eval { SELECT * FROM t1 } {
      catchsql { DROP TABLE ft }
    }
    execsql COMMIT
  } {}
  
  do_execsql_test 2.2 {
    SELECT name FROM sqlite_master ORDER BY 1;
  } {ft ft_content ft_segdir ft_segments sqlite_autoindex_ft_segdir_1 t1}
  
  db close
  sqlite3 db test.db
  
  do_execsql_test 2.3 {
    SELECT name FROM sqlite_master ORDER BY 1;
  } {ft ft_content ft_segdir ft_segments sqlite_autoindex_ft_segdir_1 t1}
}

finish_test
