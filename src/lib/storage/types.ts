export interface StoredObject {
  key: string;
  size: number;
  contentType?: string;
}

export interface StorageAdapter {
  createUploadUrl(key: string, contentType: string, sizeBytes: number): Promise<{ url: string; headers?: Record<string, string> }>;
  exists(key: string): Promise<StoredObject | null>;
  read(key: string): Promise<NodeJS.ReadableStream>;
  write(key: string, body: NodeJS.ReadableStream | Uint8Array, contentType: string): Promise<void>;
  remove(key: string): Promise<void>;
  publicUrl(key: string): string;
}
