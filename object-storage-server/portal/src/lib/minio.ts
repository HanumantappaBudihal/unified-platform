import * as Minio from 'minio';
import { config } from './config';

let clientInstance: Minio.Client | null = null;

export function getMinioClient(): Minio.Client {
  if (!clientInstance) {
    clientInstance = new Minio.Client({
      endPoint: config.minio.endPoint,
      port: config.minio.port,
      useSSL: config.minio.useSSL,
      accessKey: config.minio.accessKey,
      secretKey: config.minio.secretKey,
    });
  }
  return clientInstance;
}

export async function listBuckets() {
  const client = getMinioClient();
  const buckets = await client.listBuckets();
  const details = await Promise.all(
    buckets.map(async (b) => {
      let objectCount = 0;
      let totalSize = 0;
      let versioning = false;

      try {
        const stream = client.listObjectsV2(b.name, '', true);
        for await (const obj of stream) {
          objectCount++;
          totalSize += obj.size || 0;
        }
      } catch {}

      try {
        const v = await client.getBucketVersioning(b.name);
        versioning = (v as any).Status === 'Enabled' || (v as any).status === 'Enabled';
      } catch {}

      return {
        name: b.name,
        creationDate: b.creationDate,
        objectCount,
        totalSize,
        versioning,
      };
    })
  );
  return details;
}

export async function listObjects(bucket: string, prefix: string = '') {
  const client = getMinioClient();
  const objects: any[] = [];

  // List "folders" and files at this prefix level
  const stream = client.listObjectsV2(bucket, prefix, false);
  for await (const obj of stream) {
    objects.push({
      name: obj.name,
      prefix: obj.prefix,
      size: obj.size,
      lastModified: obj.lastModified,
      etag: obj.etag,
      isDir: !!obj.prefix,
    });
  }
  return objects;
}

export async function getPresignedUrl(bucket: string, object: string, expirySeconds: number = 3600) {
  const client = getMinioClient();
  return client.presignedGetObject(bucket, object, expirySeconds);
}

export async function deleteObject(bucket: string, object: string) {
  const client = getMinioClient();
  await client.removeObject(bucket, object);
}

export async function getObjectVersions(bucket: string, object: string) {
  // MinIO SDK doesn't directly support listing versions easily,
  // but we can use the extensions API
  const client = getMinioClient();
  const versions: any[] = [];

  try {
    const stream = client.extensions.listObjectsV2WithMetadata(bucket, object, true);
    for await (const obj of stream) {
      if (obj.name === object) {
        versions.push(obj);
      }
    }
  } catch {
    // Fallback: return current version only
    try {
      const stat = await client.statObject(bucket, object);
      versions.push({
        name: object,
        size: stat.size,
        lastModified: stat.lastModified,
        etag: stat.etag,
        versionId: stat.versionId || 'current',
      });
    } catch {}
  }

  return versions;
}
