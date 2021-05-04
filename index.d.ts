import { Storage } from "@google-cloud/storage";
import { StorageEngine } from "multer";

interface Options {
    gcsClient: Storage;
    bucket: ((req: Express.Request, file: Express.Multer.File, callback: (error: any, bucket?: string) => void) => void) | string;
    key?(req: Express.Request, file: Express.Multer.File, callback: (error: any, key?: string) => void): void;
    acl?: ((req: Express.Request, file: Express.Multer.File, callback: (error: any, acl?: string) => void) => void) | string;
    contentType?(req: Express.Request, file: Express.Multer.File, callback: (error: any, mime?: string, stream?: NodeJS.ReadableStream) => void): void;
    metadata?(req: Express.Request, file: Express.Multer.File, callback: (error: any, metadata?: any) => void): void;
    cacheControl?: ((req: Express.Request, file: Express.Multer.File, callback: (error: any, cacheControl?: string) => void) => void) | string;
    serverSideEncryption?: ((req: Express.Request, file: Express.Multer.File, callback: (error: any, serverSideEncryption?: string) => void) => void) | string;
    shouldCreateThumbnail?: boolean,
    shouldCreateFeatured?: boolean,
}

declare global {
    namespace Express {
        namespace MulterGCSStorage {
            interface File extends Multer.File {
                bucket: string;
                key: string;
                acl: string;
                contentType: string;
                contentDisposition: null;
                storageClass: string;
                serverSideEncryption: null;
                metadata: any;
                location: string;
                etag: string;
            }
        }
    }
}

interface MulterGCSStorage {
    (options?: Options): StorageEngine;

    AUTO_CONTENT_TYPE(
        req: Express.Request,
        file: Express.Multer.File,
        callback: (error: any, mime?: string, stream?: NodeJS.ReadableStream) => void): void;
    DEFAULT_CONTENT_TYPE(
        req: Express.Request,
        file: Express.Multer.File,
        callback: (error: any, mime?: string) => void): void;
}

declare const multerGCSStorage: MulterGCSStorage;
export = multerGCSStorage;
