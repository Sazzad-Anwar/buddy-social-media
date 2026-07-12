import { Injectable } from '@nestjs/common';
import { promises as fs } from 'fs';
import { randomUUID } from 'crypto';
import { join, dirname } from 'path';
import sharp from 'sharp';
import { UTApi, UTFile } from 'uploadthing/server';
import type {
  ProcessedPostImage,
  UploadedImageMeta,
  TemporaryPostImage,
} from '@repo/types';

export interface UploadedImageLikeFile {
  buffer: Buffer;
  originalname: string;
  size: number;
  mimetype: string;
}

@Injectable()
export class MediaService {
  private readonly rootDir = join(process.cwd(), 'uploads');
  private readonly utapi = new UTApi();

  private async ensureDir(filePath: string): Promise<void> {
    await fs.mkdir(dirname(filePath), { recursive: true });
  }

  async saveTemporaryUpload(
    file: UploadedImageLikeFile,
    postId: number,
  ): Promise<TemporaryPostImage> {
    const safeName = file.originalname.replace(/[^a-zA-Z0-9._-]/g, '_');
    const tempPath = join(
      this.rootDir,
      'tmp',
      'posts',
      String(postId),
      `${randomUUID()}-${safeName}`,
    );

    await this.ensureDir(tempPath);
    await fs.writeFile(tempPath, file.buffer);

    return {
      postId,
      tempPath,
      originalName: file.originalname,
      size: file.size,
      mimetype: file.mimetype,
    };
  }

  async processToWebp(
    tempPath: string,
    originalName: string,
  ): Promise<ProcessedPostImage> {
    const buffer = await sharp(tempPath)
      .rotate()
      .resize({
        width: 1600,
        withoutEnlargement: true,
      })
      .webp({
        quality: 82,
      })
      .toBuffer();

    const outputName = `${originalName.replace(/\.[^.]+$/, '')}.webp`;

    return {
      buffer,
      name: outputName,
      mimetype: 'image/webp',
    };
  }

  async uploadWebp(
    image: ProcessedPostImage,
    postId: number,
  ): Promise<UploadedImageMeta> {
    const file = new UTFile([image.buffer], image.name, {
      type: image.mimetype,
      lastModified: Date.now(),
    });

    const result = await this.utapi.uploadFiles(file);

    if (!('data' in result) || !result.data) {
      throw new Error('UploadThing upload failed');
    }

    return {
      key: result.data.key,
      url: result.data.ufsUrl,
      name: result.data.name,
      size: result.data.size,
    };
  }

  async removeFile(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
    } catch {
      // Best-effort cleanup. Missing temp files should not fail the request/job.
    }
  }

  async deleteUploadedFile(key: string): Promise<void> {
    try {
      await this.utapi.deleteFiles(key);
    } catch {
      // Best effort. The DB row is the source of truth and cache invalidation still occurs.
    }
  }
}
