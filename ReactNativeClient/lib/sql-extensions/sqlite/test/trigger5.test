# The author disclaims copyright to this source code.  In place of
# a legal notice, here is a blessing:
#
#    May you do good and not evil.
#    May you find forgiveness for yourself and forgive others.
#    May you share freely, never taking more than you give.
#
#***********************************************************************
#
# This file tests the triggers of views.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl
ifcapable {!trigger} {
  finish_test
  return
}

# Ticket #844
#
do_test trigger5-1.1 {
  execsql {
    CREATE TABLE Item(
       a integer PRIMARY KEY NOT NULL ,
       b double NULL ,
       c int NOT NULL DEFAULT 0
    );
    CREATE TABLE Undo(UndoAction TEXT);
    INSERT INTO Item VALUES (1,38205.60865,340);
    CREATE TRIGGER trigItem_UNDO_AD AFTER DELETE ON Item FOR EACH ROW
    BEGIN
      INSERT INTO Undo SELECT 'INSERT INTO Item (a,b,c) VALUES ('
       || coalesce(old.a,'NULL') || ',' || quote(old.b) || ',' || old.c || ');';
    END;
    DELETE FROM Item WHERE a = 1;
    SELECT * FROM Undo;
  }
} {{INSERT INTO Item (a,b,c) VALUES (1,38205.60865,340);}}

integrity_check trigger5-99.9

finish_test
