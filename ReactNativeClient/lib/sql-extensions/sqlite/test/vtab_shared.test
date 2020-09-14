# 2007 April 16
#
# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
# This file tests interactions between the virtual table and
# shared-schema functionality.
#
# $Id: vtab_shared.test,v 1.3 2009/07/24 17:58:53 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix vtab_shared

ifcapable !vtab||!shared_cache {
  finish_test
  return
}

db close
sqlite3_enable_shared_cache 1
sqlite3 db  test.db
sqlite3 db2 test.db

do_test vtab_shared-1.1 {
  register_echo_module [sqlite3_connection_pointer db]
  execsql {
    CREATE TABLE t0(a, b, c);
    INSERT INTO t0 VALUES(1, 2, 3);
    CREATE VIRTUAL TABLE t1 USING echo(t0);
  }
} {}

do_test vtab_shared-1.2 {
  execsql { SELECT * FROM t1 } db
} {1 2 3}

# Fails because the 'echo' module has not been registered with connection db2
do_test vtab_shared-1.3 {
  catchsql { SELECT * FROM t1 } db2
} {1 {no such module: echo}}

do_test vtab_shared-1.4 {
  execsql { SELECT * FROM t0 } db2
} {1 2 3}

do_test vtab_shared-1.5 {
  register_echo_module [sqlite3_connection_pointer db2]
  execsql { SELECT * FROM t1 } db
} {1 2 3}

# Works after the module is registered with db2
do_test vtab_shared-1.6 {
  execsql { SELECT * FROM t1 } db2
} {1 2 3}

# Set a write-lock on table t0 using connection [db]. Then try to read from
# virtual table t1 using [db2]. That this returns an SQLITE_LOCKED error
# shows that the correct sqlite3_vtab is being used.
#
do_test vtab_shared-1.8.1 {
  execsql { 
    BEGIN;
    INSERT INTO t1 VALUES(4, 5, 6);
    SELECT * FROM t1;
  }
} {1 2 3 4 5 6}
do_test vtab_shared-1.8.2 {
  catchsql { SELECT * FROM t1 } db2
} {1 {database table is locked}}
do_test vtab_shared-1.8.3 {
  catchsql { SELECT *  FROM t0 } db2
} {1 {database table is locked: t0}}
do_test vtab_shared-1.8.4 {
  execsql { SELECT * FROM t0 } db
} {1 2 3 4 5 6}
do_test vtab_shared-1.8.5 {
  execsql { COMMIT } db
  execsql { SELECT *  FROM t1 } db2
} {1 2 3 4 5 6}

# While a SELECT is active on virtual table t1 via connection [db], close 
# [db2]. This causes the schema to be reset internally. Verify that this
# does not cause a problem.
#
foreach {iTest dbSelect dbClose} {
  1 db  db2
  2 db  db2
  3 db2 db
} {
  do_test vtab_shared-1.9.$iTest {
    set res [list]
    $dbSelect eval { SELECT * FROM t1 } {
      if {$a == 1} {$dbClose close}
      lappend res $a $b $c
    }
    sqlite3 $dbClose test.db
    register_echo_module [sqlite3_connection_pointer $dbClose]
    set res
  } {1 2 3 4 5 6}
}

# Ensure that it is not possible for one connection to DROP a virtual
# table while a second connection is reading from the database.
#
do_test vtab_shared-1.10 {
  db eval { SELECT * FROM t1 } {
    set error [catchsql { DROP TABLE t1 } db2]
    break
  }
  set error
} {1 {database table is locked: sqlite_master}}

do_test vtab_shared-1.11 {
  execsql {
    CREATE VIRTUAL TABLE t2 USING echo(t0);
    CREATE VIRTUAL TABLE t3 USING echo(t0);
  }
  execsql { SELECT * FROM t3 } db2
} {1 2 3 4 5 6}

ifcapable compound {
  do_test vtab_shared-1.12.1 {
    db close
    execsql { 
      SELECT * FROM t1 UNION ALL
      SELECT * FROM t2 UNION ALL
      SELECT * FROM t3 
    } db2
  } {1 2 3 4 5 6 1 2 3 4 5 6 1 2 3 4 5 6}
  do_test vtab_shared-1.12.2 {
    sqlite3 db test.db
    register_echo_module [sqlite3_connection_pointer db]
    execsql { 
      SELECT * FROM t1 UNION ALL
      SELECT * FROM t2 UNION ALL
      SELECT * FROM t3 
    } db
  } {1 2 3 4 5 6 1 2 3 4 5 6 1 2 3 4 5 6}
}

# Try a rename or two.
#
ifcapable altertable {
  do_test vtab_shared-1.13.1 {
    execsql { ALTER TABLE t1 RENAME TO t4 }
    execsql { SELECT * FROM t4 } db
  } {1 2 3 4 5 6}
  do_test vtab_shared-1.13.2 {
    execsql { SELECT * FROM t4 } db2
  } {1 2 3 4 5 6}
  do_test vtab_shared-1.13.3 {
    execsql { ALTER TABLE t2 RENAME TO t5 }
    execsql { SELECT * FROM t4 } db2
  } {1 2 3 4 5 6}
}

# Try an UPDATE/INSERT/DELETE on a shared vtab as the first statement after a
# schema is loaded.
do_test vtab_shared_1.14.1 {
  db2 close
  sqlite3 db2 test.db
  register_echo_module [sqlite3_connection_pointer db2]
  execsql { SELECT * FROM t3 }
} {1 2 3 4 5 6}
do_test vtab_shared_1.14.2 {
  execsql { 
    UPDATE t3 SET c = 'six' WHERE c = 6;
    SELECT * FROM t3;
  } db2
} {1 2 3 4 5 six}
do_test vtab_shared_1.14.3 {
  db2 close
  sqlite3 db2 test.db
  register_echo_module [sqlite3_connection_pointer db2]
  execsql { SELECT * FROM t3 }
} {1 2 3 4 5 six}
do_test vtab_shared_1.14.4 {
  execsql { 
    DELETE FROM t3 WHERE c = 'six';
    SELECT * FROM t3;
  } db2
} {1 2 3}
do_test vtab_shared_1.14.5 {
  db2 close
  sqlite3 db2 test.db
  register_echo_module [sqlite3_connection_pointer db2]
  execsql { SELECT * FROM t3 }
} {1 2 3}
do_test vtab_shared_1.14.6 {
  execsql { 
    INSERT INTO t3 VALUES(4, 5, 6);
    SELECT * FROM t3;
  } db2
} {1 2 3 4 5 6}

do_test vtab_shared_1.15.1 {
  db2 close
  sqlite3 db2 test.db
  register_echo_module [sqlite3_connection_pointer db2]
  execsql { 
    UPDATE t3 SET c = 'six' WHERE c = 6;
    SELECT * FROM t3;
  } db2
} {1 2 3 4 5 six}
do_test vtab_shared_1.15.2 {
  db2 close
  sqlite3 db2 test.db
  register_echo_module [sqlite3_connection_pointer db2]
  execsql { 
    DELETE FROM t3 WHERE c = 'six';
    SELECT * FROM t3;
  } db2
} {1 2 3}
do_test vtab_shared_1.15.3 {
  db2 close
  sqlite3 db2 test.db
  register_echo_module [sqlite3_connection_pointer db2]
  execsql { 
    INSERT INTO t3 VALUES(4, 5, 6);
    SELECT * FROM t3;
  }
} {1 2 3 4 5 6}

db close
db2 close

#---------------------------------------------------------------
# Test calling sqlite3_close() with vtabs on the disconnect list.
#
ifcapable rtree {
  reset_db
  do_test 2.1.1 {
    sqlite3 db  test.db
    sqlite3 db2 test.db
  
    # Create a virtual table using [db]. 
    execsql {
      CREATE VIRTUAL TABLE rt USING rtree(id, x1, x2);
      INSERT INTO rt VALUES(1, 2 ,3);
      SELECT * FROM rt;
    }
  
    # Drop the virtual table using [db2]. The sqlite3_vtab object belonging
    # to [db] is moved to the sqlite3.pDisconnect list.
    execsql { DROP TABLE rt } db2
  
    # Immediately close [db]. At one point this would fail due to the 
    # unfinalized statements held by the un-xDisconnect()ed sqlite3_vtab.
    db close
  } {}
  db2 close
}

ifcapable fts3 {
  # Same test as above, except using fts3 instead of rtree.
  reset_db
  do_test 2.2.1 {
    sqlite3 db  test.db
    sqlite3 db2 test.db
    execsql {
      CREATE VIRTUAL TABLE ft USING fts3;
      INSERT INTO ft VALUES('hello world');
      SELECT * FROM ft;
    } 
    execsql { DROP TABLE ft } db2
    db close
  } {}
  db2 close
}

sqlite3_enable_shared_cache 0
finish_test
