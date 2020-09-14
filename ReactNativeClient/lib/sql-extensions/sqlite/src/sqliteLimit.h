/*
** 2007 May 7
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
** This file defines various limits of what SQLite can process.
*/

/*
** The maximum length of a TEXT or BLOB in bytes.   This also
** limits the size of a row in a table or index.
**
** The hard limit is the ability of a 32-bit signed integer
** to count the size: 2^31-1 or 2147483647.
*/
#ifndef SQLITE_MAX_LENGTH
# define SQLITE_MAX_LENGTH 1000000000
#endif

/*
** This is the maximum number of
**
**    * Columns in a table
**    * Columns in an index
**    * Columns in a view
**    * Terms in the SET clause of an UPDATE statement
**    * Terms in the result set of a SELECT statement
**    * Terms in the GROUP BY or ORDER BY clauses of a SELECT statement.
**    * Terms in the VALUES clause of an INSERT statement
**
** The hard upper limit here is 32676.  Most database people will
** tell you that in a well-normalized database, you usually should
** not have more than a dozen or so columns in any table.  And if
** that is the case, there is no point in having more than a few
** dozen values in any of the other situations described above.
*/
#ifndef SQLITE_MAX_COLUMN
# define SQLITE_MAX_COLUMN 2000
#endif

/*
** The maximum length of a single SQL statement in bytes.
**
** It used to be the case that setting this value to zero would
** turn the limit off.  That is no longer true.  It is not possible
** to turn this limit off.
*/
#ifndef SQLITE_MAX_SQL_LENGTH
# define SQLITE_MAX_SQL_LENGTH 1000000000
#endif

/*
** The maximum depth of an expression tree. This is limited to 
** some extent by SQLITE_MAX_SQL_LENGTH. But sometime you might 
** want to place more severe limits on the complexity of an 
** expression.
**
** A value of 0 used to mean that the limit was not enforced.
** But that is no longer true.  The limit is now strictly enforced
** at all times.
*/
#ifndef SQLITE_MAX_EXPR_DEPTH
# define SQLITE_MAX_EXPR_DEPTH 1000
#endif

/*
** The maximum number of terms in a compound SELECT statement.
** The code generator for compound SELECT statements does one
** level of recursion for each term.  A stack overflow can result
** if the number of terms is too large.  In practice, most SQL
** never has more than 3 or 4 terms.  Use a value of 0 to disable
** any limit on the number of terms in a compount SELECT.
*/
#ifndef SQLITE_MAX_COMPOUND_SELECT
# define SQLITE_MAX_COMPOUND_SELECT 500
#endif

/*
** The maximum number of opcodes in a VDBE program.
** Not currently enforced.
*/
#ifndef SQLITE_MAX_VDBE_OP
# define SQLITE_MAX_VDBE_OP 250000000
#endif

/*
** The maximum number of arguments to an SQL function.
*/
#ifndef SQLITE_MAX_FUNCTION_ARG
# define SQLITE_MAX_FUNCTION_ARG 127
#endif

/*
** The suggested maximum number of in-memory pages to use for
** the main database table and for temporary tables.
**
** IMPLEMENTATION-OF: R-30185-15359 The default suggested cache size is -2000,
** which means the cache size is limited to 2048000 bytes of memory.
** IMPLEMENTATION-OF: R-48205-43578 The default suggested cache size can be
** altered using the SQLITE_DEFAULT_CACHE_SIZE compile-time options.
*/
#ifndef SQLITE_DEFAULT_CACHE_SIZE
# define SQLITE_DEFAULT_CACHE_SIZE  -2000
#endif

/*
** The default number of frames to accumulate in the log file before
** checkpointing the database in WAL mode.
*/
#ifndef SQLITE_DEFAULT_WAL_AUTOCHECKPOINT
# define SQLITE_DEFAULT_WAL_AUTOCHECKPOINT  1000
#endif

/*
** The maximum number of attached databases.  This must be between 0
** and 125.  The upper bound of 125 is because the attached databases are
** counted using a signed 8-bit integer which has a maximum value of 127
** and we have to allow 2 extra counts for the "main" and "temp" databases.
*/
#ifndef SQLITE_MAX_ATTACHED
# define SQLITE_MAX_ATTACHED 10
#endif


/*
** The maximum value of a ?nnn wildcard that the parser will accept.
** If the value exceeds 32767 then extra space is required for the Expr
** structure.  But otherwise, we believe that the number can be as large
** as a signed 32-bit integer can hold.
*/
#ifndef SQLITE_MAX_VARIABLE_NUMBER
# define SQLITE_MAX_VARIABLE_NUMBER 32766
#endif

/* Maximum page size.  The upper bound on this value is 65536.  This a limit
** imposed by the use of 16-bit offsets within each page.
**
** Earlier versions of SQLite allowed the user to change this value at
** compile time. This is no longer permitted, on the grounds that it creates
** a library that is technically incompatible with an SQLite library 
** compiled with a different limit. If a process operating on a database 
** with a page-size of 65536 bytes crashes, then an instance of SQLite 
** compiled with the default page-size limit will not be able to rollback 
** the aborted transaction. This could lead to database corruption.
*/
#ifdef SQLITE_MAX_PAGE_SIZE
# undef SQLITE_MAX_PAGE_SIZE
#endif
#define SQLITE_MAX_PAGE_SIZE 65536


/*
** The default size of a database page.
*/
#ifndef SQLITE_DEFAULT_PAGE_SIZE
# define SQLITE_DEFAULT_PAGE_SIZE 4096
#endif
#if SQLITE_DEFAULT_PAGE_SIZE>SQLITE_MAX_PAGE_SIZE
# undef SQLITE_DEFAULT_PAGE_SIZE
# define SQLITE_DEFAULT_PAGE_SIZE SQLITE_MAX_PAGE_SIZE
#endif

/*
** Ordinarily, if no value is explicitly provided, SQLite creates databases
** with page size SQLITE_DEFAULT_PAGE_SIZE. However, based on certain
** device characteristics (sector-size and atomic write() support),
** SQLite may choose a larger value. This constant is the maximum value
** SQLite will choose on its own.
*/
#ifndef SQLITE_MAX_DEFAULT_PAGE_SIZE
# define SQLITE_MAX_DEFAULT_PAGE_SIZE 8192
#endif
#if SQLITE_MAX_DEFAULT_PAGE_SIZE>SQLITE_MAX_PAGE_SIZE
# undef SQLITE_MAX_DEFAULT_PAGE_SIZE
# define SQLITE_MAX_DEFAULT_PAGE_SIZE SQLITE_MAX_PAGE_SIZE
#endif


/*
** Maximum number of pages in one database file.
**
** This is really just the default value for the max_page_count pragma.
** This value can be lowered (or raised) at run-time using that the
** max_page_count macro.
*/
#ifndef SQLITE_MAX_PAGE_COUNT
# define SQLITE_MAX_PAGE_COUNT 1073741823
#endif

/*
** Maximum length (in bytes) of the pattern in a LIKE or GLOB
** operator.
*/
#ifndef SQLITE_MAX_LIKE_PATTERN_LENGTH
# define SQLITE_MAX_LIKE_PATTERN_LENGTH 50000
#endif

/*
** Maximum depth of recursion for triggers.
**
** A value of 1 means that a trigger program will not be able to itself
** fire any triggers. A value of 0 means that no trigger programs at all 
** may be executed.
*/
#ifndef SQLITE_MAX_TRIGGER_DEPTH
# define SQLITE_MAX_TRIGGER_DEPTH 1000
#endif
