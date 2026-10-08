import multer from 'multer';
import { mkdirSync } from 'node:fs';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { Router } from 'express';
import { z } from 'zod';

const uploadDirectory = fileURLToPath(
  new URL('../uploads/lost-found/', import.meta.url)
);

mkdirSync(uploadDirectory, { recursive: true });

const allowedImageTypes = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp'
};

const upload = multer({
  storage: multer.diskStorage({
    destination: (_req, _file, callback) => {
      callback(null, uploadDirectory);
    },

    filename: (_req, file, callback) => {
      const extension = allowedImageTypes[file.mimetype];

      callback(
        null,
        `${randomUUID()}${extension}`
      );
    }
  }),

  limits: {
    fileSize: 2 * 1024 * 1024,
    files: 1
  },

  fileFilter: (_req, file, callback) => {
    if (!allowedImageTypes[file.mimetype]) {
      return callback(
        new Error('Only JPEG, PNG and WEBP images are allowed.')
      );
    }

    callback(null, true);
  }
});
const postSchema = z.object({
  type: z.enum(['lost', 'found']),
  item: z.string().trim().min(2).max(80),
  description: z.string().trim().min(2).max(300),
  routeTime: z.string().trim().min(2).max(100),
  image: z.string().trim().max(500).optional()
}).strict();

const updatePostSchema = z.object({
  type: z.enum(['lost', 'found']).optional(),
  item: z.string().trim().min(2).max(80).optional(),
  description: z.string().trim().min(2).max(300).optional(),
  routeTime: z.string().trim().min(2).max(100).optional(),
  image: z.string().trim().max(500).optional()
}).strict();

const commentSchema = z.object({
  message: z.string().trim().min(1).max(250)
}).strict();

export function lostFoundRouter(store, authenticate) {
  const router = Router();

  // READ - list all Lost & Found posts
  router.get('/lost-found', async (_req, res) => {
    const posts = await store.listLostFoundPosts();

    res.json({
      posts
    });
  });

  // READ - get one post
  router.get('/lost-found/:id', async (req, res) => {
    const post = await store.findLostFoundPost(req.params.id);

    if (!post) {
      return res.status(404).json({
        error: 'Lost and found post not found.'
      });
    }

    res.json({
      post
    });
  });

  // CREATE - authenticated user creates a post
  router.post(
    '/lost-found',
    authenticate,
    async (req, res) => {
      const result = postSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          error: 'Enter valid lost or found item details.'
        });
      }

      const post = await store.createLostFoundPost(
        String(req.user._id),
        {
          ...result.data,
          authorName: req.user.name
        }
      );

      res.status(201).json({
        post
      });
    }
  );

  router.post(
  '/lost-found/upload',
  authenticate,
  upload.single('image'),
  (req, res) => {
    if (!req.file) {
      return res.status(400).json({
        error: 'Choose an image to upload.'
      });
    }

    res.status(201).json({
      image: `/uploads/lost-found/${req.file.filename}`
    });
  }
);

  // UPDATE - only the user who created the post
  router.patch(
    '/lost-found/:id',
    authenticate,
    async (req, res) => {
      const result = updatePostSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          error: 'Enter valid post details.'
        });
      }

      if (Object.keys(result.data).length === 0) {
        return res.status(400).json({
          error: 'Provide at least one field to update.'
        });
      }

      const post = await store.updateLostFoundPost(
        String(req.user._id),
        req.params.id,
        result.data
      );

      if (!post) {
        return res.status(404).json({
          error: 'Post not found or you do not have permission to edit it.'
        });
      }

      res.json({
        post
      });
    }
  );

  // DELETE - only the user who created the post
  router.delete(
    '/lost-found/:id',
    authenticate,
    async (req, res) => {
      const deleted = await store.deleteLostFoundPost(
        String(req.user._id),
        req.params.id
      );

      if (!deleted) {
        return res.status(404).json({
          error: 'Post not found or you do not have permission to delete it.'
        });
      }

      res.status(204).end();
    }
  );

  // CREATE COMMENT
  router.post(
    '/lost-found/:id/comments',
    authenticate,
    async (req, res) => {
      const result = commentSchema.safeParse(req.body);

      if (!result.success) {
        return res.status(400).json({
          error: 'Enter a comment.'
        });
      }

      const post = await store.addLostFoundComment(
        req.params.id,
        {
          userId: String(req.user._id),
          authorName: req.user.name,
          message: result.data.message
        }
      );

      if (!post) {
        return res.status(404).json({
          error: 'Lost and found post not found.'
        });
      }

      res.status(201).json({
        post
      });
    }
  );
  router.post(
  '/lost-found/:id/like',
  authenticate,
  async (req, res) => {
    const post = await store.likeLostFoundPost(
      String(req.user._id),
      req.params.id
    );

    if (!post) {
      return res.status(404).json({
        error: 'Lost and found post not found.'
      });
    }

    res.json({ post });
  }
);

  return router;
}