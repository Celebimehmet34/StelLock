import { PinataSDK } from 'pinata';
import { env } from '$env/dynamic/private';
import crypto from 'crypto';

// Initialize Pinata SDK
const pinata = new PinataSDK({
  pinataJwt: env.PINATA_JWT || '',
  pinataGateway: 'gateway.pinata.cloud' // Example gateway
});

/**
 * Uploads a file to IPFS via Pinata and calculates its SHA-256 hash
 */
export async function uploadEvidence(file: File): Promise<{ cid: string; hash: string }> {
  // Convert File to Blob/Buffer
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  
  // Calculate SHA-256 hash of the file
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  
  // Upload to IPFS
  const upload = await pinata.upload.file(file);
  
  return { 
    cid: upload.cid, 
    hash 
  };
}

/**
 * Verifies if the file matches the stored hash
 */
export async function verifyEvidence(file: File, storedHash: string): Promise<boolean> {
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const hash = crypto.createHash('sha256').update(buffer).digest('hex');
  
  return hash === storedHash;
}
