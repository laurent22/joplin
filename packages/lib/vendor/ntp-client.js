/*
 * ntp-client
 * https://github.com/moonpyk/node-ntp-client
 *
 * Copyright (c) 2013 Clément Bourgeois
 * Licensed under the MIT license.
 */

// ----------------------------------------------------------------------------------------
// 2020-08-09: We vendor the package because although it works
// it has several bugs and is currently unmaintained
// ----------------------------------------------------------------------------------------

const Buffer = require('buffer').Buffer;

(function (exports) {
    "use strict";

    exports.defaultNtpPort = 123;
    exports.defaultNtpServer = "pool.ntp.org";

    exports.dgram = null;

    /**
     * Amount of acceptable time to await for a response from the remote server.
     * Configured default to 10 seconds.
     */
    exports.ntpReplyTimeout = 10000;

    /**
     * Fetches the current NTP Time from the given server and port.
     * @param {string} server IP/Hostname of the remote NTP Server
     * @param {number} port Remote NTP Server port number
     * @param {function(Object, Date)} callback(err, date) Async callback for
     * the result date or eventually error.
     */
    exports.getNetworkTime = function (server, port, callback) {
        if (callback === null || typeof callback !== "function") {
            return;
        }

        server = server || exports.defaultNtpServer;
        port = port || exports.defaultNtpPort;

        if (!exports.dgram) throw new Error('dgram package has not been set!!');

        var client = exports.dgram.createSocket("udp4");
        var ntpData = Buffer.alloc(48); // new Buffer(48);

        // RFC 2030 -> LI = 0 (no warning, 2 bits), VN = 3 (IPv4 only, 3 bits), Mode = 3 (Client Mode, 3 bits) -> 1 byte
        // -> rtol(LI, 6) ^ rotl(VN, 3) ^ rotl(Mode, 0)
        // -> = 0x00 ^ 0x18 ^ 0x03
        ntpData[0] = 0x1B;

        for (var i = 1; i < 48; i++) {
            ntpData[i] = 0;
        }

        // Some errors can happen before/after send() or cause send() to was impossible.
        // Some errors will also be given to the send() callback.
        // We keep a flag, therefore, to prevent multiple callbacks.
        // NOTE : the error callback is not generalised, as the client has to lose the connection also, apparently.
        var errorFired = false;

        function closeClient(client) {
            try {
                client.close();
            } catch (error) {
                // Doesn't mater if it could not be closed
            }
        }

        var timeout = setTimeout(function () {
            closeClient(client);

            if (errorFired) {
                return;
            }
            callback(new Error("Timeout waiting for NTP response."), null);
            errorFired = true;
        }, exports.ntpReplyTimeout);

        client.on('error', function (err) {
            clearTimeout(timeout);

            if (errorFired) {
                return;
            }

            callback(err, null);
            errorFired = true;
        });

        // NOTE: To make it work in React Native (Android), a port need to be bound
        // before calling client.send()

        // client.bind(5555, '0.0.0.0', function() {
            client.send(ntpData, 0, ntpData.length, port, server, function (err) {
                if (err) {
                    clearTimeout(timeout);
                    if (errorFired) {
                        return;
                    }
                    callback(err, null);
                    errorFired = true;
                    closeClient(client);
                    return;
                }

                client.once('message', function (msg) {
                    clearTimeout(timeout);
                    closeClient(client);

                    // Offset to get to the "Transmit Timestamp" field (time at which the reply
                    // departed the server for the client, in 64-bit timestamp format."
                    var offsetTransmitTime = 40,
                        intpart = 0,
                        fractpart = 0;

                    // Get the seconds part
                    for (var i = 0; i <= 3; i++) {
                        intpart = 256 * intpart + msg[offsetTransmitTime + i];
                    }

                    // Get the seconds fraction
                    for (i = 4; i <= 7; i++) {
                        fractpart = 256 * fractpart + msg[offsetTransmitTime + i];
                    }

                    var milliseconds = (intpart * 1000 + (fractpart * 1000) / 0x100000000);

                    // **UTC** time
                    var date = new Date("Jan 01 1900 GMT");
                    date.setUTCMilliseconds(date.getUTCMilliseconds() + milliseconds);

                    callback(null, date);
                });
            });
        // });
    };

    exports.demo = function (argv) {
        exports.getNetworkTime(
            exports.defaultNtpServer,
            exports.defaultNtpPort,
            function (err, date) {
                if (err) {
                    console.error(err);
                    return;
                }

                console.log(date);
            });
    };
}(exports));