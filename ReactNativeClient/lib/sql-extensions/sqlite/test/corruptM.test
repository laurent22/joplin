# 2019-08-12
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
# Check to ensure that the type, name, and tbl_name fields of the
# sqlite_master table are validated and errors are reported if they
# are inconsistent with the sql.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
set testprefix corruptM

# These tests deal with corrupt database files
#
database_may_be_corrupt

proc open_db2_and_catchsql {sql} {
  set rc [catch { sqlite3 db2 test.db } msg]
  if {$rc} {
    return [list $rc $msg]
  }
  set res [catchsql $sql db2]
  db2 close
  set res
}

db close
forcedelete test.db
sqlite3 db test.db
do_execsql_test corruptM-100 {
  CREATE TABLE t1(a,b,c);
  INSERT INTO t1 VALUES(111,222,333);
  CREATE INDEX i1 ON t1(b);
  CREATE VIEW v2 AS SELECT 15,22;
  CREATE TRIGGER r1 AFTER INSERT ON t1 BEGIN SELECT 5; END;
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 t1 | index i1 t1 | view v2 v2 | trigger r1 t1 |}
do_execsql_test corruptM-101 {
  PRAGMA writable_schema=on;
  UPDATE sqlite_master SET tbl_name=NULL WHERE name='t1';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 {} | index i1 t1 | view v2 v2 | trigger r1 t1 |}
do_test corruptM-102 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
  }
} {1 {malformed database schema (t1)}}

do_execsql_test corruptM-110 {
  UPDATE sqlite_master SET tbl_name='tx' WHERE name='t1';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 tx | index i1 t1 | view v2 v2 | trigger r1 t1 |}
do_test corruptM-111 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
  }
} {1 {malformed database schema (t1)}}
do_execsql_test corruptM-112 {
  UPDATE sqlite_master SET tbl_name='t1', type='tabl' WHERE name='t1';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {tabl t1 t1 | index i1 t1 | view v2 v2 | trigger r1 t1 |}
do_test corruptM-113 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
  }
} {1 {malformed database schema (t1)}}
do_execsql_test corruptM-114 {
  UPDATE sqlite_master SET tbl_name='t9',type='table',name='t9'WHERE name='t1';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t9 t9 | index i1 t1 | view v2 v2 | trigger r1 t1 |}
do_test corruptM-114 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
  }
} {1 {malformed database schema (t9)}}

do_execsql_test corruptM-120 {
  UPDATE sqlite_master SET name='t1',tbl_name='T1' WHERE name='t9';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 T1 | index i1 t1 | view v2 v2 | trigger r1 t1 |}
do_test corruptM-121 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
    SELECT * FROM t1, v2;
  } 
} {0 {ok 111 222 333 15 22}}

do_execsql_test corruptM-130 {
  UPDATE sqlite_master SET type='view' WHERE name='t1';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {view t1 T1 | index i1 t1 | view v2 v2 | trigger r1 t1 |}
do_test corruptM-131 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
    SELECT * FROM t1, v2;
  }
} {1 {malformed database schema (t1)}}

do_execsql_test corruptM-140 {
  UPDATE sqlite_master SET type='table', tbl_name='t1' WHERE name='t1';
  UPDATE sqlite_master SET tbl_name='tx' WHERE name='i1';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 t1 | index i1 tx | view v2 v2 | trigger r1 t1 |}
do_test corruptM-141 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
    SELECT * FROM t1, v2;
  }
} {1 {malformed database schema (i1)}}

do_execsql_test corruptM-150 {
  UPDATE sqlite_master SET type='table', tbl_name='t1' WHERE name='i1';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 t1 | table i1 t1 | view v2 v2 | trigger r1 t1 |}
do_test corruptM-151 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
    SELECT * FROM t1, v2;
  }
} {1 {malformed database schema (i1)}}

do_execsql_test corruptM-160 {
  UPDATE sqlite_master SET type='view', tbl_name='t1' WHERE name='i1';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 t1 | view i1 t1 | view v2 v2 | trigger r1 t1 |}
do_test corruptM-161 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
    SELECT * FROM t1, v2;
  }
} {1 {malformed database schema (i1)}}

do_execsql_test corruptM-170 {
  UPDATE sqlite_master SET type='index', tbl_name='t1' WHERE name='i1';
  UPDATE sqlite_master SET type='table', tbl_name='v2' WHERE name='v2';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 t1 | index i1 t1 | table v2 v2 | trigger r1 t1 |}
do_test corruptM-171 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
    SELECT * FROM t1, v2;
  }
} {1 {malformed database schema (v2)}}

do_execsql_test corruptM-180 {
  UPDATE sqlite_master SET type='view',name='v3',tbl_name='v3' WHERE name='v2';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 t1 | index i1 t1 | view v3 v3 | trigger r1 t1 |}
do_test corruptM-181 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
    SELECT * FROM t1, v2;
  }
} {1 {malformed database schema (v3)}}

do_execsql_test corruptM-190 {
  UPDATE sqlite_master SET type='view',name='v2',tbl_name='v2' WHERE name='v3';
  UPDATE sqlite_master SET type='view' WHERE name='r1';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 t1 | index i1 t1 | view v2 v2 | view r1 t1 |}
do_test corruptM-191 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
    SELECT * FROM t1, v2;
  }
} {1 {malformed database schema (r1)}}
do_execsql_test corruptM-192 {
  UPDATE sqlite_master SET type='trigger',tbl_name='v2' WHERE name='r1';
  SELECT type, name, tbl_name, '|' FROM sqlite_master;
} {table t1 t1 | index i1 t1 | view v2 v2 | trigger r1 v2 |}
do_test corruptM-193 {
  open_db2_and_catchsql {
    PRAGMA quick_check;
    SELECT * FROM t1, v2;
  }
} {1 {malformed database schema (r1)}}

finish_test
