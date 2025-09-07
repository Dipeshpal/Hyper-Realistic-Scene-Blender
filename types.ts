
export interface UploadedImage {
  id: number;
  file: File | null;
  base64: string | null;
  annotatedBase64: string | null;
  mimeType: string | null;
}
