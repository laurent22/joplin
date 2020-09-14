# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# Tests to make sure that value returned by last_insert_rowid() (LIRID)
# is updated properly, especially inside triggers
#
# Note 1: insert into table is now the only statement which changes LIRID
# Note 2: upon entry into before or instead of triggers,
#           LIRID is unchanged (rather than -1)
# Note 3: LIRID is changed within the context of a trigger,
#           but is restored once the trigger exits
# Note 4: LIRID is not changed by an insert into a view (since everything
#           is done within instead of trigger context)
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# ----------------------------------------------------------------------------
# 1.x - basic tests (no triggers)

# LIRID changed properly after an insert into a table
do_test lastinsert-1.1 {
    catchsql {
        create table t1 (k integer primary key);
        insert into t1 values (1);
        insert into t1 values (NULL);
        insert into t1 values (NULL);
        select last_insert_rowid();
    }
} {0 3}

# EVIDENCE-OF: R-47220-63683 The sqlite3_last_insert_rowid() function
# does not work for WITHOUT ROWID tables.
#
do_test lastinsert-1.1w {
    catchsql {
        create table t1w (k integer primary key) WITHOUT ROWID;
        insert into t1w values (123456);
        select last_insert_rowid(); -- returns 3 from above.
    }
} {0 3}

# LIRID unchanged after an update on a table
do_test lastinsert-1.2 {
    catchsql {
        update t1 set k=4 where k=2;
        select last_insert_rowid();
    }
} {0 3}

# LIRID unchanged after a delete from a table
do_test lastinsert-1.3 {
    catchsql {
        delete from t1 where k=4;
        select last_insert_rowid();
    }
} {0 3}

# LIRID unchanged after create table/view statements
do_test lastinsert-1.4.1 {
    catchsql {
        create table t2 (k integer primary key, val1, val2, val3);
        select last_insert_rowid();
    }
} {0 3}
ifcapable view {
do_test lastinsert-1.4.2 {
    catchsql {
        create view v as select * from t1;
        select last_insert_rowid();
    }
} {0 3}
} ;# ifcapable view

# All remaining tests involve triggers.  Skip them if triggers are not
# supported in this build.
#
ifcapable {!trigger} {
  finish_test
  return
}

# ----------------------------------------------------------------------------
# 2.x - tests with after insert trigger

# LIRID changed properly after an insert into table containing an after trigger
do_test lastinsert-2.1 {
    catchsql {
        delete from t2;
        create trigger r1 after insert on t1 for each row begin
            insert into t2 values (NEW.k*2, last_insert_rowid(), NULL, NULL);
            update t2 set k=k+10, val2=100+last_insert_rowid();
            update t2 set val3=1000+last_insert_rowid();
        end;
        insert into t1 values (13);
        select last_insert_rowid();
    }
} {0 13}

# LIRID equals NEW.k upon entry into after insert trigger
do_test lastinsert-2.2 {
    catchsql {
        select val1 from t2;
    }
} {0 13}

# LIRID changed properly by insert within context of after insert trigger
do_test lastinsert-2.3 {
    catchsql {
        select val2 from t2;
    }
} {0 126}

# LIRID unchanged by update within context of after insert trigger
do_test lastinsert-2.4 {
    catchsql {
        select val3 from t2;
    }
} {0 1026}

# ----------------------------------------------------------------------------
# 3.x - tests with after update trigger

# LIRID not changed after an update onto a table containing an after trigger
do_test lastinsert-3.1 {
    catchsql {
        delete from t2;
        drop trigger r1;
        create trigger r1 after update on t1 for each row begin
            insert into t2 values (NEW.k*2, last_insert_rowid(), NULL, NULL);
            update t2 set k=k+10, val2=100+last_insert_rowid();
            update t2 set val3=1000+last_insert_rowid();
        end;
        update t1 set k=14 where k=3;
        select last_insert_rowid();
    }
} {0 13}

# LIRID unchanged upon entry into after update trigger
do_test lastinsert-3.2 {
    catchsql {
        select val1 from t2;
    }
} {0 13}

# LIRID changed properly by insert within context of after update trigger
do_test lastinsert-3.3 {
    catchsql {
        select val2 from t2;
    }
} {0 128}

# LIRID unchanged by update within context of after update trigger
do_test lastinsert-3.4 {
    catchsql {
        select val3 from t2;
    }
} {0 1028}

# ----------------------------------------------------------------------------
# 4.x - tests with instead of insert trigger
# These may not be run if either views or triggers were disabled at 
# compile-time

ifcapable {view && trigger} {
# LIRID not changed after an insert into view containing an instead of trigger
do_test lastinsert-4.1 {
    catchsql {
        delete from t2;
        drop trigger r1;
        create trigger r1 instead of insert on v for each row begin
            insert into t2 values (NEW.k*2, last_insert_rowid(), NULL, NULL);
            update t2 set k=k+10, val2=100+last_insert_rowid();
            update t2 set val3=1000+last_insert_rowid();
        end;
        insert into v values (15);
        select last_insert_rowid();
    }
} {0 13}

# LIRID unchanged upon entry into instead of trigger
do_test lastinsert-4.2 {
    catchsql {
        select val1 from t2;
    }
} {0 13}

# LIRID changed properly by insert within context of instead of trigger
do_test lastinsert-4.3 {
    catchsql {
        select val2 from t2;
    }
} {0 130}

# LIRID unchanged by update within context of instead of trigger
do_test lastinsert-4.4 {
    catchsql {
        select val3 from t2;
    }
} {0 1030}
} ;# ifcapable (view && trigger)

# ----------------------------------------------------------------------------
# 5.x - tests with before delete trigger

# LIRID not changed after a delete on a table containing a before trigger
do_test lastinsert-5.1 {
    catchsql {
      drop trigger r1;  -- This was not created if views are disabled.
    }
    catchsql {
        delete from t2;
        create trigger r1 before delete on t1 for each row begin
            insert into t2 values (77, last_insert_rowid(), NULL, NULL);
            update t2 set k=k+10, val2=100+last_insert_rowid();
            update t2 set val3=1000+last_insert_rowid();
        end;
        delete from t1 where k=1;
        select last_insert_rowid();
    }
} {0 13}

# LIRID unchanged upon entry into delete trigger
do_test lastinsert-5.2 {
    catchsql {
        select val1 from t2;
    }
} {0 13}

# LIRID changed properly by insert within context of delete trigger
do_test lastinsert-5.3 {
    catchsql {
        select val2 from t2;
    }
} {0 177}

# LIRID unchanged by update within context of delete trigger
do_test lastinsert-5.4 {
    catchsql {
        select val3 from t2;
    }
} {0 1077}

# ----------------------------------------------------------------------------
# 6.x - tests with instead of update trigger
# These tests may not run if either views or triggers are disabled.

ifcapable {view && trigger} {
# LIRID not changed after an update on a view containing an instead of trigger
do_test lastinsert-6.1 {
    catchsql {
        delete from t2;
        drop trigger r1;
        create trigger r1 instead of update on v for each row begin
            insert into t2 values (NEW.k*2, last_insert_rowid(), NULL, NULL);
            update t2 set k=k+10, val2=100+last_insert_rowid();
            update t2 set val3=1000+last_insert_rowid();
        end;
        update v set k=16 where k=14;
        select last_insert_rowid();
    }
} {0 13}

# LIRID unchanged upon entry into instead of trigger
do_test lastinsert-6.2 {
    catchsql {
        select val1 from t2;
    }
} {0 13}

# LIRID changed properly by insert within context of instead of trigger
do_test lastinsert-6.3 {
    catchsql {
        select val2 from t2;
    }
} {0 132}

# LIRID unchanged by update within context of instead of trigger
do_test lastinsert-6.4 {
    catchsql {
        select val3 from t2;
    }
} {0 1032}
} ;# ifcapable (view && trigger)

# ----------------------------------------------------------------------------
# 7.x - complex tests with temporary tables and nested instead of triggers
# These do not run if views or triggers are disabled.

ifcapable {trigger && view && tempdb} {
do_test lastinsert-7.1 {
    catchsql {
        drop table t1; drop table t2; drop trigger r1;
        create temp table t1 (k integer primary key);
        create temp table t2 (k integer primary key);
        create temp view v1 as select * from t1;
        create temp view v2 as select * from t2;
        create temp table rid (k integer primary key, rin, rout);
        insert into rid values (1, NULL, NULL);
        insert into rid values (2, NULL, NULL);
        create temp trigger r1 instead of insert on v1 for each row begin
            update rid set rin=last_insert_rowid() where k=1;
            insert into t1 values (100+NEW.k);
            insert into v2 values (100+last_insert_rowid());
            update rid set rout=last_insert_rowid() where k=1;
        end;
        create temp trigger r2 instead of insert on v2 for each row begin
            update rid set rin=last_insert_rowid() where k=2;
            insert into t2 values (1000+NEW.k);
            update rid set rout=last_insert_rowid() where k=2;
        end;
        insert into t1 values (77);
        select last_insert_rowid();
    }
} {0 77}

do_test lastinsert-7.2 {
    catchsql {
        insert into v1 values (5);
        select last_insert_rowid();
    }
} {0 77}

do_test lastinsert-7.3 {
    catchsql {
        select rin from rid where k=1;
    }
} {0 77}

do_test lastinsert-7.4 {
    catchsql {
        select rout from rid where k=1;
    }
} {0 105}

do_test lastinsert-7.5 {
    catchsql {
        select rin from rid where k=2;
    }
} {0 105}

do_test lastinsert-7.6 {
    catchsql {
        select rout from rid where k=2;
    }
} {0 1205}

do_test lastinsert-8.1 {
  db close
  sqlite3 db test.db
  execsql {
    CREATE TABLE t2(x INTEGER PRIMARY KEY, y);
    CREATE TABLE t3(a, b);
    CREATE TRIGGER after_t2 AFTER INSERT ON t2 BEGIN
      INSERT INTO t3 VALUES(new.x, new.y);
    END;
    INSERT INTO t2 VALUES(5000000000, 1);
    SELECT last_insert_rowid();
  }
} 5000000000

do_test lastinsert-9.1 {
  db eval {INSERT INTO t2 VALUES(123456789012345,0)}
  db last_insert_rowid
} {123456789012345}


} ;# ifcapable (view && trigger)

finish_test
