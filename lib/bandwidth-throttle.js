var stream = require('stream');
var util = require('util');

function BandwidthThrottle(throttledStream, options) {
    var self = this;
    stream.Transform.call(self);
    self._stream = throttledStream;
    self._rate = Number(options.averageRate);
    self._hotByteCount = 0;
    self._lastPauseTime = null;

    var maxPauseTime = Number(options.maxPauseTime) || null;
    var interval = Number(options.cooldownInterval) || 100;
    setInterval(function cooldown() {
        if (self._hotByteCount > 0) {
            self._hotByteCount -= self._rate / 1000 * interval;
            self._hotByteCount = Math.max(self._hotByteCount, 0);
            if (self._stream.isPaused()) {
                var now = new Date().getTime();
                var mayResume = (self._hotByteCount < self._rate);
                var mustResume = maxPauseTime &&
                    (now - self._lastPauseTime > maxPauseTime);
                if (mayResume || mustResume) {
                    try {
                        console.log('RESUME');
                        self._stream.resume();
                    } catch (err) {}
                }
            }
        }
    }, interval);
}
util.inherits(BandwidthThrottle, stream.Transform);

BandwidthThrottle.prototype._transform = function(chunk, enc, cb) {
    this.push(chunk);
    this._hotByteCount += chunk.length;
    if (this._hotByteCount >= this._rate) {
        try {
            console.log('PAUSE');
            this._lastPauseTime = new Date().getTime();
            this._stream.pause();
        } catch (err) {}
    }
    cb();
};

module.exports = BandwidthThrottle;
