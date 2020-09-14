# 2010 February 21
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
# This file implements a test of ticket [da1151f97df244a1]:  An
# assertion fault while VACUUMing an auto_vacuumed database with
# large schema.
#

set testdir [file dirname $argv0]
source $testdir/tester.tcl

# If the VACUUM statement is disabled in the current build, skip all
# the tests in this file.
#
ifcapable !vacuum {
  finish_test
  return
}

do_test vacuum4-1.1 {
  db eval {
    PRAGMA auto_vacuum=FULL;
    CREATE TABLE t1(
      c000, c001, c002, c003, c004, c005, c006, c007, c008, c009,
      c010, c011, c012, c013, c014, c015, c016, c017, c018, c019,
      c020, c021, c022, c023, c024, c025, c026, c027, c028, c029,
      c030, c031, c032, c033, c034, c035, c036, c037, c038, c039,
      c040, c041, c042, c043, c044, c045, c046, c047, c048, c049,
      c050, c051, c052, c053, c054, c055, c056, c057, c058, c059,
      c060, c061, c062, c063, c064, c065, c066, c067, c068, c069,
      c070, c071, c072, c073, c074, c075, c076, c077, c078, c079,
      c080, c081, c082, c083, c084, c085, c086, c087, c088, c089,
      c090, c091, c092, c093, c094, c095, c096, c097, c098, c099,
      c100, c101, c102, c103, c104, c105, c106, c107, c108, c109,
      c110, c111, c112, c113, c114, c115, c116, c117, c118, c119,
      c120, c121, c122, c123, c124, c125, c126, c127, c128, c129,
      c130, c131, c132, c133, c134, c135, c136, c137, c138, c139,
      c140, c141, c142, c143, c144, c145, c146, c147, c148, c149
    );
    CREATE TABLE t2(
      c000, c001, c002, c003, c004, c005, c006, c007, c008, c009,
      c010, c011, c012, c013, c014, c015, c016, c017, c018, c019,
      c020, c021, c022, c023, c024, c025, c026, c027, c028, c029,
      c030, c031, c032, c033, c034, c035, c036, c037, c038, c039,
      c040, c041, c042, c043, c044, c045, c046, c047, c048, c049,
      c050, c051, c052, c053, c054, c055, c056, c057, c058, c059,
      c060, c061, c062, c063, c064, c065, c066, c067, c068, c069,
      c070, c071, c072, c073, c074, c075, c076, c077, c078, c079,
      c080, c081, c082, c083, c084, c085, c086, c087, c088, c089,
      c090, c091, c092, c093, c094, c095, c096, c097, c098, c099,
      c100, c101, c102, c103, c104, c105, c106, c107, c108, c109,
      c110, c111, c112, c113, c114, c115, c116, c117, c118, c119,
      c120, c121, c122, c123, c124, c125, c126, c127, c128, c129,
      c130, c131, c132, c133, c134, c135, c136, c137, c138, c139,
      c140, c141, c142, c143, c144, c145, c146, c147, c148, c149
    );
    VACUUM;
  }
} {}

finish_test
