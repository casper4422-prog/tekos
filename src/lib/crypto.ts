import { createCipheriv, createDecipheriv, randomBytes } from 'crypto';

const ALG = 'aes-256-gcm';

function getKey(): Buffer {
	const raw = process.env.ENCRYPTION_KEY;
	if (!raw) throw new Error('ENCRYPTION_KEY is not set');
	const key = Buffer.from(raw, 'base64');
	if (key.length !== 32) throw new Error('ENCRYPTION_KEY must be 32 bytes (base64-encoded)');
	return key;
}

export function encrypt(plaintext: string): string {
	const key = getKey();
	const iv = randomBytes(12);
	const cipher = createCipheriv(ALG, key, iv);
	const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
	const tag = cipher.getAuthTag();
	return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

export function decrypt(ciphertext: string): string {
	const key = getKey();
	const buf = Buffer.from(ciphertext, 'base64');
	const iv = buf.subarray(0, 12);
	const tag = buf.subarray(12, 28);
	const encrypted = buf.subarray(28);
	const decipher = createDecipheriv(ALG, key, iv);
	decipher.setAuthTag(tag);
	return decipher.update(encrypted) + decipher.final('utf8');
}

export function isEncrypted(value: string): boolean {
	try {
		const buf = Buffer.from(value, 'base64');
		return buf.length > 28;
	} catch {
		return false;
	}
}
