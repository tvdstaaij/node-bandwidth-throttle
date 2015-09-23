var program = require('commander');
var net = require('net');
var BandwidthThrottle = require('../index');

program
    .option('-p, --port <port>', 'tcp port to listen on (required)', parseInt)
    .option('-r, --rate <bps>',
        'average byte rate to throttle to (required)', parseInt)
    .option('-m, --max-pause-time <ms>',
        'time limit for blocking the stream to prevent socket inactivity',
        parseInt)
    .option('-i, --cooldown-interval <ms>',
        'how often to re-calculate bandwidth', parseInt)
    .parse(process.argv);

if (!program.port || !program.rate)
    program.help();

net.createServer(function(socket) {
    console.log('Connection from ' +
        socket.remoteAddress + ':' + socket.remotePort);
    var throttledStream = socket.pipe(new BandwidthThrottle(socket, {
        averageRate: program.rate,
        maxPauseTime: program.maxPauseTime || undefined,
        cooldownInterval: program.cooldownInterval || undefined
    }));
    var chunkCount = 0;
    var byteCount = 0;
    throttledStream.on('data', function(chunk) {
        chunkCount++;
        byteCount += chunk.length;
    });
    var lastByteCount = 0;
    setInterval(function() {
        console.log('HBC:' + String(throttledStream._hotByteCount) +
            ', ' + String(byteCount - lastByteCount) + ' bytes/second');
        console.log(chunkCount + ' chunks, ' + byteCount + ' bytes, ' +
            Math.round(byteCount / chunkCount) + ' bytes/chunk' + "\n");
        lastByteCount = byteCount;
    }, 1000);
}).listen(program.port);

console.log('Listening on port ' + program.port);
