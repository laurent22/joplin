/*
** 2009 November 10
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
**
** This is the C-language interface definition for the "intarray" or
** integer array virtual table for SQLite.
**
** This virtual table is used for internal testing of SQLite only.  It is
** not recommended for use in production.  For a similar virtual table that
** is production-ready, see the "carray" virtual table over in ext/misc.
**
** The intarray virtual table is designed to facilitate using an
** array of integers as the right-hand side of an IN operator.  So
** instead of doing a prepared statement like this:
**
**     SELECT * FROM table WHERE x IN (?,?,?,...,?);
**
** And then binding indivdual integers to each of ? slots, a C-language
** application can create an intarray object (named "ex1" in the following
** example), prepare a statement like this:
**
**     SELECT * FROM table WHERE x IN ex1;
**
** Then bind an ordinary C/C++ array of integer values to the ex1 object
** to run the statement.
**
** USAGE:
**
** One or more intarray objects can be created as follows:
**
**      sqlite3_intarray *p1, *p2, *p3;
**      sqlite3_intarray_create(db, "ex1", &p1);
**      sqlite3_intarray_create(db, "ex2", &p2);
**      sqlite3_intarray_create(db, "ex3", &p3);
**
** Each call to sqlite3_intarray_create() generates a new virtual table
** module and a singleton of that virtual table module in the TEMP
** database.  Both the module and the virtual table instance use the
** name given by the second parameter.  The virtual tables can then be
** used in prepared statements:
**
**      SELECT * FROM t1, t2, t3
**       WHERE t1.x IN ex1
**         AND t2.y IN ex2
**         AND t3.z IN ex3;
**
** Each integer array is initially empty.  New arrays can be bound to
** an integer array as follows:
**
**     sqlite3_int64 a1[] = { 1, 2, 3, 4 };
**     sqlite3_int64 a2[] = { 5, 6, 7, 8, 9, 10, 11 };
**     sqlite3_int64 *a3 = sqlite3_malloc( 100*sizeof(sqlite3_int64) );
**     // Fill in content of a3[]
**     sqlite3_intarray_bind(p1, 4, a1, 0);
**     sqlite3_intarray_bind(p2, 7, a2, 0);
**     sqlite3_intarray_bind(p3, 100, a3, sqlite3_free);
**
** A single intarray object can be rebound multiple times.  But do not
** attempt to change the bindings of an intarray while it is in the middle
** of a query.
**
** The array that holds the integers is automatically freed by the function
** in the fourth parameter to sqlite3_intarray_bind() when the array is no
** longer needed.  The application must not change the intarray values
** while an intarray is in the middle of a query.
**
** The intarray object is automatically destroyed when its corresponding
** virtual table is dropped.  Since the virtual tables are created in the
** TEMP database, they are automatically dropped when the database connection
** closes so the application does not normally need to take any special
** action to free the intarray objects.  Because of the way virtual tables
** work and the (somewhat goofy) way that the intarray virtual table is
** implemented, it is not allowed to invoke sqlite3_intarray_create(D,N,P)
** more than once with the same D and N values.
*/
#include "sqlite3.h"
#ifndef SQLITE_INTARRAY_H
#define SQLITE_INTARRAY_H

/*
** Make sure we can call this stuff from C++.
*/
#ifdef __cplusplus
extern "C" {
#endif

/*
** An sqlite3_intarray is an abstract type to stores an instance of
** an integer array.
*/
typedef struct sqlite3_intarray sqlite3_intarray;

/*
** Invoke this routine to create a specific instance of an intarray object.
** The new intarray object is returned by the 3rd parameter.
**
** Each intarray object corresponds to a virtual table in the TEMP table
** with a name of zName.
**
** Destroy the intarray object by dropping the virtual table.  If not done
** explicitly by the application, the virtual table will be dropped implicitly
** by the system when the database connection is closed.
*/
SQLITE_API int sqlite3_intarray_create(
  sqlite3 *db,
  const char *zName,
  sqlite3_intarray **ppReturn
);

/*
** Bind a new array array of integers to a specific intarray object.
**
** The array of integers bound must be unchanged for the duration of
** any query against the corresponding virtual table.  If the integer
** array does change or is deallocated undefined behavior will result.
*/
SQLITE_API int sqlite3_intarray_bind(
  sqlite3_intarray *pIntArray,   /* The intarray object to bind to */
  int nElements,                 /* Number of elements in the intarray */
  sqlite3_int64 *aElements,      /* Content of the intarray */
  void (*xFree)(void*)           /* How to dispose of the intarray when done */
);

#ifdef __cplusplus
}  /* End of the 'extern "C"' block */
#endif
#endif /* SQLITE_INTARRAY_H */
