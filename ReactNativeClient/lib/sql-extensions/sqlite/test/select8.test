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
# This file implements regression tests for SQLite library. 
#
# The focus of this file is testing that LIMIT and OFFSET work for
# unusual combinations SELECT statements.
#
# $Id: select8.test,v 1.1 2008/01/12 12:48:09 drh Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

execsql {
  CREATE TABLE songs(songid, artist, timesplayed);
  INSERT INTO songs VALUES(1,'one',1);
  INSERT INTO songs VALUES(2,'one',2);
  INSERT INTO songs VALUES(3,'two',3);
  INSERT INTO songs VALUES(4,'three',5);
  INSERT INTO songs VALUES(5,'one',7);
  INSERT INTO songs VALUES(6,'two',11);
}
set result [execsql {
  SELECT DISTINCT artist,sum(timesplayed) AS total      
  FROM songs      
  GROUP BY LOWER(artist)      
}]
do_test select8-1.1 {
  execsql {
    SELECT DISTINCT artist,sum(timesplayed) AS total      
    FROM songs      
    GROUP BY LOWER(artist)      
    LIMIT 1 OFFSET 1
  }
} [lrange $result 2 3]
do_test select8-1.2 {
  execsql {
    SELECT DISTINCT artist,sum(timesplayed) AS total      
    FROM songs      
    GROUP BY LOWER(artist)      
    LIMIT 2 OFFSET 1
  }
} [lrange $result 2 5]
do_test select8-1.3 {
  execsql {
    SELECT DISTINCT artist,sum(timesplayed) AS total      
    FROM songs      
    GROUP BY LOWER(artist)      
    LIMIT -1 OFFSET 2
  }
} [lrange $result 4 end]


finish_test
