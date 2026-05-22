import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { AppLogger } from '../../common/utils/logger';

const SIGNED_URL_TTL = 3600; // 1 hour

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly presigner: S3Client;
  private readonly bucket: string;
  private readonly endpointPrefix: string;

  constructor() {
    const required = ['S3_ENDPOINT', 'S3_BUCKET', 'S3_ACCESS_KEY', 'S3_SECRET_KEY'];
    const missing = required.filter((k) => !process.env[k]);
    if (missing.length > 0) {
      throw new Error(`UploadService: missing required env vars: ${missing.join(', ')}`);
    }

    const endpoint = process.env.S3_ENDPOINT!;
    this.bucket = process.env.S3_BUCKET!;
    this.endpointPrefix = `${endpoint}/${this.bucket}/`;

    const credentials = {
      accessKeyId: process.env.S3_ACCESS_KEY!,
      secretAccessKey: process.env.S3_SECRET_KEY!,
    };
    const region = process.env.S3_REGION ?? 'auto';

    // PutObject requires path-style for Tigris API calls
    this.s3 = new S3Client({ endpoint, region, credentials, forcePathStyle: true });

    // Presigned URLs must use virtual-hosted style so the browser can load the object
    this.presigner = new S3Client({ endpoint, region, credentials, forcePathStyle: false });
  }

  async uploadImage(file: Express.Multer.File): Promise<{ key: string; signedUrl: string }> {
    const ext = path.extname(file.originalname).toLowerCase() || '.jpg';
    const key = `catalog/${uuidv4()}${ext}`;

    try {
      await this.s3.send(
        new PutObjectCommand({
          Bucket: this.bucket,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );
    } catch (err) {
      throw new InternalServerErrorException('Error al subir la imagen al almacenamiento', { cause: err });
    }

    const signedUrl = await this.signKey(key);
    return { key, signedUrl };
  }

  async signKey(key: string): Promise<string> {
    const command = new GetObjectCommand({ Bucket: this.bucket, Key: key });
    return getSignedUrl(this.presigner, command, { expiresIn: SIGNED_URL_TTL });
  }

  /** Resolves a stored image value (key or full/signed URL pointing to this bucket) to a signed URL.
   *  Returns null for empty values. Returns the value as-is for external URLs. */
  async resolveImage(value: string | null | undefined): Promise<string | null> {
    if (!value) return null;
    if (!value.startsWith('http')) return this.signKey(value);

    const parsed = new URL(value);
    // External URL not from this bucket — return as-is
    if (!parsed.pathname.startsWith(`/${this.bucket}/`)) return value;

    // Strip bucket prefix and any query params (handles plain URLs and signed URLs)
    const key = parsed.pathname.replace(`/${this.bucket}/`, '');
    return this.signKey(key);
  }

  async resolveItems<T extends { image?: string | null }>(items: T[]): Promise<T[]> {
    return Promise.all(
      items.map(async (item) => ({
        ...item,
        image: await this.resolveImage(item.image),
      })),
    );
  }
}
