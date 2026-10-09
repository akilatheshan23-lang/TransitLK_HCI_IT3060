import {
  api,
  uploadImage,
  API_BASE_URL,
} from '../api';

export type LostFoundComment = {
  userId: string;
  authorName: string;
  message: string;
  createdAt: string;
};

export type LostFoundPost = {
  id: string;
  type: 'lost' | 'found';
  item: string;
  description: string;
  routeTime: string;
  image?: string;
  location?: string;
  busRegNumber?: string;
  authorName: string;
  userId: string;
  comments: LostFoundComment[];
  likes: number;
  createdAt: string;
  updatedAt: string;
};

export async function getLostFoundPosts() {
  return api<{ posts: LostFoundPost[] }>('/lost-found');
}

export async function getLostFoundPost(id: string) {
  return api<{ post: LostFoundPost }>(
    `/lost-found/${id}`
  );
}

export type CreateLostFoundPostInput = {
  type: 'lost' | 'found';
  item: string;
  description: string;
  routeTime: string;
  image?: string;
  title?: string;
  location?: string;
  busRegNumber?: string;
};

export async function createLostFoundPost(
  data: CreateLostFoundPostInput
) {
  return api<{ post: LostFoundPost }>(
    '/lost-found',
    'POST',
    data
  );
}

export async function addLostFoundComment(
  postId: string,
  message: string
) {
  return api<{ post: LostFoundPost }>(
    `/lost-found/${postId}/comments`,
    'POST',
    { message }
  );
}

export type UpdateLostFoundPostInput = {
  type?: 'lost' | 'found';
  item?: string;
  description?: string;
  routeTime?: string;
};

export async function updateLostFoundPost(
  postId: string,
  data: UpdateLostFoundPostInput
) {
  return api<{ post: LostFoundPost }>(
    `/lost-found/${postId}`,
    'PATCH',
    data
  );
}

export async function deleteLostFoundPost(
  postId: string
) {
  return api<void>(
    `/lost-found/${postId}`,
    'DELETE'
  );
}

export async function likeLostFoundPost(
  postId: string
) {
  return api<{ post: LostFoundPost }>(
    `/lost-found/${postId}/like`,
    'POST'
  );
}

export async function uploadLostFoundImage(
  uri: string,
  file?: File | null,
  mimeType = 'image/jpeg'
) {
  const formData = new FormData();

  if (file) {
    formData.append('image', file);
  } else {
    formData.append(
      'image',
      {
        uri,
        name: `lost-found-${Date.now()}.jpg`,
        type: mimeType,
      } as any
    );
  }

  return uploadImage(
    '/lost-found/upload',
    formData
  );
}

export function getLostFoundImageUrl(
  image?: string
) {
  if (!image) return undefined;

  if (
    image.startsWith('http://') ||
    image.startsWith('https://')
  ) {
    return image;
  }

  return `${API_BASE_URL}${image}`;
}