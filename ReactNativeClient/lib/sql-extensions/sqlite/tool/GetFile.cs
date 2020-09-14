/*
** 2015 October 7
**
** The author disclaims copyright to this source code.  In place of
** a legal notice, here is a blessing:
**
**    May you do good and not evil.
**    May you find forgiveness for yourself and forgive others.
**    May you share freely, never taking more than you give.
**
*************************************************************************
** This file contains C# code to download a single file based on a URI.
*/

using System;
using System.ComponentModel;
using System.Diagnostics;
using System.IO;
using System.Net;
using System.Reflection;
using System.Runtime.InteropServices;
using System.Threading;

///////////////////////////////////////////////////////////////////////////////

#region Assembly Metadata
[assembly: AssemblyTitle("GetFile Tool")]
[assembly: AssemblyDescription("Download a single file based on a URI.")]
[assembly: AssemblyCompany("SQLite Development Team")]
[assembly: AssemblyProduct("SQLite")]
[assembly: AssemblyCopyright("Public Domain")]
[assembly: ComVisible(false)]
[assembly: Guid("5c4b3728-1693-4a33-a218-8e6973ca15a6")]
[assembly: AssemblyVersion("1.0.*")]

#if DEBUG
[assembly: AssemblyConfiguration("Debug")]
#else
[assembly: AssemblyConfiguration("Release")]
#endif
#endregion

///////////////////////////////////////////////////////////////////////////////

namespace GetFile
{
    /// <summary>
    /// This enumeration is used to represent all the possible exit codes from
    /// this tool.
    /// </summary>
    internal enum ExitCode
    {
        /// <summary>
        /// The file download was a success.
        /// </summary>
        Success = 0,

        /// <summary>
        /// The command line arguments are missing (i.e. null).  Generally,
        /// this should not happen.
        /// </summary>
        MissingArgs = 1,

        /// <summary>
        /// The wrong number of command line arguments was supplied.
        /// </summary>
        WrongNumArgs = 2,

        /// <summary>
        /// The URI specified on the command line could not be parsed as a
        /// supported absolute URI.
        /// </summary>
        BadUri = 3,

        /// <summary>
        /// The file name portion of the URI specified on the command line
        /// could not be extracted from it.
        /// </summary>
        BadFileName = 4,

        /// <summary>
        /// The temporary directory is either invalid (i.e. null) or does not
        /// represent an available directory.
        /// </summary>
        BadTempPath = 5,

        /// <summary>
        /// An exception was caught in <see cref="Main" />.  Generally, this
        /// should not happen.
        /// </summary>
        Exception = 6,

        /// <summary>
        /// The file download was canceled.  This tool does not make use of
        /// the <see cref="WebClient.CancelAsync" /> method; therefore, this
        /// should not happen.
        /// </summary>
        DownloadCanceled = 7,

        /// <summary>
        /// The file download encountered an error.  Further information about
        /// this error should be displayed on the console.
        /// </summary>
        DownloadError = 8
    }

    ///////////////////////////////////////////////////////////////////////////

    internal static class Program
    {
        #region Private Data
        /// <summary>
        /// This is used to synchronize multithreaded access to the
        /// <see cref="previousPercent" /> and <see cref="exitCode"/>
        /// fields.
        /// </summary>
        private static readonly object syncRoot = new object();

        ///////////////////////////////////////////////////////////////////////

        /// <summary>
        /// This event will be signed when the file download has completed,
        /// even if the file download itself was canceled or unsuccessful.
        /// </summary>
        private static EventWaitHandle doneEvent;

        ///////////////////////////////////////////////////////////////////////

        /// <summary>
        /// The previous file download completion percentage seen by the
        /// <see cref="DownloadProgressChanged" /> event handler.  This value
        /// is never decreased, nor is it ever reset to zero.
        /// </summary>
        private static int previousPercent = 0;

        ///////////////////////////////////////////////////////////////////////

        /// <summary>
        /// This will be the exit code returned by this tool after the file
        /// download completes, successfully or otherwise.  This value is only
        /// changed by the <see cref="DownloadFileCompleted" /> event handler.
        /// </summary>
        private static ExitCode exitCode = ExitCode.Success;
        #endregion

        ///////////////////////////////////////////////////////////////////////

        #region Private Support Methods
        /// <summary>
        /// This method displays an error message to the console and/or
        /// displays the command line usage information for this tool.
        /// </summary>
        /// <param name="message">
        /// The error message to display, if any.
        /// </param>
        /// <param name="usage">
        /// Non-zero to display the command line usage information.
        /// </param>
        private static void Error(
            string message,
            bool usage
            )
        {
            if (message != null)
                Console.WriteLine(message);

            string fileName = Path.GetFileName(
                Process.GetCurrentProcess().MainModule.FileName);

            Console.WriteLine(String.Format(
                "usage: {0} <uri> [fileName]", fileName));
        }

        ///////////////////////////////////////////////////////////////////////

        /// <summary>
        /// This method attempts to determine the file name portion of the
        /// specified URI.
        /// </summary>
        /// <param name="uri">
        /// The URI to process.
        /// </param>
        /// <returns>
        /// The file name portion of the specified URI -OR- null if it cannot
        /// be determined.
        /// </returns>
        private static string GetFileName(
            Uri uri
            )
        {
            if (uri == null)
                return null;

            string pathAndQuery = uri.PathAndQuery;

            if (String.IsNullOrEmpty(pathAndQuery))
                return null;

            int index = pathAndQuery.LastIndexOf('/');

            if ((index < 0) || (index == pathAndQuery.Length))
                return null;

            return pathAndQuery.Substring(index + 1);
        }
        #endregion

        ///////////////////////////////////////////////////////////////////////

        #region Private Event Handlers
        /// <summary>
        /// This method is an event handler that is called when the file
        /// download completion percentage changes.  It will display progress
        /// on the console.  Special care is taken to make sure that progress
        /// events are not displayed out-of-order, even if duplicate and/or
        /// out-of-order events are received.
        /// </summary>
        /// <param name="sender">
        /// The source of the event.
        /// </param>
        /// <param name="e">
        /// Information for the event being processed.
        /// </param>
        private static void DownloadProgressChanged(
            object sender,
            DownloadProgressChangedEventArgs e
            )
        {
            if (e != null)
            {
                int percent = e.ProgressPercentage;

                lock (syncRoot)
                {
                    if (percent > previousPercent)
                    {
                        Console.Write('.');

                        if ((percent % 10) == 0)
                            Console.Write(" {0}% ", percent);

                        previousPercent = percent;
                    }
                }
            }
        }

        ///////////////////////////////////////////////////////////////////////

        /// <summary>
        /// This method is an event handler that is called when the file
        /// download has completed, successfully or otherwise.  It will
        /// display the overall result of the file download on the console,
        /// including any <see cref="Exception" /> information, if applicable.
        /// The <see cref="exitCode" /> field is changed by this method to
        /// indicate the overall result of the file download and the event
        /// within the <see cref="doneEvent" /> field will be signaled.
        /// </summary>
        /// <param name="sender">
        /// The source of the event.
        /// </param>
        /// <param name="e">
        /// Information for the event being processed.
        /// </param>
        private static void DownloadFileCompleted(
            object sender,
            AsyncCompletedEventArgs e
            )
        {
            if (e != null)
            {
                lock (syncRoot)
                {
                    if (previousPercent < 100)
                        Console.Write(' ');
                }

                if (e.Cancelled)
                {
                    Console.WriteLine("Canceled");

                    lock (syncRoot)
                    {
                        exitCode = ExitCode.DownloadCanceled;
                    }
                }
                else
                {
                    Exception error = e.Error;

                    if (error != null)
                    {
                        Console.WriteLine("Error: {0}", error);

                        lock (syncRoot)
                        {
                            exitCode = ExitCode.DownloadError;
                        }
                    }
                    else
                    {
                        Console.WriteLine("Done");
                    }
                }
            }

            if (doneEvent != null)
                doneEvent.Set();
        }
        #endregion

        ///////////////////////////////////////////////////////////////////////

        #region Program Entry Point
        /// <summary>
        /// This is the entry-point for this tool.  It handles processing the
        /// command line arguments, setting up the web client, downloading the
        /// file, and saving it to the file system.
        /// </summary>
        /// <param name="args">
        /// The command line arguments.
        /// </param>
        /// <returns>
        /// Zero upon success; non-zero on failure.  This will be one of the
        /// values from the <see cref="ExitCode" /> enumeration.
        /// </returns>
        private static int Main(
            string[] args
            )
        {
            //
            // NOTE: Sanity check the command line arguments.
            //
            if (args == null)
            {
                Error(null, true);
                return (int)ExitCode.MissingArgs;
            }

            if ((args.Length < 1) || (args.Length > 2))
            {
                Error(null, true);
                return (int)ExitCode.WrongNumArgs;
            }

            //
            // NOTE: Attempt to convert the first (and only) command line
            //       argument to an absolute URI.
            //
            Uri uri;

            if (!Uri.TryCreate(args[0], UriKind.Absolute, out uri))
            {
                Error("Could not create absolute URI from argument.", false);
                return (int)ExitCode.BadUri;
            }

            //
            // NOTE: If a file name was specified on the command line, try to
            //       use it (without its directory name); otherwise, fallback
            //       to using the file name portion of the URI.
            //
            string fileName = (args.Length == 2) ?
                Path.GetFileName(args[1]) : null;

            if (String.IsNullOrEmpty(fileName))
            {
                //
                // NOTE: Attempt to extract the file name portion of the URI
                //       we just created.
                //
                fileName = GetFileName(uri);

                if (fileName == null)
                {
                    Error("Could not extract file name from URI.", false);
                    return (int)ExitCode.BadFileName;
                }
            }

            //
            // NOTE: Grab the temporary path setup for this process.  If it is
            //       unavailable, we will not continue.
            //
            string directory = Path.GetTempPath();

            if (String.IsNullOrEmpty(directory) ||
                !Directory.Exists(directory))
            {
                Error("Temporary directory is invalid or unavailable.", false);
                return (int)ExitCode.BadTempPath;
            }

            try
            {
                //
                // HACK: For use of the TLS 1.2 security protocol because some
                //       web servers fail without it.  In order to support the
                //       .NET Framework 2.0+ at compilation time, must use its
                //       integer constant here.
                //
                ServicePointManager.SecurityProtocol =
                    (SecurityProtocolType)0xC00;

                using (WebClient webClient = new WebClient())
                {
                    //
                    // NOTE: Create the event used to signal completion of the
                    //       file download.
                    //
                    doneEvent = new ManualResetEvent(false);

                    //
                    // NOTE: Hookup the event handlers we care about on the web
                    //       client.  These are necessary because the file is
                    //       downloaded asynchronously.
                    //
                    webClient.DownloadProgressChanged +=
                        new DownloadProgressChangedEventHandler(
                            DownloadProgressChanged);

                    webClient.DownloadFileCompleted +=
                        new AsyncCompletedEventHandler(
                            DownloadFileCompleted);

                    //
                    // NOTE: Build the fully qualified path and file name,
                    //       within the temporary directory, where the file to
                    //       be downloaded will be saved.
                    //
                    fileName = Path.Combine(directory, fileName);

                    //
                    // NOTE: If the file name already exists (in the temporary)
                    //       directory, delete it.
                    //
                    // TODO: Perhaps an error should be raised here instead?
                    //
                    if (File.Exists(fileName))
                        File.Delete(fileName);

                    //
                    // NOTE: After kicking off the asynchronous file download
                    //       process, wait [forever] until the "done" event is
                    //       signaled.
                    //
                    Console.WriteLine(
                        "Downloading \"{0}\" to \"{1}\"...", uri, fileName);

                    webClient.DownloadFileAsync(uri, fileName);
                    doneEvent.WaitOne();
                }

                lock (syncRoot)
                {
                    return (int)exitCode;
                }
            }
            catch (Exception e)
            {
                //
                // NOTE: An exception was caught.  Report it via the console
                //       and return failure.
                //
                Error(e.ToString(), false);
                return (int)ExitCode.Exception;
            }
        }
        #endregion
    }
}
