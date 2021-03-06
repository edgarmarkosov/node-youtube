var youtubedl   = require('youtube-dl');
var parser      = require('./modules/url-parser');
var path        = require('path');
var fs          = require('fs');
var os          = require('os');
var Q           = require('q');

module.exports = function (urlOrVidId) {
    if(urlOrVidId) {
        var url = parser(urlOrVidId);

        return {
            snapshot : function (time, filePath, format) {
                var snapShot            = require('./modules/snapshot');
                var video               = youtubedl(url, format, { cwd: __dirname });
                var snapshotFilePath    = path.resolve(__dirname, 'tmp', 'snap-'+ ( + new Date() ) + '.jpg');
                var videoFilePath       = path.resolve(__dirname, 'tmp', 'video-'+ ( + new Date() ) + '.mp4');
                var ws                  = fs.createWriteStream(videoFilePath);
                var deferred            = Q.defer();
                var ended = false;

                var checkSnap           = function () {
                    snapShot(videoFilePath, time, snapshotFilePath, filePath, function (err) {
                        if(err) {
                            return !ended && setTimeout(checkSnap, 200);
                        }

                        ws.emit('close');
                        fs.unlink(snapshotFilePath, function() {});
                        fs.unlink(videoFilePath, function() {});
                        deferred.resolve();
                    })
                };

                video.pipe(ws);
                video.on('info', checkSnap);
                video.on('error', function(err) {
                    fs.unlink(snapshotFilePath, function() {});
                    fs.unlink(videoFilePath, function() {});
                    deferred.reject(err);
                });
                video.on('end', function() {
                    ended = true;

                    snapShot(videoFilePath, time, snapshotFilePath, filePath, function (err) {
                        fs.unlink(snapshotFilePath, function() {});
                        fs.unlink(videoFilePath, function() {});

                        if(err) {
                            return deferred.reject(err);
                        }

                        deferred.resolve();
                    })
                });

                return deferred.promise;
            },
            crop : function (startTime, endTime, filePath, format) {
                var sec             = require('sec');
                var snapShot        = require('./modules/snapshot');
                var crop            = require('./modules/crop');
                var video           = youtubedl(url, format, { cwd: __dirname });
                var tmpSnap         = path.resolve(__dirname, 'tmp', 'snap-'+ ( + new Date() ) + '.jpg');
                var cropFilePath    = path.resolve(__dirname, 'tmp', 'crop-'+ ( + new Date() ) + '.mp4');
                var videoFilePath   = path.resolve(__dirname, 'tmp', 'video-'+ ( + new Date() ) + '.mp4');
                var ws              = fs.createWriteStream(videoFilePath);
                var deferred        = Q.defer();
                var duration        = sec(endTime) - sec(startTime);
                var ended = false;

                var checkCrop       = function () {
                    if(duration < 1) {
                        ws.emit('close');
                        return deferred.reject(new Error('The end time needs to be greather than start time'));
                    }
                    else {
                        snapShot(videoFilePath, endTime, tmpSnap, null, function (err) {
                            if(err) {
                                return !ended && setTimeout(checkCrop, 200);
                            }

                            ws.emit('close');
                            crop(startTime, duration, videoFilePath, cropFilePath, filePath, function (err) {
                                fs.unlink(videoFilePath, function() {});
                                fs.unlink(cropFilePath, function() {});
                                fs.unlink(tmpSnap, function() {});

                                if(err) {
                                    return deferred.reject(err);
                                }

                                deferred.resolve();
                            })
                        })
                    }
                };

                video.pipe(ws);
                video.on('info', checkCrop);
                video.on('error', function(err) {
                    fs.unlink(videoFilePath, function() {});
                    fs.unlink(cropFilePath, function() {});
                    fs.unlink(tmpSnap, function() {});
                    deferred.reject(err);
                });
                video.on('end', function() {
                    ended = true;

                    crop(startTime, duration, videoFilePath, cropFilePath, filePath, function (err) {
                        fs.unlink(videoFilePath, function() {});
                        fs.unlink(cropFilePath, function() {});
                        fs.unlink(tmpSnap, function() {});

                        if(err) {
                            return deferred.reject(err);
                        }

                        deferred.resolve();
                    })
                });

                return deferred.promise;
            },
            gif : function (startTime, endTime, filePath, options) {
                var sec             = require('sec');
                var gif             = require('./modules/gif.js');
                var deferred        = Q.defer();
                var cropFilePath    = path.resolve(__dirname, 'tmp', 'crop-'+ ( + new Date() ) + '.mp4');
                var duration        = sec(endTime) - sec(startTime);
                this.crop(startTime, endTime, cropFilePath)
                    .then(function () {
                        gif(cropFilePath, filePath, '00', duration, options, function (err) {
                            fs.unlink(cropFilePath, function() {});

                            if(err) {
                                return deferred.reject(err);
                            }

                            deferred.resolve();
                        })
                    })
                    .catch(function(err) {
                        deferred.reject(err)
                    });

                return deferred.promise;
            },
            download: function (filePath, format) {
                var video           = youtubedl(url, format, { cwd: __dirname });
                var videoFilePath   = path.resolve(__dirname, 'tmp', 'video-'+ ( + new Date() ) + '.mp4');
                var ws              = fs.createWriteStream(videoFilePath);
                var move            = require('./modules/move');
                var deferred        = Q.defer();
                video.pipe(ws);
                video.on('error', function(err) {
                    fs.unlink(videoFilePath, function() {});
                    deferred.reject(err);
                });
                video.on('end', function() {
                    move(videoFilePath, filePath)
                        .then(function () {
                            fs.unlink(videoFilePath, function() {});
                            deferred.resolve();
                        })
                        .catch(function () {
                            fs.unlink(videoFilePath, function() {});
                            deferred.reject();
                        })
                });

                return deferred.promise;
            }
        }
    }

    return {
        crop : function (startTime, endTime, videoFilePath, filePath, format) {
            var sec             = require('sec');
            var crop            = require('./modules/crop');
            var cropFilePath    = path.resolve(os.tmpdir(), 'crop-'+ ( + new Date() ) + '.mp4');
            var deferred        = Q.defer();
            var duration        = sec(endTime) - sec(startTime);

            crop(startTime, duration, videoFilePath, cropFilePath, filePath, function (err) {
                fs.unlink(videoFilePath, function() {});
                fs.unlink(cropFilePath, function() {});

                if(err) {
                    return deferred.reject(err);
                }

                deferred.resolve();
            });

            return deferred.promise;
        },
        gif : function (startTime, endTime, videoFilePath, filePath, options) {
            var sec             = require('sec');
            var gif             = require('./modules/gif.js');
            var deferred        = Q.defer();
            var cropFilePath    = path.resolve(os.tmpdir(), 'crop-'+ ( + new Date() ) + '.mp4');
            var duration        = sec(endTime) - sec(startTime);

            this.crop(startTime, endTime, videoFilePath, cropFilePath)
                .then(function () {
                    gif(cropFilePath, filePath, '00', duration, options, function (err) {
                        fs.unlink(cropFilePath, function() {});

                        if(err) {
                            return deferred.reject(err);
                        }

                        deferred.resolve();
                    })
                })
                .catch(function(err) {
                    deferred.reject(err)
                });

            return deferred.promise;
        }
    }
};