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