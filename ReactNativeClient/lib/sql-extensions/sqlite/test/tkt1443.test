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
# This file implements tests to verify that ticket #1433 has been
# fixed.  
#
# The problem in ticket #1433 was that the dependencies on the right-hand
# side of an IN operator were not being checked correctly.  So in an
# expression of the form:
#
#         t1.x IN (1,t2.b,3)
#
# the optimizer was missing the fact that the right-hand side of the IN
# depended on table t2.  It was checking dependencies based on the
# Expr.pRight field rather than Expr.pList and Expr.pSelect.  
#
# Such a bug could be verifed using a less elaborate test case.  But
# this test case (from the original bug poster) exercises so many different
# parts of the system all at once, that it seemed like a good one to
# include in the test suite. 
#
# NOTE:  Yes, in spite of the name of this file (tkt1443.test) this
# test is for ticket #1433 not #1443.  I mistyped the name when I was
# creating the file and I had already checked in the file by the wrong
# name be the time I noticed the error.  With CVS it is a really hassle
# to change filenames, so I'll just leave it as is.  No harm done.
#
# $Id: tkt1443.test,v 1.4 2006/01/17 09:35:02 danielk1977 Exp $

set testdir [file dirname $argv0]
source $testdir/tester.tcl

ifcapable !subquery||!memorydb {
  finish_test
  return
}

# Construct the sample database.
#
do_test tkt1443-1.0 {
  sqlite3 db :memory:
  execsql {
    CREATE TABLE Items(
    	itemId integer primary key,
    	 item str unique
    );
    INSERT INTO "Items" VALUES(0, 'ALL');
    INSERT INTO "Items" VALUES(1, 'double:source');
    INSERT INTO "Items" VALUES(2, 'double');
    INSERT INTO "Items" VALUES(3, 'double:runtime');
    INSERT INTO "Items" VALUES(4, '.*:runtime');
    
    CREATE TABLE Labels(
    	labelId INTEGER PRIMARY KEY,
    	label STR UNIQUE
    );
    INSERT INTO "Labels" VALUES(0, 'ALL');
    INSERT INTO "Labels" VALUES(1, 'localhost@rpl:linux');
    INSERT INTO "Labels" VALUES(2, 'localhost@rpl:branch');
    
    CREATE TABLE LabelMap(
    	itemId INTEGER,
    	labelId INTEGER,
    	branchId integer
    );
    INSERT INTO "LabelMap" VALUES(1, 1, 1);
    INSERT INTO "LabelMap" VALUES(2, 1, 1);
    INSERT INTO "LabelMap" VALUES(3, 1, 1);
    INSERT INTO "LabelMap" VALUES(1, 2, 2);
    INSERT INTO "LabelMap" VALUES(2, 2, 3);
    INSERT INTO "LabelMap" VALUES(3, 2, 3);
    
    CREATE TABLE Users (
    	userId INTEGER PRIMARY KEY,
    	user STRING UNIQUE,
    	salt BINARY,
    	password STRING
    );
    INSERT INTO "Users" VALUES(1, 'test', 'æ$d',
               '43ba0f45014306bd6df529551ffdb3df');
    INSERT INTO "Users" VALUES(2, 'limited', 'ª>S',
               'cf07c8348fdf675cc1f7696b7d45191b');
    CREATE TABLE UserGroups (
    	userGroupId INTEGER PRIMARY KEY,
    	userGroup STRING UNIQUE
    );
    INSERT INTO "UserGroups" VALUES(1, 'test');
    INSERT INTO "UserGroups" VALUES(2, 'limited');
    
    CREATE TABLE UserGroupMembers (
    	userGroupId INTEGER,
    	userId INTEGER
    );
    INSERT INTO "UserGroupMembers" VALUES(1, 1);
    INSERT INTO "UserGroupMembers" VALUES(2, 2);
    
    CREATE TABLE Permissions (
    	userGroupId INTEGER,
    	labelId INTEGER NOT NULL,
    	itemId INTEGER NOT NULL,
    	write INTEGER,
    	capped INTEGER,
    	admin INTEGER
    );
    INSERT INTO "Permissions" VALUES(1, 0, 0, 1, 0, 1);
    INSERT INTO "Permissions" VALUES(2, 2, 4, 0, 0, 0);
  }
} {}

# Run the query with an index
#
do_test tkt1443-1.1 {
  execsql {
    select distinct
        Items.Item as trove, UP.pattern as pattern
    from
       ( select
           Permissions.labelId as labelId,
           PerItems.item as pattern
         from
           Users, UserGroupMembers, Permissions
           left outer join Items as PerItems
                 on Permissions.itemId = PerItems.itemId
         where
               Users.user = 'limited'
           and Users.userId = UserGroupMembers.userId
           and UserGroupMembers.userGroupId = Permissions.userGroupId
       ) as UP join LabelMap on ( UP.labelId = 0 or
                                  UP.labelId = LabelMap.labelId ),
       Labels, Items
    where
        Labels.label = 'localhost@rpl:branch'
    and Labels.labelId = LabelMap.labelId
    and LabelMap.itemId = Items.itemId
    ORDER BY +trove, +pattern
  }
} {double .*:runtime double:runtime .*:runtime double:source .*:runtime}

# Create an index and rerun the query. 
# Verify that the results are the same
#
do_test tkt1443-1.2 {
  execsql {
    CREATE UNIQUE INDEX PermissionsIdx
         ON Permissions(userGroupId, labelId, itemId);
    select distinct
        Items.Item as trove, UP.pattern as pattern
    from
       ( select
           Permissions.labelId as labelId,
           PerItems.item as pattern
         from
           Users, UserGroupMembers, Permissions
           left outer join Items as PerItems
                 on Permissions.itemId = PerItems.itemId
         where
               Users.user = 'limited'
           and Users.userId = UserGroupMembers.userId
           and UserGroupMembers.userGroupId = Permissions.userGroupId
       ) as UP join LabelMap on ( UP.labelId = 0 or
                                  UP.labelId = LabelMap.labelId ),
       Labels, Items
    where
        Labels.label = 'localhost@rpl:branch'
    and Labels.labelId = LabelMap.labelId
    and LabelMap.itemId = Items.itemId
    ORDER BY +trove, +pattern
  }
} {double .*:runtime double:runtime .*:runtime double:source .*:runtime}

finish_test
