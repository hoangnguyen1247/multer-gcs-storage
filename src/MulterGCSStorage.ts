import crypto from 'crypto';
import stream from 'stream';
import fileType from 'file-type';
import mime from 'mime-types';
import isSvg from 'is-svg';
import parallel from 'run-parallel';
import sharp from 'sharp';

import { parseFileKey } from './utils/parse-filekey';

function staticValue(value) {
    return function (req, file, cb) {
        cb(null, value);
    };
}

const defaultAcl = staticValue('private');
const defaultContentType = staticValue('application/octet-stream');

const defaultMetadata = staticValue(null);
const defaultCacheControl = staticValue(null);
const defaultContentDisposition = staticValue(null);
const defaultStorageClass = staticValue('STANDARD');
const defaultSSE = staticValue(null);
const defaultSSEKMS = staticValue(null);
const defaultShouldCreateThumbnail = staticValue(null);
const defaultShouldCreateFeatured = staticValue(null);

function defaultKey(req, file, cb) {
    crypto.randomBytes(16, (err, raw) => {
        cb(err, err ? undefined : raw.toString('hex'));
    });
}

function autoContentType(req, file, cb) {
    file.stream.once('data', (firstChunk) => {
        const type = fileType(firstChunk);
        let mime;

        if (type) {
            mime = type.mime;
        } else if (isSvg(firstChunk)) {
            mime = 'image/svg+xml';
        } else {
            mime = 'application/octet-stream';
        }

        const outStream = new stream.PassThrough();

        outStream.write(firstChunk);
        file.stream.pipe(outStream);

        cb(null, mime, outStream);
    });
}

function collect(storage, req, file, cb) {
    parallel(
        [
            storage.getBucket.bind(storage, req, file),
            storage.getKey.bind(storage, req, file),
            storage.getAcl.bind(storage, req, file),
            storage.getMetadata.bind(storage, req, file),
            storage.getCacheControl.bind(storage, req, file),
            storage.getContentDisposition.bind(storage, req, file),
            storage.getStorageClass.bind(storage, req, file),
            storage.getSSE.bind(storage, req, file),
            storage.getSSEKMS.bind(storage, req, file),
            storage.getShouldCreateThumbnail.bind(storage, req, file),
            storage.getShouldCreateFeatured.bind(storage, req, file),
        ],
        (err, values) => {
            if (err) return cb(err);

            storage.getContentType(
                req,
                file,
                (err, contentType, replacementStream) => {
                    if (err) return cb(err);

                    cb.call(storage, null, {
                        bucket: values[0],
                        key: values[1],
                        acl: values[2],
                        metadata: values[3],
                        cacheControl: values[4],
                        contentDisposition: values[5],
                        storageClass: values[6],
                        contentType: contentType,
                        replacementStream: replacementStream,
                        serverSideEncryption: values[7],
                        sseKmsKeyId: values[8],
                        shouldCreateThumbnail: values[9],
                        shouldCreateFeatured: values[10],
                    });
                }
            );
        }
    );
}

function GCSStorage(opts) {
    switch (typeof opts.gcsClient) {
        case 'object':
            this.gcsClient = opts.gcsClient;
            break;
        default:
            throw new TypeError('Expected opts.gcsClient to be object');
    }

    switch (typeof opts.bucket) {
        case 'function':
            this.getBucket = opts.bucket;
            break;
        case 'string':
            this.getBucket = staticValue(opts.bucket);
            break;
        case 'undefined':
            throw new Error('bucket is required');
        default:
            throw new TypeError(
                'Expected opts.bucket to be undefined, string or function'
            );
    }

    switch (typeof opts.key) {
        case 'function':
            this.getKey = opts.key;
            break;
        case 'undefined':
            this.getKey = defaultKey;
            break;
        default:
            throw new TypeError(
                'Expected opts.key to be undefined or function'
            );
    }

    switch (typeof opts.acl) {
        case 'function':
            this.getAcl = opts.acl;
            break;
        case 'string':
            this.getAcl = staticValue(opts.acl);
            break;
        case 'undefined':
            this.getAcl = defaultAcl;
            break;
        default:
            throw new TypeError(
                'Expected opts.acl to be undefined, string or function'
            );
    }

    switch (typeof opts.contentType) {
        case 'function':
            this.getContentType = opts.contentType;
            break;
        case 'undefined':
            this.getContentType = defaultContentType;
            break;
        default:
            throw new TypeError(
                'Expected opts.contentType to be undefined or function'
            );
    }

    switch (typeof opts.metadata) {
        case 'function':
            this.getMetadata = opts.metadata;
            break;
        case 'undefined':
            this.getMetadata = defaultMetadata;
            break;
        default:
            throw new TypeError(
                'Expected opts.metadata to be undefined or function'
            );
    }

    switch (typeof opts.cacheControl) {
        case 'function':
            this.getCacheControl = opts.cacheControl;
            break;
        case 'string':
            this.getCacheControl = staticValue(opts.cacheControl);
            break;
        case 'undefined':
            this.getCacheControl = defaultCacheControl;
            break;
        default:
            throw new TypeError(
                'Expected opts.cacheControl to be undefined, string or function'
            );
    }

    switch (typeof opts.contentDisposition) {
        case 'function':
            this.getContentDisposition = opts.contentDisposition;
            break;
        case 'string':
            this.getContentDisposition = staticValue(opts.contentDisposition);
            break;
        case 'undefined':
            this.getContentDisposition = defaultContentDisposition;
            break;
        default:
            throw new TypeError(
                'Expected opts.contentDisposition to be undefined, string or function'
            );
    }

    switch (typeof opts.storageClass) {
        case 'function':
            this.getStorageClass = opts.storageClass;
            break;
        case 'string':
            this.getStorageClass = staticValue(opts.storageClass);
            break;
        case 'undefined':
            this.getStorageClass = defaultStorageClass;
            break;
        default:
            throw new TypeError(
                'Expected opts.storageClass to be undefined, string or function'
            );
    }

    switch (typeof opts.serverSideEncryption) {
        case 'function':
            this.getSSE = opts.serverSideEncryption;
            break;
        case 'string':
            this.getSSE = staticValue(opts.serverSideEncryption);
            break;
        case 'undefined':
            this.getSSE = defaultSSE;
            break;
        default:
            throw new TypeError(
                'Expected opts.serverSideEncryption to be undefined, string or function'
            );
    }

    switch (typeof opts.sseKmsKeyId) {
        case 'function':
            this.getSSEKMS = opts.sseKmsKeyId;
            break;
        case 'string':
            this.getSSEKMS = staticValue(opts.sseKmsKeyId);
            break;
        case 'undefined':
            this.getSSEKMS = defaultSSEKMS;
            break;
        default:
            throw new TypeError(
                'Expected opts.sseKmsKeyId to be undefined, string, or function'
            );
    }

    switch (typeof opts.shouldCreateThumbnail) {
        case 'function':
            this.getShouldCreateThumbnail = opts.shouldCreateThumbnail;
            break;
        case 'boolean':
            this.getShouldCreateThumbnail = staticValue(
                opts.shouldCreateThumbnail
            );
            break;
        case 'undefined':
            this.getShouldCreateThumbnail = defaultShouldCreateThumbnail;
            break;
        default:
            throw new TypeError(
                'Expected opts.shouldCreateThumbnail to be undefined, boolean, or function'
            );
    }

    switch (typeof opts.shouldCreateFeatured) {
        case 'function':
            this.getShouldCreateFeatured = opts.shouldCreateFeatured;
            break;
        case 'boolean':
            this.getShouldCreateFeatured = staticValue(
                opts.shouldCreateFeatured
            );
            break;
        case 'undefined':
            this.getShouldCreateFeatured = defaultShouldCreateFeatured;
            break;
        default:
            throw new TypeError(
                'Expected opts.shouldCreateFeatured to be undefined, boolean, or function'
            );
    }
}

GCSStorage.prototype._handleFile = function (req, file, cb) {
    collect(this, req, file, function (err, opts) {
        if (err) return cb(err);

        const currentSize = 0;

        const params: any = {
            Bucket: opts.bucket,
            Key: opts.key,
            ACL: opts.acl,
            CacheControl: opts.cacheControl,
            ContentType: opts.contentType,
            Metadata: opts.metadata,
            StorageClass: opts.storageClass,
            ServerSideEncryption: opts.serverSideEncryption,
            SSEKMSKeyId: opts.sseKmsKeyId,
            Body: opts.replacementStream || file.stream,
        };

        if (opts.contentDisposition) {
            params.ContentDisposition = opts.contentDisposition;
        }

        const type = mime.lookup(file.originalname);
        const sharpStream = sharp();
        const thumbStream = new stream.PassThrough();
        const featuredStream = new stream.PassThrough();
        sharpStream
            .clone()
            .resize(320, 320, { fit: sharp.fit.cover })
            .pipe(thumbStream);
        sharpStream
            .clone()
            .resize(320, 180, { fit: sharp.fit.cover })
            .pipe(featuredStream);
        file.stream.pipe(sharpStream);

        const bucket = this.gcsClient.bucket(opts.bucket);
        if (opts.shouldCreateThumbnail) {
            // this.gcsClient
            //     .bucket(opts.bucket)
            //     .upload(thumbStream, {
            //         destination: parseFileKey(opts.key, 'thumb'),
            //     })
            //     .then(() => {
            //         cb(null, {
            //             size: currentSize,
            //             bucket: opts.bucket,
            //             key: opts.key,
            //             acl: opts.acl,
            //             contentType: opts.contentType,
            //             contentDisposition: opts.contentDisposition,
            //             storageClass: opts.storageClass,
            //             serverSideEncryption: opts.serverSideEncryption,
            //             metadata: opts.metadata,
            //             // location: result.Location,
            //             etag: "",
            //             // versionId: result.VersionId,
            //         });
            //     })
            //     .catch(err => {
            //         cb(err);
            //     });

            const thumbBlob = bucket.file(parseFileKey(opts.key, 'thumb'));

            const thumbFileStream = thumbBlob.createWriteStream({
                resumable: true,
                contentType: type,
                predefinedAcl: 'publicRead',
            });

            thumbFileStream.on('error', (err) => {
                cb(err);
            });

            thumbFileStream.on('finish', () => {
                cb(null, {
                    size: thumbFileStream.bytesWritten,
                    filename: parseFileKey(opts.key, 'thumb'),
                    destination: `https://storage.googleapis.com/${bucket.name}/${thumbBlob.name}`,
                    url: `https://storage.googleapis.com/${bucket.name}/${thumbBlob.name}`,
                });
            });

            // thumbFileStream.end(req.file.buffer);
            thumbStream.pipe(thumbFileStream);
        }

        if (opts.shouldCreateFeatured) {
            // this.gcsClient
            //     .bucket(opts.bucket)
            //     .upload(featuredStream, {
            //         destination: parseFileKey(opts.key, 'featured'),
            //     })
            //     .then(() => {
            //         cb(null, {
            //             size: currentSize,
            //             bucket: opts.bucket,
            //             key: opts.key,
            //             acl: opts.acl,
            //             contentType: opts.contentType,
            //             contentDisposition: opts.contentDisposition,
            //             storageClass: opts.storageClass,
            //             serverSideEncryption: opts.serverSideEncryption,
            //             metadata: opts.metadata,
            //             // location: result.Location,
            //             etag: "",
            //             // versionId: result.VersionId,
            //         });
            //     })
            //     .catch(err => {
            //         cb(err);
            //     });

            const featuredBlob = bucket.file(
                parseFileKey(opts.key, 'featured')
            );

            const featuredFileStream = featuredBlob.createWriteStream({
                resumable: true,
                contentType: type,
                predefinedAcl: 'publicRead',
            });

            featuredFileStream.on('error', (err) => {
                cb(err);
            });

            featuredFileStream.on('finish', () => {
                cb(null, {
                    size: featuredFileStream.bytesWritten,
                    filename: parseFileKey(opts.key, 'featured'),
                    destination: `https://storage.googleapis.com/${bucket.name}/${featuredBlob.name}`,
                    url: `https://storage.googleapis.com/${bucket.name}/${featuredBlob.name}`,
                });
            });

            // featuredFileStream.end(req.file.buffer);
            featuredStream.pipe(featuredFileStream);
        }

        // this.gcsClient
        //     .bucket(opts.bucket)
        //     .upload(file.stream, {
        //         destination: opts.key,
        //     })
        //     .then(() => {
        //         cb(null, {
        //             size: currentSize,
        //             bucket: opts.bucket,
        //             key: opts.key,
        //             acl: opts.acl,
        //             contentType: opts.contentType,
        //             contentDisposition: opts.contentDisposition,
        //             storageClass: opts.storageClass,
        //             serverSideEncryption: opts.serverSideEncryption,
        //             metadata: opts.metadata,
        //             // location: result.Location,
        //             etag: "",
        //             // versionId: result.VersionId,
        //         });
        //     })
        //     .catch(err => {
        //         cb(err);
        //     });

        const primaryBlob = bucket.file(opts.key);

        const primaryFileStream = primaryBlob.createWriteStream({
            resumable: true,
            contentType: type,
            predefinedAcl: 'publicRead',
        });

        primaryFileStream.on('error', (err) => {
            cb(err);
        });

        primaryFileStream.on('finish', () => {
            cb(null, {
                size: primaryFileStream.bytesWritten,
                filename: opts.key,
                destination: `https://storage.googleapis.com/${bucket.name}/${primaryBlob.name}`,
                url: `https://storage.googleapis.com/${bucket.name}/${primaryBlob.name}`,
            });
        });

        // primaryFileStream.end(req.file.buffer);
        file.stream.pipe(primaryFileStream);
    });
};

GCSStorage.prototype._removeFile = function (req, file, cb) {
    this.gcsClient.bucket(file.bucket).file(file.key).delete();
    this.gcsClient
        .bucket(file.bucket)
        .file(parseFileKey(file.key, '-thumb'))
        .delete();
    this.gcsClient
        .bucket(file.bucket)
        .file(parseFileKey(file.key, '-featured'))
        .delete();

    cb({});
};

export default function (opts) {
    return new GCSStorage(opts);
}

export const AUTO_CONTENT_TYPE = autoContentType;
export const DEFAULT_CONTENT_TYPE = defaultContentType;
