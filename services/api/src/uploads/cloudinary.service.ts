import { Injectable } from '@nestjs/common';
import { v2 as cloudinary } from 'cloudinary';

@Injectable()
export class CloudinaryService {
  constructor() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;

    if (!cloudName || !apiKey || !apiSecret) {
      throw new Error(
        'Missing Cloudinary env vars. Ensure CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET are set in services/api/.env',
      );
    }

    cloudinary.config({
      cloud_name: cloudName,
      api_key: apiKey,
      api_secret: apiSecret,
      secure: true,
    });
  }

  getUploadSignature(folder?: string) {
    const timestamp = Math.floor(Date.now() / 1000);
    const useFolder = folder ?? process.env.CLOUDINARY_FOLDER ?? 'town-commerce';

    const signature = cloudinary.utils.api_sign_request(
      { timestamp, folder: useFolder },
      process.env.CLOUDINARY_API_SECRET!,
    );

    return {
      cloudName: process.env.CLOUDINARY_CLOUD_NAME!,
      apiKey: process.env.CLOUDINARY_API_KEY!,
      timestamp,
      folder: useFolder,
      signature,
    };
  }
}