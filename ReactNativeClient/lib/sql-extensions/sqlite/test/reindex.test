# 2004 November 5
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
# This file implements tests for the REINDEX command.
#
# $Id: reindex.test,v 1.4 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix reindex

# There is nothing to test if REINDEX is disable for this build.
#
ifcapable {!reindex} {
  finish_test
  return
}

# Basic sanity checks.
#
do_test reindex-1.1 {
  execsql {
    CREATE TABLE t1(a,b);
    INSERT INTO t1 VALUES(1,2);
    INSERT INTO t1 VALUES(3,4);
    CREATE INDEX i1 ON t1(a);
    REINDEX;
  }
} {}
integrity_check reindex-1.2
do_test reindex-1.3 {
  execsql {
    REINDEX t1;
  }
} {}
integrity_check reindex-1.4
do_test reindex-1.5 {
  execsql {
    REINDEX i1;
  }
} {}
integrity_check reindex-1.6
do_test reindex-1.7 {
  execsql {
    REINDEX main.t1;
  }
} {}
do_test reindex-1.8 {
  execsql {
    REINDEX main.i1;
  }
} {}
do_test reindex-1.9 {
  catchsql {
    REINDEX bogus
  }
} {1 {unable to identify the object to be reindexed}}

# Set up a table for testing that includes several different collating
# sequences including some that we can modify.
#
do_test reindex-2.1 {
  proc c1 {a b} {
    return [expr {-[string compare $a $b]}]
  }
  proc c2 {a b} {
    return [expr {-[string compare [string tolower $a] [string tolower $b]]}]
  }
  db collate c1 c1
  db collate c2 c2
  execsql {
    CREATE TABLE t2(
      a TEXT PRIMARY KEY COLLATE c1,
      b TEXT UNIQUE COLLATE c2,
      c TEXT COLLATE nocase,
      d TEST COLLATE binary
    );
    INSERT INTO t2 VALUES('abc','abc','abc','abc');
    INSERT INTO t2 VALUES('ABCD','ABCD','ABCD','ABCD');
    INSERT INTO t2 VALUES('bcd','bcd','bcd','bcd');
    INSERT INTO t2 VALUES('BCDE','BCDE','BCDE','BCDE');
    SELECT a FROM t2 ORDER BY a;
  }
} {bcd abc BCDE ABCD}
do_test reindex-2.2 {
  execsql {
    SELECT b FROM t2 ORDER BY b;
  }
} {BCDE bcd ABCD abc}
do_test reindex-2.3 {
  execsql {
    SELECT c FROM t2 ORDER BY c;
  }
} {abc ABCD bcd BCDE}
do_test reindex-2.4 {
  execsql {
    SELECT d FROM t2 ORDER BY d;
  }
} {ABCD BCDE abc bcd}

# Change a collating sequence function.  Verify that REINDEX rebuilds
# the index.
#
do_test reindex-2.5 {
  proc c1 {a b} {
    return [string compare $a $b]
  }
  execsql {
    SELECT a FROM t2 ORDER BY a;
  }
} {bcd abc BCDE ABCD}
ifcapable {integrityck} {
  do_test reindex-2.5.1 {
    string equal ok [execsql {PRAGMA integrity_check}]
  } {0}
}
do_test reindex-2.6 {
  execsql {
    REINDEX c2;
    SELECT a FROM t2 ORDER BY a;
  }
} {bcd abc BCDE ABCD}
do_test reindex-2.7 {
  execsql {
    REINDEX t1;
    SELECT a FROM t2 ORDER BY a;
  }
} {bcd abc BCDE ABCD}
do_test reindex-2.8 {
  execsql {
    REINDEX c1;
    SELECT a FROM t2 ORDER BY a;
  }
} {ABCD BCDE abc bcd}
integrity_check reindex-2.8.1

# Try to REINDEX an index for which the collation sequence is not available.
#
do_test reindex-3.1 {
  sqlite3 db2 test.db
  catchsql {
    REINDEX c1;
  } db2
} {1 {no such collation sequence: c1}}
do_test reindex-3.2 {
  proc need_collate {collation} {
    db2 collate c1 c1
  }
  db2 collation_needed need_collate
  catchsql {
    REINDEX c1;
  } db2
} {0 {}}
do_test reindex-3.3 {
  catchsql {
    REINDEX;
  } db2
} {1 {no such collation sequence: c2}}

do_test reindex-3.99 {
  db2 close
} {}

#-------------------------------------------------------------------------
foreach {tn wo} {1 "" 2 "WITHOUT ROWID"} {
  reset_db
  eval [string map [list %without_rowid% $wo] {
    do_execsql_test 4.$tn.0 {
      CREATE TABLE t0 (
        c0 INTEGER PRIMARY KEY DESC, 
        c1 UNIQUE DEFAULT NULL
      ) %without_rowid% ;
      INSERT INTO t0(c0) VALUES (1), (2), (3), (4), (5);
      SELECT c0 FROM t0 WHERE c1 IS NULL ORDER BY 1;
    } {1 2 3 4 5}
    
    do_execsql_test 4.$tn.1 {
      REINDEX;
    }
    
    do_execsql_test 4.$tn.2 {
      SELECT c0 FROM t0 WHERE c1 IS NULL ORDER BY 1;
    } {1 2 3 4 5}

    do_execsql_test 4.$tn.3 {
      SELECT c0 FROM t0 WHERE c1 IS NULL AND c0 IN (1,2,3,4,5);
    } {1 2 3 4 5}

    do_execsql_test 4.$tn.4 {
      PRAGMA integrity_check;
    } {ok}
  }]
}



finish_test
