# 2013-06-05
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
# This file contains test cases that were contributed on the sqlite-users
# mailing list on 2013-06-05 by Mi Chen at mi.chen@echostar.com.
#
# At the time it was contributed, this test failed on trunk, but 
# worked on the NGQP.

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# Build some test data
#
do_test contrib01-1.0 {
  db eval {
    CREATE TABLE T1 (B INTEGER NOT NULL,
                     C INTEGER NOT NULL,
                     D INTEGER NOT NULL,
                     E INTEGER NOT NULL,
                     F INTEGER NOT NULL,
                     G INTEGER NOT NULL,
                     H INTEGER NOT NULL,
                     PRIMARY KEY (B, C, D));
    
    CREATE TABLE T2 (A INTEGER NOT NULL,
                     B INTEGER NOT NULL,
                     C INTEGER NOT NULL,
                     PRIMARY KEY (A, B, C));
    
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15527);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15560);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15561);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15563);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15564);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15566);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15567);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15569);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15612);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15613);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15638);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15681);
    INSERT INTO T2(A, B, C) VALUES(702118,16183,15682);
    
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15527,6,0,5,5,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15560,6,0,5,2,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15561,6,0,5,2,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15563,6,0,5,2,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15564,6,0,5,2,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15566,6,0,5,2,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15567,6,0,5,2,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15569,6,0,5,2,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15612,6,0,5,5,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15613,6,0,5,2,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15638,6,0,5,2,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15681,6,0,5,5,0);
    INSERT INTO T1(B, C, D, E, F, G, H) VALUES(16183,15682,6,0,5,2,0);
  }
} {}
do_test contrib01-1.1 {
  db eval {
    SELECT T2.A, T2.B, T1.D, T1.E, T1.F, T1.G, T1.H, MAX(T1.C), '^'
      FROM T1, T2
     WHERE T1.B = T2.B
       AND T1.C = T2.C
     GROUP BY T2.A, T2.B, T1.D, T1.E, T1.F, T1.G, T1.H
     ORDER BY +max(t1.c);
  }
} {702118 16183 6 0 5 5 0 15681 ^ 702118 16183 6 0 5 2 0 15682 ^}
do_test contrib01-1.2 {
  db eval {
   SELECT T2.A, T2.B, T1.D, T1.E, T1.F, T1.G, T1.H, MAX(T1.C), '^'
     FROM T1, T2
    WHERE T1.B = T2.B
      AND T1.C = T2.C
    GROUP BY T2.A, T2.B, T1.F, T1.D, T1.E, T1.G, T1.H
    ORDER BY +max(t1.c);
  }
} {702118 16183 6 0 5 5 0 15681 ^ 702118 16183 6 0 5 2 0 15682 ^}

finish_test
