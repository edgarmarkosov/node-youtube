var ffmpeg      = require('fluent-ffmpeg');
var path        = require('path');
var fs          = require('fs');

module.exports = function (videoFilePath, filePath, startTime, duration, size, ratio, ifps, cb) {
    var ws  = fs.createWriteStream(path.resolve(filePath));
    var f   = ffmpeg(videoFilePath)
        .format('gif')
        .setStartTime(startTime)
        .duration(duration);

    size && f.size(size);
    ifps && f.inputFPS(ifps);
    ratio && f.aspect(ratio);

    f.on('error', cb)
        .on('end', cb)
        .writeToStream(ws, { end: true });
};