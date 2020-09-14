# 2009 December 29
#
# The author disclaims copyright to this source code.  In place of
# a legal notice', here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# Verify that when columns named "rowid", "oid", and "_rowid_" appear
# in a table as ordinary columns (not as the INTEGER PRIMARY KEY) then
# the use of these columns in triggers will refer to the column and not
# to the actual ROWID.  Ticket [34d2ae1c6d08b5271ba5e5592936d4a1d913ffe3]
#
# Also, verify that triggers created like this:
#
#    CREATE TRIGGER attached.trig AFTER INSERT ON attached.tab ...
#
# can be reparsed as a main database.  Ticket [d6ddba6706353915ceedc56b4e3]
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable {!trigger} {
  finish_test
  return
}

# Triggers on tables where the table has ordinary columns named
# rowid, oid, and _rowid_.
#
do_test triggerD-1.1 {
  db eval {
    CREATE TABLE t1(rowid, oid, _rowid_, x);
    CREATE TABLE log(a,b,c,d,e);
    CREATE TRIGGER r1 BEFORE INSERT ON t1 BEGIN
      INSERT INTO log VALUES('r1', new.rowid, new.oid, new._rowid_, new.x);
    END;
    CREATE TRIGGER r2 AFTER INSERT ON t1 BEGIN
      INSERT INTO log VALUES('r2', new.rowid, new.oid, new._rowid_, new.x);
    END;
    CREATE TRIGGER r3 BEFORE UPDATE ON t1 BEGIN
      INSERT INTO log VALUES('r3.old', old.rowid, old.oid, old._rowid_, old.x);
      INSERT INTO log VALUES('r3.new', new.rowid, new.oid, new._rowid_, new.x);
    END;
    CREATE TRIGGER r4 AFTER UPDATE ON t1 BEGIN
      INSERT INTO log VALUES('r4.old', old.rowid, old.oid, old._rowid_, old.x);
      INSERT INTO log VALUES('r4.new', new.rowid, new.oid, new._rowid_, new.x);
    END;
    CREATE TRIGGER r5 BEFORE DELETE ON t1 BEGIN
      INSERT INTO log VALUES('r5', old.rowid, old.oid, old._rowid_, old.x);
    END;
    CREATE TRIGGER r6 AFTER DELETE ON t1 BEGIN
      INSERT INTO log VALUES('r6', old.rowid, old.oid, old._rowid_, old.x);
    END;
  }
} {}
do_test triggerD-1.2 {
  db eval {
    INSERT INTO t1 VALUES(100,200,300,400);
    SELECT * FROM log
  }
} {r1 100 200 300 400 r2 100 200 300 400}
do_test triggerD-1.3 {
  db eval {
    DELETE FROM log;
    UPDATE t1 SET rowid=rowid+1;
    SELECT * FROM log
  }
} {r3.old 100 200 300 400 r3.new 101 200 300 400 r4.old 100 200 300 400 r4.new 101 200 300 400}
do_test triggerD-1.4 {
  db eval {
    DELETE FROM log;
    DELETE FROM t1;
    SELECT * FROM log
  }
} {r5 101 200 300 400 r6 101 200 300 400}

# Triggers on tables where the table does not have ordinary columns named
# rowid, oid, and _rowid_.
#
do_test triggerD-2.1 {
  db eval {
    DROP TABLE t1;
    CREATE TABLE t1(w,x,y,z);
    CREATE TRIGGER r1 BEFORE INSERT ON t1 BEGIN
      INSERT INTO log VALUES('r1', new.rowid, new.oid, new._rowid_, new.x);
    END;
    CREATE TRIGGER r2 AFTER INSERT ON t1 BEGIN
      INSERT INTO log VALUES('r2', new.rowid, new.oid, new._rowid_, new.x);
    END;
    CREATE TRIGGER r3 BEFORE UPDATE ON t1 BEGIN
      INSERT INTO log VALUES('r3.old', old.rowid, old.oid, old._rowid_, old.x);
      INSERT INTO log VALUES('r3.new', new.rowid, new.oid, new._rowid_, new.x);
    END;
    CREATE TRIGGER r4 AFTER UPDATE ON t1 BEGIN
      INSERT INTO log VALUES('r4.old', old.rowid, old.oid, old._rowid_, old.x);
      INSERT INTO log VALUES('r4.new', new.rowid, new.oid, new._rowid_, new.x);
    END;
    CREATE TRIGGER r5 BEFORE DELETE ON t1 BEGIN
      INSERT INTO log VALUES('r5', old.rowid, old.oid, old._rowid_, old.x);
    END;
    CREATE TRIGGER r6 AFTER DELETE ON t1 BEGIN
      INSERT INTO log VALUES('r6', old.rowid, old.oid, old._rowid_, old.x);
    END;
  }
} {}
do_test triggerD-2.2 {
  db eval {
    DELETE FROM log;
    INSERT INTO t1 VALUES(100,200,300,400);
    SELECT * FROM log;
  }
} {r1 -1 -1 -1 200 r2 1 1 1 200}
do_test triggerD-2.3 {
  db eval {
    DELETE FROM log;
    UPDATE t1 SET x=x+1;
    SELECT * FROM log
  }
} {r3.old 1 1 1 200 r3.new 1 1 1 201 r4.old 1 1 1 200 r4.new 1 1 1 201}
do_test triggerD-2.4 {
  db eval {
    DELETE FROM log;
    DELETE FROM t1;
    SELECT * FROM log
  }
} {r5 1 1 1 201 r6 1 1 1 201}


###########################################################################
#
# Ticket [985771e1161200ae5eac3162686ea6711c035d08]:
#
# When both a main database table and a TEMP table have the same name,
# and a main database trigge is created on the main table, the trigger
# is incorrectly bound to the TEMP table. For example:
#
#   CREATE TABLE t1(x);
#   CREATE TEMP TABLE t1(x);
#   CREATE TABLE t2(z);
#   CREATE TRIGGER main.r1 AFTER INSERT ON t1 BEGIN
#     INSERT INTO t2 VALUES(10000 + new.x);
#   END;
#   INSERT INTO main.t1 VALUES(3);
#   INSERT INTO temp.t1 VALUES(4);
#   SELECT * FROM t2;
# 
# The r1 trigger fires when the value 4 is inserted into the temp.t1
# table, rather than when value 3 is inserted into main.t1.
#
do_test triggerD-3.1 {
  db eval {
    CREATE TABLE t300(x);
    CREATE TEMP TABLE t300(x);
    CREATE TABLE t301(y);
    CREATE TRIGGER main.r300 AFTER INSERT ON t300 BEGIN
      INSERT INTO t301 VALUES(10000 + new.x);
    END;
    INSERT INTO main.t300 VALUES(3);
    INSERT INTO temp.t300 VALUES(4);
    SELECT * FROM t301;
  }
} {10003}
do_test triggerD-3.2 {
  db eval {
    DELETE FROM t301;
    CREATE TRIGGER temp.r301 AFTER INSERT ON t300 BEGIN
      INSERT INTO t301 VALUES(20000 + new.x);
    END;
    INSERT INTO main.t300 VALUES(3);
    INSERT INTO temp.t300 VALUES(4);
    SELECT * FROM t301;
  }
} {10003 20004}


#############################################################################
# 
# Ticket [d6ddba6706353915ceedc56b4e3e72ecb4d77ba4]
#
# The following syntax really should not be allowed:
#
#    CREATE TRIGGER xyz.trig BEFORE UPDATE ON xyz.tab BEGIN ...
#
# But a long-standing bug does allow it.  And the "xyz.tab" slips into
# the sqlite_master table.  We cannot fix the bug simply by disallowing
# "xyz.tab" since that could break legacy applications.  We have to 
# fix the system so that the "xyz." on "xyz.tab" is ignored.
# Verify that this is the case.
#
do_test triggerD-4.1 {
  db close
  forcedelete test.db test2.db
  sqlite3 db test.db
  db eval {
    CREATE TABLE t1(x);
    ATTACH 'test2.db' AS db2;
    CREATE TABLE db2.t2(y);
    CREATE TABLE db2.log(z);
    CREATE TRIGGER db2.trig AFTER INSERT ON db2.t2 BEGIN
      INSERT INTO log(z) VALUES(new.y);
    END;
    INSERT INTO t2 VALUES(123);
    SELECT * FROM log;
  }
} {123}
do_test triggerD-4.2 {
  sqlite3 db2 test2.db
  db2 eval {
    INSERT INTO t2 VALUES(234);
    SELECT * FROM log;
  }
} {123 234}
db2 close

finish_test
