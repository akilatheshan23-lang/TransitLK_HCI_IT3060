declare module 'expo-image-picker' {
  export interface ImagePickerAsset {
    uri: string;
    width?: number;
    height?: number;
    type?: 'image' | 'video';
    fileName?: string | null;
    fileSize?: number;
    mimeType?: string;
    file?: any;
    base64?: string | null;
  }

  export interface ImagePickerResult {
    canceled: boolean;
    assets: ImagePickerAsset[];
  }

  export interface ImagePickerOptions {
    mediaTypes?: any;
    allowsEditing?: boolean;
    aspect?: [number, number];
    quality?: number;
    base64?: boolean;
  }

  export interface PermissionResponse {
    status?: string;
    granted: boolean;
    canAskAgain?: boolean;
  }

  export function requestMediaLibraryPermissionsAsync(): Promise<PermissionResponse>;
  export function launchImageLibraryAsync(options?: ImagePickerOptions): Promise<ImagePickerResult>;
}
