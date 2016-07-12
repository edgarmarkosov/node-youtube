var youtubedl   = require('youtube-dl');
var path        = require('path');
var fs          = require('fs');
var Q           = require('q');

module.exports = function (url) {
    return {
        snapshot : function (time, filePath, format) {
            var snapShot            = require('./modules/snapshot');
            var video               = youtubedl(url, format, { cwd: __dirname });
            var snapshotFilePath    = path.resolve(__dirname, 'tmp', 'snap-'+ ( + new Date() ) + '.jpg');
            var videoFilePath       = path.resolve(__dirname, 'tmp', 'video-'+ ( + new Date() ) + '.mp4');
            var ws                  = fs.createWriteStream(videoFilePath);
            var deferred            = Q.defer();
            var checkSnap           = function () {
                snapShot(videoFilePath, time, snapshotFilePath, filePath, function (err) {
                    if(err) return setTimeout(checkSnap, 200);
                    ws.emit('close');
                    deferred.resolve();
                })
            }

            video.pipe(ws);
            video.on('info', checkSnap);
            video.on('end', function() {
                snapShot(videoFilePath, time, snapshotFilePath, filePath, function (err) {
                    if(err) return deferred.reject(err);
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
            var checkCrop       = function () {
                if(duration < 1) {
                    ws.emit('close');
                    deferred.reject(new Error('The end time needs to be greather than start time'));
                } else {
                    snapShot(videoFilePath, endTime, tmpSnap, null, function (err) {
                        if(err) return setTimeout(checkCrop, 200);
                        ws.emit('close');
                        crop(startTime, duration, videoFilePath, cropFilePath, filePath, function (err) {
                            if(err) return deferred.reject(err);
                            deferred.resolve();
                        })
                    })
                }
            }

            video.pipe(ws);
            video.on('info', checkCrop);
            video.on('end', function() {
                crop(startTime, duration, videoFilePath, cropFilePath, filePath, function (err) {
                    if(err) return deferred.reject(err);
                    deferred.resolve();
                })
            });

            return deferred.promise;
        }
    }
}