# 2001 October 12
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
# focus of this file is testing for correct handling of I/O errors
# such as writes failing because the disk is full.
# 
# The tests in this file use special facilities that are only
# available in the SQLite test fixture.
#
# $Id: autovacuum_ioerr2.test,v 1.7 2008/07/12 14:52:20 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If this build of the library does not support auto-vacuum, omit this
# whole file.
ifcapable {!autovacuum} {
  finish_test
  return
}

do_ioerr_test autovacuum-ioerr2-1 -sqlprep {
  PRAGMA auto_vacuum = 1;
  CREATE TABLE abc(a);
  INSERT INTO abc VALUES(randstr(1500,1500));
} -sqlbody {
  CREATE TABLE abc2(a);
  BEGIN;
  DELETE FROM abc;
  INSERT INTO abc VALUES(randstr(1500,1500));
  CREATE TABLE abc3(a);
  COMMIT;
}

do_ioerr_test autovacuum-ioerr2-2 -tclprep {
  execsql {
    PRAGMA auto_vacuum = 1;
    PRAGMA cache_size = 10;
    BEGIN;
    CREATE TABLE abc(a);
    INSERT INTO abc VALUES(randstr(1100,1100)); -- Page 4 is overflow
    INSERT INTO abc VALUES(randstr(1100,1100)); -- Page 5 is overflow
  }
  for {set i 0} {$i<150} {incr i} {
    execsql {
      INSERT INTO abc VALUES(randstr(100,100)); 
    }
  }
  execsql COMMIT
} -sqlbody {
  BEGIN;
  DELETE FROM abc WHERE length(a)>100;
  UPDATE abc SET a = randstr(90,90);
  CREATE TABLE abc3(a);
  COMMIT;
}

do_ioerr_test autovacuum-ioerr2-3 -sqlprep {
  PRAGMA auto_vacuum = 1;
  CREATE TABLE abc(a);
  CREATE TABLE abc2(b);
} -sqlbody {
  BEGIN;
  INSERT INTO abc2 VALUES(10);
  DROP TABLE abc;
  COMMIT;
  DROP TABLE abc2;
}

forcedelete backup.db
ifcapable subquery {
  do_ioerr_test autovacuum-ioerr2-4 -tclprep {
    if {![file exists backup.db]} {
      sqlite3 dbb backup.db 
      execsql {
        PRAGMA auto_vacuum = 1;
        BEGIN;
        CREATE TABLE abc(a);
        INSERT INTO abc VALUES(randstr(1100,1100)); -- Page 4 is overflow
        INSERT INTO abc VALUES(randstr(1100,1100)); -- Page 5 is overflow
      } dbb
      for {set i 0} {$i<2500} {incr i} {
        execsql {
          INSERT INTO abc VALUES(randstr(100,100)); 
        } dbb
      }
      execsql {
        COMMIT;
        PRAGMA cache_size = 10;
      } dbb
      dbb close
    }
    db close
    forcedelete test.db
    forcedelete test.db-journal
    forcecopy backup.db test.db
    set ::DB [sqlite3 db test.db]
    execsql {
      PRAGMA cache_size = 10;
    }
  } -sqlbody {
    BEGIN;
    DELETE FROM abc WHERE oid < 3;
    UPDATE abc SET a = randstr(100,100) WHERE oid > 2300;
    UPDATE abc SET a = randstr(1100,1100) WHERE oid = 
        (select max(oid) from abc);
    COMMIT;
  }
}

do_ioerr_test autovacuum-ioerr2-1 -sqlprep {
  PRAGMA auto_vacuum = 1;
  CREATE TABLE abc(a);
  INSERT INTO abc VALUES(randstr(1500,1500));
} -sqlbody {
  CREATE TABLE abc2(a);
  BEGIN;
  DELETE FROM abc;
  INSERT INTO abc VALUES(randstr(1500,1500));
  CREATE TABLE abc3(a);
  COMMIT;
}

finish_test
