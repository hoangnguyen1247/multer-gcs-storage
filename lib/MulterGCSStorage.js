"use strict";

var _interopRequireDefault = require("@babel/runtime/helpers/interopRequireDefault");

Object.defineProperty(exports, "__esModule", {
  value: true
});
exports["default"] = _default;
exports.DEFAULT_CONTENT_TYPE = exports.AUTO_CONTENT_TYPE = void 0;

var _typeof2 = _interopRequireDefault(require("@babel/runtime/helpers/typeof"));

var _crypto = _interopRequireDefault(require("crypto"));

var _stream = _interopRequireDefault(require("stream"));

var _fileType = _interopRequireDefault(require("file-type"));

var _isSvg = _interopRequireDefault(require("is-svg"));

var _runParallel = _interopRequireDefault(require("run-parallel"));

var _sharp = _interopRequireDefault(require("sharp"));

var _parseFilekey = require("./utils/parse-filekey");

function staticValue(value) {
  return function (req, file, cb) {
    cb(null, value);
  };
}

var defaultAcl = staticValue('private');
var defaultContentType = staticValue('application/octet-stream');
var defaultMetadata = staticValue(null);
var defaultCacheControl = staticValue(null);
var defaultContentDisposition = staticValue(null);
var defaultStorageClass = staticValue('STANDARD');
var defaultSSE = staticValue(null);
var defaultSSEKMS = staticValue(null);
var defaultShouldCreateThumbnail = staticValue(null);
var defaultShouldCreateFeatured = staticValue(null);

function defaultKey(req, file, cb) {
  _crypto["default"].randomBytes(16, function (err, raw) {
    cb(err, err ? undefined : raw.toString('hex'));
  });
}

function autoContentType(req, file, cb) {
  file.stream.once('data', function (firstChunk) {
    var type = (0, _fileType["default"])(firstChunk);
    var mime;

    if (type) {
      mime = type.mime;
    } else if ((0, _isSvg["default"])(firstChunk)) {
      mime = 'image/svg+xml';
    } else {
      mime = 'application/octet-stream';
    }

    var outStream = new _stream["default"].PassThrough();
    outStream.write(firstChunk);
    file.stream.pipe(outStream);
    cb(null, mime, outStream);
  });
}

function collect(storage, req, file, cb) {
  (0, _runParallel["default"])([storage.getBucket.bind(storage, req, file), storage.getKey.bind(storage, req, file), storage.getAcl.bind(storage, req, file), storage.getMetadata.bind(storage, req, file), storage.getCacheControl.bind(storage, req, file), storage.getContentDisposition.bind(storage, req, file), storage.getStorageClass.bind(storage, req, file), storage.getSSE.bind(storage, req, file), storage.getSSEKMS.bind(storage, req, file), storage.getShouldCreateThumbnail.bind(storage, req, file), storage.getShouldCreateFeatured.bind(storage, req, file)], function (err, values) {
    if (err) return cb(err);
    storage.getContentType(req, file, function (err, contentType, replacementStream) {
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
        shouldCreateFeatured: values[10]
      });
    });
  });
}

function GCSStorage(opts) {
  switch ((0, _typeof2["default"])(opts.gcsClient)) {
    case 'object':
      this.gcsClient = opts.gcsClient;
      break;

    default:
      throw new TypeError('Expected opts.gcsClient to be object');
  }

  switch ((0, _typeof2["default"])(opts.bucket)) {
    case 'function':
      this.getBucket = opts.bucket;
      break;

    case 'string':
      this.getBucket = staticValue(opts.bucket);
      break;

    case 'undefined':
      throw new Error('bucket is required');

    default:
      throw new TypeError('Expected opts.bucket to be undefined, string or function');
  }

  switch ((0, _typeof2["default"])(opts.key)) {
    case 'function':
      this.getKey = opts.key;
      break;

    case 'undefined':
      this.getKey = defaultKey;
      break;

    default:
      throw new TypeError('Expected opts.key to be undefined or function');
  }

  switch ((0, _typeof2["default"])(opts.acl)) {
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
      throw new TypeError('Expected opts.acl to be undefined, string or function');
  }

  switch ((0, _typeof2["default"])(opts.contentType)) {
    case 'function':
      this.getContentType = opts.contentType;
      break;

    case 'undefined':
      this.getContentType = defaultContentType;
      break;

    default:
      throw new TypeError('Expected opts.contentType to be undefined or function');
  }

  switch ((0, _typeof2["default"])(opts.metadata)) {
    case 'function':
      this.getMetadata = opts.metadata;
      break;

    case 'undefined':
      this.getMetadata = defaultMetadata;
      break;

    default:
      throw new TypeError('Expected opts.metadata to be undefined or function');
  }

  switch ((0, _typeof2["default"])(opts.cacheControl)) {
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
      throw new TypeError('Expected opts.cacheControl to be undefined, string or function');
  }

  switch ((0, _typeof2["default"])(opts.contentDisposition)) {
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
      throw new TypeError('Expected opts.contentDisposition to be undefined, string or function');
  }

  switch ((0, _typeof2["default"])(opts.storageClass)) {
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
      throw new TypeError('Expected opts.storageClass to be undefined, string or function');
  }

  switch ((0, _typeof2["default"])(opts.serverSideEncryption)) {
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
      throw new TypeError('Expected opts.serverSideEncryption to be undefined, string or function');
  }

  switch ((0, _typeof2["default"])(opts.sseKmsKeyId)) {
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
      throw new TypeError('Expected opts.sseKmsKeyId to be undefined, string, or function');
  }

  switch ((0, _typeof2["default"])(opts.shouldCreateThumbnail)) {
    case 'function':
      this.getShouldCreateThumbnail = opts.shouldCreateThumbnail;
      break;

    case 'boolean':
      this.getShouldCreateThumbnail = staticValue(opts.shouldCreateThumbnail);
      break;

    case 'undefined':
      this.getShouldCreateThumbnail = defaultShouldCreateThumbnail;
      break;

    default:
      throw new TypeError('Expected opts.shouldCreateThumbnail to be undefined, boolean, or function');
  }

  switch ((0, _typeof2["default"])(opts.shouldCreateFeatured)) {
    case 'function':
      this.getShouldCreateFeatured = opts.shouldCreateFeatured;
      break;

    case 'boolean':
      this.getShouldCreateFeatured = staticValue(opts.shouldCreateFeatured);
      break;

    case 'undefined':
      this.getShouldCreateFeatured = defaultShouldCreateFeatured;
      break;

    default:
      throw new TypeError('Expected opts.shouldCreateFeatured to be undefined, boolean, or function');
  }
}

GCSStorage.prototype._handleFile = function (req, file, cb) {
  collect(this, req, file, function (err, opts) {
    if (err) return cb(err);
    var currentSize = 0;
    var params = {
      Bucket: opts.bucket,
      Key: opts.key,
      ACL: opts.acl,
      CacheControl: opts.cacheControl,
      ContentType: opts.contentType,
      Metadata: opts.metadata,
      StorageClass: opts.storageClass,
      ServerSideEncryption: opts.serverSideEncryption,
      SSEKMSKeyId: opts.sseKmsKeyId,
      Body: opts.replacementStream || file.stream
    };

    if (opts.contentDisposition) {
      params.ContentDisposition = opts.contentDisposition;
    }

    var sharpStream = (0, _sharp["default"])();
    var thumbStream = new _stream["default"].PassThrough();
    var featuredStream = new _stream["default"].PassThrough();
    sharpStream.clone().resize(320, 320, {
      fit: _sharp["default"].fit.cover
    }).pipe(thumbStream);
    sharpStream.clone().resize(320, 180, {
      fit: _sharp["default"].fit.cover
    }).pipe(featuredStream);
    file.stream.pipe(sharpStream);

    if (opts.shouldCreateThumbnail) {
      this.gcsClient.bucket(opts.bucket).upload(thumbStream, {
        destination: (0, _parseFilekey.parseFileKey)(opts.key, 'thumb')
      }).then(function () {
        cb(null, {
          size: currentSize,
          bucket: opts.bucket,
          key: opts.key,
          acl: opts.acl,
          contentType: opts.contentType,
          contentDisposition: opts.contentDisposition,
          storageClass: opts.storageClass,
          serverSideEncryption: opts.serverSideEncryption,
          metadata: opts.metadata,
          // location: result.Location,
          etag: "" // versionId: result.VersionId,

        });
      })["catch"](function (err) {
        cb(err);
      });
    }

    if (opts.shouldCreateFeatured) {
      this.gcsClient.bucket(opts.bucket).upload(featuredStream, {
        destination: (0, _parseFilekey.parseFileKey)(opts.key, 'featured')
      }).then(function () {
        cb(null, {
          size: currentSize,
          bucket: opts.bucket,
          key: opts.key,
          acl: opts.acl,
          contentType: opts.contentType,
          contentDisposition: opts.contentDisposition,
          storageClass: opts.storageClass,
          serverSideEncryption: opts.serverSideEncryption,
          metadata: opts.metadata,
          // location: result.Location,
          etag: "" // versionId: result.VersionId,

        });
      })["catch"](function (err) {
        cb(err);
      });
    }

    this.gcsClient.bucket(opts.bucket).upload(file.stream, {
      destination: opts.key
    }).then(function () {
      cb(null, {
        size: currentSize,
        bucket: opts.bucket,
        key: opts.key,
        acl: opts.acl,
        contentType: opts.contentType,
        contentDisposition: opts.contentDisposition,
        storageClass: opts.storageClass,
        serverSideEncryption: opts.serverSideEncryption,
        metadata: opts.metadata,
        // location: result.Location,
        etag: "" // versionId: result.VersionId,

      });
    })["catch"](function (err) {
      cb(err);
    });
  });
};

GCSStorage.prototype._removeFile = function (req, file, cb) {
  this.gcsClient.removeObject(file.bucket, file.key, cb);
  this.gcsClient.removeObject(file.bucket, (0, _parseFilekey.parseFileKey)(file.key, '-thumb'), cb);
  this.gcsClient.removeObject(file.bucket, (0, _parseFilekey.parseFileKey)(file.key, '-featured'), cb);
};

function _default(opts) {
  return new GCSStorage(opts);
}

var AUTO_CONTENT_TYPE = autoContentType;
exports.AUTO_CONTENT_TYPE = AUTO_CONTENT_TYPE;
var DEFAULT_CONTENT_TYPE = defaultContentType;
exports.DEFAULT_CONTENT_TYPE = DEFAULT_CONTENT_TYPE;