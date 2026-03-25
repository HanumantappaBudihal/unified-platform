# Integration Guide

## Connecting Your Application to the Storage Server

The storage server exposes a standard **S3-compatible API** at `http://localhost:9000`. Any S3 SDK works.

## Node.js (minio SDK)

### Install
```bash
npm install minio
```

### Basic Usage
```javascript
const Minio = require('minio');

const storage = new Minio.Client({
  endPoint: 'localhost',    // Use 'storage-nginx' inside Docker
  port: 9000,
  useSSL: false,
  accessKey: 'your-app-key',
  secretKey: 'your-app-secret',
});

const BUCKET = 'your-app-bucket';
```

### Upload a File
```javascript
// From buffer
const buffer = Buffer.from('file contents');
await storage.putObject(BUCKET, 'path/to/file.txt', buffer, buffer.length, {
  'Content-Type': 'text/plain',
});

// From file stream
const fs = require('fs');
const stream = fs.createReadStream('/local/path/image.png');
const stat = fs.statSync('/local/path/image.png');
await storage.putObject(BUCKET, 'images/photo.png', stream, stat.size, {
  'Content-Type': 'image/png',
});
```

### Download a File
```javascript
const stream = await storage.getObject(BUCKET, 'path/to/file.txt');
let content = '';
for await (const chunk of stream) {
  content += chunk;
}
console.log(content);

// Save to local file
await storage.fGetObject(BUCKET, 'images/photo.png', '/local/download/photo.png');
```

### List Files
```javascript
// List all objects in a prefix
const stream = storage.listObjectsV2(BUCKET, 'images/', true);
for await (const obj of stream) {
  console.log(`${obj.name} - ${obj.size} bytes`);
}
```

### Generate Presigned URL (Share Link)
```javascript
// Read-only link, expires in 1 hour (3600 seconds)
const url = await storage.presignedGetObject(BUCKET, 'reports/q1.pdf', 3600);

// Upload link (allow external upload without credentials)
const uploadUrl = await storage.presignedPutObject(BUCKET, 'uploads/new-file.pdf', 3600);
```

### Delete a File
```javascript
await storage.removeObject(BUCKET, 'path/to/file.txt');

// Delete multiple
await storage.removeObjects(BUCKET, ['file1.txt', 'file2.txt', 'file3.txt']);
```

### Check if File Exists
```javascript
try {
  const stat = await storage.statObject(BUCKET, 'path/to/file.txt');
  console.log(`Size: ${stat.size}, Modified: ${stat.lastModified}`);
} catch (err) {
  if (err.code === 'NotFound') console.log('File does not exist');
}
```

## Python (boto3)

### Install
```bash
pip install boto3
```

### Usage
```python
import boto3

s3 = boto3.client('s3',
    endpoint_url='http://localhost:9000',
    aws_access_key_id='your-app-key',
    aws_secret_access_key='your-app-secret',
    region_name='us-east-1'
)

BUCKET = 'your-app-bucket'

# Upload
s3.put_object(Bucket=BUCKET, Key='docs/report.pdf', Body=open('report.pdf', 'rb'))

# Download
response = s3.get_object(Bucket=BUCKET, Key='docs/report.pdf')
content = response['Body'].read()

# List
response = s3.list_objects_v2(Bucket=BUCKET, Prefix='docs/')
for obj in response.get('Contents', []):
    print(f"{obj['Key']} - {obj['Size']} bytes")

# Presigned URL
url = s3.generate_presigned_url('get_object',
    Params={'Bucket': BUCKET, 'Key': 'docs/report.pdf'},
    ExpiresIn=3600
)
```

## Java (AWS SDK v2)

### Maven Dependency
```xml
<dependency>
    <groupId>software.amazon.awssdk</groupId>
    <artifactId>s3</artifactId>
    <version>2.25.0</version>
</dependency>
```

### Usage
```java
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.*;
import software.amazon.awssdk.auth.credentials.*;
import java.net.URI;

S3Client s3 = S3Client.builder()
    .endpointOverride(URI.create("http://localhost:9000"))
    .credentialsProvider(StaticCredentialsProvider.create(
        AwsBasicCredentials.create("your-app-key", "your-app-secret")
    ))
    .region(Region.US_EAST_1)
    .forcePathStyle(true)  // Required for MinIO
    .build();

// Upload
s3.putObject(
    PutObjectRequest.builder().bucket("your-bucket").key("file.txt").build(),
    RequestBody.fromString("content")
);

// Download
ResponseInputStream<GetObjectResponse> resp = s3.getObject(
    GetObjectRequest.builder().bucket("your-bucket").key("file.txt").build()
);
```

## Go

```go
package main

import (
    "github.com/minio/minio-go/v7"
    "github.com/minio/minio-go/v7/pkg/credentials"
)

func main() {
    client, _ := minio.New("localhost:9000", &minio.Options{
        Creds:  credentials.NewStaticV4("your-app-key", "your-app-secret", ""),
        Secure: false,
    })

    // Upload
    client.FPutObject(ctx, "your-bucket", "file.txt", "/local/file.txt", minio.PutObjectOptions{
        ContentType: "text/plain",
    })
}
```

## Docker (Inside Docker Network)

When your app runs inside Docker on the same network, use:
```
Endpoint: storage-nginx
Port: 9000
```

Docker Compose example:
```yaml
services:
  my-app:
    image: my-app:latest
    environment:
      S3_ENDPOINT: storage-nginx
      S3_PORT: "9000"
      S3_ACCESS_KEY: your-app-key
      S3_SECRET_KEY: your-app-secret
      S3_BUCKET: your-app-bucket
    networks:
      - centralized-object-storage-server_storage-net
```

## Common Patterns

### Cache-Aside with Storage
```javascript
async function getFile(key) {
  // 1. Check cache (Redis)
  const cached = await redis.get(`file:${key}`);
  if (cached) return JSON.parse(cached);

  // 2. Fetch from storage
  const stream = await storage.getObject(BUCKET, key);
  const data = await streamToBuffer(stream);

  // 3. Cache for next time
  await redis.setex(`file:${key}`, 3600, JSON.stringify({ size: data.length, key }));
  return data;
}
```

### Upload with Event Notification (Kafka)
```javascript
async function uploadDocument(file, metadata) {
  // 1. Upload to MinIO
  await storage.putObject(BUCKET, file.path, file.buffer);

  // 2. Notify via Kafka
  await kafka.send({
    topic: 'document-events',
    messages: [{
      key: file.path,
      value: JSON.stringify({
        event: 'uploaded',
        bucket: BUCKET,
        path: file.path,
        size: file.buffer.length,
        metadata,
        timestamp: new Date().toISOString(),
      }),
    }],
  });
}
```
