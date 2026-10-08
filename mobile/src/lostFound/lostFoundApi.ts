import { api } from '../api';

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