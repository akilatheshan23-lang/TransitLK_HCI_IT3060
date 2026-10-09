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
  item: z.string().trim().min(2, 'Item name must be at least 2 characters').max(80, 'Item name cannot exceed 80 characters'),
  description: z.string().trim().min(2, 'Description must be at least 2 characters').max(300, 'Description cannot exceed 300 characters'),
  routeTime: z.string().trim().min(2, 'Route or time must be at least 2 characters').max(100, 'Route or time cannot exceed 100 characters'),
  image: z.string().trim().max(500).optional(),
  location: z.string().trim().max(100).optional(),
  busRegNumber: z.string().trim().max(50).optional(),
}).strict();

const updatePostSchema = z.object({
  type: z.enum(['lost', 'found']).optional(),
  item: z.string().trim().min(2, 'Item name must be at least 2 characters').max(80, 'Item name cannot exceed 80 characters').optional(),
  description: z.string().trim().min(2, 'Description must be at least 2 characters').max(300, 'Description cannot exceed 300 characters').optional(),
  routeTime: z.string().trim().min(2, 'Route or time must be at least 2 characters').max(100, 'Route or time cannot exceed 100 characters').optional(),
  image: z.string().trim().max(500).optional(),
  location: z.string().trim().max(100).optional(),
  busRegNumber: z.string().trim().max(50).optional(),
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
      const raw = req.body || {};

      // 1. Map item name: prefer canonical 'item', fallback to UI 'title'
      const item = typeof raw.item === 'string' && raw.item.trim()
        ? raw.item.trim()
        : (typeof raw.title === 'string' && raw.title.trim() ? raw.title.trim() : raw.item);

      // 2. Map routeTime: prefer canonical 'routeTime', fallback to UI 'routeNumber' / 'location' / 'busRegNumber'
      let routeTime = typeof raw.routeTime === 'string' && raw.routeTime.trim()
        ? raw.routeTime.trim()
        : undefined;

      if (!routeTime) {
        const parts = [raw.routeNumber, raw.location, raw.busRegNumber]
          .filter(v => typeof v === 'string' && v.trim().length > 0)
          .map(v => v.trim());
        if (parts.length > 0) {
          routeTime = parts.join(' • ');
        }
      }

      // 3. Assemble normalized payload
      const payloadToValidate = {
        type: raw.type,
        item,
        description: raw.description,
        routeTime,
      };

      if (raw.image && typeof raw.image === 'string' && raw.image.trim()) {
        payloadToValidate.image = raw.image.trim();
      }
      if (raw.location && typeof raw.location === 'string' && raw.location.trim()) {
        payloadToValidate.location = raw.location.trim();
      }
      if (raw.busRegNumber && typeof raw.busRegNumber === 'string' && raw.busRegNumber.trim()) {
        payloadToValidate.busRegNumber = raw.busRegNumber.trim();
      }

      const result = postSchema.safeParse(payloadToValidate);

      if (!result.success) {
        return res.status(400).json({
          error: 'Enter valid lost or found item details.',
          details: result.error.issues,
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
      const raw = req.body || {};
      const normalized = { ...raw };
      if (normalized.title && !normalized.item && typeof normalized.title === 'string') {
        normalized.item = normalized.title.trim();
        delete normalized.title;
      }
      if (!normalized.routeTime && (normalized.routeNumber || normalized.location || normalized.busRegNumber)) {
        const parts = [normalized.routeNumber, normalized.location, normalized.busRegNumber]
          .filter(v => typeof v === 'string' && v.trim().length > 0)
          .map(v => v.trim());
        if (parts.length > 0) {
          normalized.routeTime = parts.join(' • ');
        }
        delete normalized.routeNumber;
      }
      const result = updatePostSchema.safeParse(normalized);

      if (!result.success) {
        return res.status(400).json({
          error: 'Enter valid post details.',
          details: result.error.issues,
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