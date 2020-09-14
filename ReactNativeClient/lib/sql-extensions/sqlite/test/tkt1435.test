# 2005 September 17
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
# This file implements tests to verify that ticket #1435 has been
# fixed.  
#
#
# $Id: tkt1435.test,v 1.2 2006/01/17 09:35:02 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !memorydb {
  finish_test
  return
}

# Construct the sample database.
#
do_test tkt1435-1.0 {
  sqlite3 db :memory:
  execsql {
    CREATE TABLE Instances(
    	instanceId INTEGER PRIMARY KEY,
    	troveName STR,
    	versionId INT,
    	flavorId INT,
    	timeStamps STR,
    	isPresent INT,
    	pinned BOOLEAN
    );
    INSERT INTO "Instances"
       VALUES(1, 'libhello:runtime', 1, 1, 1126929880.094, 1, 1);
    INSERT INTO "Instances"
       VALUES(2, 'libhello:user', 1, 1, 1126929880.094, 1, 0);
    INSERT INTO "Instances"
       VALUES(3, 'libhello:script', 1, 1, 1126929880.094, 1, 0);
    INSERT INTO "Instances"
       VALUES(4, 'libhello', 1, 1, 1126929880.094, 1, 0);
    
    CREATE TABLE Versions(versionId INTEGER PRIMARY KEY,version STR UNIQUE);
    INSERT INTO "Versions" VALUES(0, NULL);
    INSERT INTO "Versions" VALUES(1, '/localhost@rpl:linux/0-1-1');
    
    CREATE TABLE Flavors(flavorId integer primary key, flavor str unique);
    INSERT INTO "Flavors" VALUES(0, NULL);
    INSERT INTO "Flavors" VALUES(1, '1#x86');
    
    CREATE TEMPORARY TABLE tlList (
       row INTEGER PRIMARY KEY,
       name STRING,
       version STRING,
       flavor STRING
    );
    
    INSERT INTO tlList 
      values(NULL, 'libhello:script', '/localhost@rpl:linux/0-1-1', '1#x86');
    INSERT INTO tlList 
      values(NULL, 'libhello:user', '/localhost@rpl:linux/0-1-1', '1#x86');
    INSERT INTO tlList 
      values(NULL, 'libhello:runtime', '/localhost@rpl:linux/0-1-1', '1#x86');
  }
} {}

# Run the query with an index
#
do_test tkt1435-1.1 {
  execsql {
    select row, pinned from tlList, Instances, Versions, Flavors
        where
            Instances.troveName = tlList.name
        and Versions.version = tlList.version
        and Instances.versionId = Versions.versionId
        and (    Flavors.flavor = tlList.flavor or Flavors.flavor is NULL
             and tlList.flavor = '')
        and Instances.flavorId = Flavors.flavorId
    order by row asc;
  }
} {1 0 2 0 3 1}

# Create a indices, analyze and rerun the query. 
# Verify that the results are the same
#
do_test tkt1435-1.2 {
  execsql {
    CREATE INDEX InstancesNameIdx ON Instances(troveName);
    CREATE UNIQUE INDEX InstancesIdx 
      ON Instances(troveName, versionId, flavorId);
    ANALYZE;
    select row, pinned from tlList, Instances, Versions, Flavors
        where
            Instances.troveName = tlList.name
        and Versions.version = tlList.version
        and Instances.versionId = Versions.versionId
        and (    Flavors.flavor = tlList.flavor or Flavors.flavor is NULL
             and tlList.flavor = '')
        and Instances.flavorId = Flavors.flavorId
    order by row asc;
  }
} {1 0 2 0 3 1}

finish_test
