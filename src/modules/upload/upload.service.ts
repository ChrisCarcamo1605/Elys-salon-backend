import { Injectable, InternalServerErrorException } from '@nestjs/common';
import { S3Client, PutObjectCommand } from '@aws-sdk/client-s3';
import { v4 as uuidv4 } from 'uuid';
import * as path from 'path';
import { AppLogger } from '../../common/utils/logger';

@Injectable()
export class UploadService {
  private readonly s3: S3Client;
  private readonly bucket: string;
  private readonly publicBase: string;
  private readonly logger = new AppLogger('UploadService');

  constructor() {
    const endpoint = process.env.S3_ENDPOINT!;
    this.bucket = process.env.S3_BUCKET!;
    this.publicBase = `${endpoint}/${this.bucket}`;

    this.s3 = new S3Client({
      endpoint,
      region: process.env.S3_REGION ?? 'auto',
      credentials: {
        accessKeyId: process.env.S3_ACCESS_KEY!,
        secretAccessKey: process.env.S3_SECRET_KEY!,
      },
      forcePathStyle: true,
    });
  }

  async uploadImage(file: Express.Multer.File): Promise<string> {
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
      this.logger.errorWithContext({
        message: 'S3 upload failed',
        error: err,
        context: {
          bucket: this.bucket,
          endpoint: process.env.S3_ENDPOINT,
          key,
          fileSize: file.size,
          mimetype: file.mimetype,
        },
      });
      throw new InternalServerErrorException(
        'Error al subir la imagen al almacenamiento',
        { cause: err },
      );
    }

    return `${this.publicBase}/${key}`;
  }
}
