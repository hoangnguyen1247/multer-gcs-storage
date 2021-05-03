import fs from 'fs';
import path from 'path';
import extend from 'xtend';
import assert from 'assert';
import multer from 'multer';
import stream from 'stream';
import FormData from 'form-data'
import onFinished from 'on-finished';

import mockGCS from './util/mock-gcs';
import multerGCSStorage from '../';

var VALID_OPTIONS = {
    bucket: 'string'
}

var INVALID_OPTIONS = [
    ['numeric key', { key: 1337 }],
    ['string key', { key: 'string' }],
    ['numeric bucket', { bucket: 1337 }],
    ['numeric contentType', { contentType: 1337 }]
]

function submitForm(multer, form, cb) {
    form.getLength(function (err, length) {
        if (err) return cb(err)

        var req: any = new stream.PassThrough()

        req.complete = false
        form.once('end', function () {
            req.complete = true
        })

        form.pipe(req)
        req.headers = {
            'content-type': 'multipart/form-data; boundary=' + form.getBoundary(),
            'content-length': length
        }

        multer(req, null, function (err) {
            onFinished(req, function () { cb(err, req) })
        })
    })
}

describe('Multer GCS Storage', function () {
    it('is exposed as a function', function () {
        assert.equal(typeof multerGCSStorage, 'function')
    })

    INVALID_OPTIONS.forEach(function (testCase) {
        it('throws when given ' + testCase[0], function () {
            function testBody() {
                multerGCSStorage(extend(VALID_OPTIONS, testCase[1]))
            }

            assert.throws(testBody, TypeError)
        })
    })

    it('upload files', async function () {
        var gcs = mockGCS()
        var form = new FormData()
        var storage = multerGCSStorage({ gcsClient: gcs, bucket: 'test' })
        var upload = multer({ storage: storage })
        var parser = upload.single('image')
        var image = fs.createReadStream(path.join(__dirname, 'files', 'ffffff.png'))

        form.append('name', 'Multer')
        form.append('image', image)

        submitForm(parser, form, function (err, req) {
            assert.ifError(err)

            assert.equal(req.body.name, 'Multer')

            assert.equal(req.file.fieldname, 'image')
            assert.equal(req.file.originalname, 'ffffff.png')
            assert.equal(req.file.size, 68)
            assert.equal(req.file.bucket, 'test')
            assert.equal(req.file.etag, 'mock-etag')
            assert.equal(req.file.location, 'mock-location')

            // done()
        })
    })

    it('uploads PNG file with correct content-type', async function () {
        var gcs = mockGCS()
        var form = new FormData()
        var storage = multerGCSStorage({ gcsClient: gcs, bucket: 'test', serverSideEncryption: 'aws:kms', contentType: multerGCSStorage.AUTO_CONTENT_TYPE })
        var upload = multer({ storage: storage })
        var parser = upload.single('image')
        var image = fs.createReadStream(path.join(__dirname, 'files', 'ffffff.png'))

        form.append('name', 'Multer')
        form.append('image', image)

        submitForm(parser, form, function (err, req) {
            assert.ifError(err)

            assert.equal(req.body.name, 'Multer')

            assert.equal(req.file.fieldname, 'image')
            assert.equal(req.file.contentType, 'image/png')
            assert.equal(req.file.originalname, 'ffffff.png')
            assert.equal(req.file.size, 68)
            assert.equal(req.file.bucket, 'test')
            assert.equal(req.file.etag, 'mock-etag')
            assert.equal(req.file.location, 'mock-location')
            assert.equal(req.file.serverSideEncryption, 'aws:kms')

            // done()
        })
    })

    it('uploads SVG file with correct content-type', async function () {
        var gcs = mockGCS()
        var form = new FormData()
        var storage = multerGCSStorage({ gcsClient: gcs, bucket: 'test', serverSideEncryption: 'aws:kms', contentType: multerGCSStorage.AUTO_CONTENT_TYPE })
        var upload = multer({ storage: storage })
        var parser = upload.single('image')
        var image = fs.createReadStream(path.join(__dirname, 'files', 'test.svg'))

        form.append('name', 'Multer')
        form.append('image', image)

        submitForm(parser, form, function (err, req) {
            assert.ifError(err)

            assert.equal(req.body.name, 'Multer')

            assert.equal(req.file.fieldname, 'image')
            assert.equal(req.file.contentType, 'image/svg+xml')
            assert.equal(req.file.originalname, 'test.svg')
            assert.equal(req.file.size, 100)
            assert.equal(req.file.bucket, 'test')
            assert.equal(req.file.etag, 'mock-etag')
            assert.equal(req.file.location, 'mock-location')
            assert.equal(req.file.serverSideEncryption, 'aws:kms')

            // done()
        })
    })
})
