import events from 'events';
import concat from 'concat-stream';

function createMockGCS(): any {

    function bucket(bucketName) {
        return this;
    }

    function upload(opts) {
        var ee: any = new events.EventEmitter()

        return new Promise((resolve) => {
            ee.send = function send(cb) {
                opts['Body'].pipe(concat(function (body) {
                    ee.emit('httpUploadProgress', { total: body.length })
                    cb(null, {
                        'Location': 'mock-location',
                        'ETag': 'mock-etag'
                    })
                    resolve({
                        'Location': 'mock-location',
                        'ETag': 'mock-etag'
                    })
                }))
            }

            return ee;
        })
    }

    function putObject(opts) {
        var ee: any = new events.EventEmitter()

        return new Promise((resolve) => {
            ee.send = function send(cb) {
                opts['Body'].pipe(concat(function (body) {
                    ee.emit('httpUploadProgress', { total: body.length })
                    cb(null, {
                        'Location': 'mock-location',
                        'ETag': 'mock-etag'
                    })
                    resolve({
                        'Location': 'mock-location',
                        'ETag': 'mock-etag'
                    })
                }))
            }

            return ee;
        })
    }

    return {
        bucket,
        upload: upload,
        putObject: putObject,
    }
}

export default createMockGCS;
