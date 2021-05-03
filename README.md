# Multer GCS (Google cloud storage) Storage

GCS storage for Multer.

## Installation

```sh
npm install --save multer-gcs-storage
```

## Usage

```javascript
import { Storage } from "@google-cloud/storage";
import express from 'express';
import multer from 'multer';
import multerGCSStorage from 'multer-minio-storage';

const app = express();
const storageClient = new Storage({ projectId: config.gc.projectId, keyFilename: config.gc.keyFilename });

const upload = multer({
  storage: multerGCSStorage({
    gcsClient: storageClient,
    bucket: 'some-bucket',
    metadata: function (req, file, cb) {
      cb(null, {fieldName: file.fieldname});
    },
    key: function (req, file, cb) {
      cb(null, Date.now().toString())
    }
  })
})

app.post('/upload', upload.array('photos', 3), function(req, res, next) {
  res.send('Successfully uploaded ' + req.files.length + ' files!')
})
```

### File information

Each file contains the following information exposed by `multer-gcs-storage`:

Key | Description | Note
--- | --- | ---
`size` | Size of the file in bytes |
`bucket` | The bucket used to store the file | `MulterGCSStorage`
`key` | The name of the file | `MulterGCSStorage`
`acl` | Access control for the file | `MulterGCSStorage`
`contentType` | The `mimetype` used to upload the file | `MulterGCSStorage`
`metadata` | The `metadata` object to be sent to Minio | `MulterGCSStorage`
`location` | The Minio `url` to access the file  | `MulterGCSStorage`
`etag` | The `etag`of the uploaded file in Minio  | `MulterGCSStorage`
`contentDisposition` | The `contentDisposition` used to upload the file | `MulterGCSStorage`
`storageClass` | The `storageClass` to be used for the uploaded file in Minio | `MulterGCSStorage`
`versionId` | The `versionId` is an optional param returned by Minio for versioned buckets. | `MulterGCSStorage`

## Testing

The tests mock all access to S3 and can be run completely offline.

```sh
npm test
```
