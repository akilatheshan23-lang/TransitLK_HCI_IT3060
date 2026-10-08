import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../Artwork';
import type { User } from '../api';
import { colors as c } from '../theme';

import {
  addLostFoundComment,
  deleteLostFoundPost,
  getLostFoundImageUrl,
  getLostFoundPost,
  likeLostFoundPost,
  updateLostFoundPost,
} from './lostFoundApi';

import type { LostFoundPost } from './lostFoundApi';

type PostDetailsScreenProps = {
  postId: string | null;
  user: User | null;
  onBack: () => void;
  onNotifications: () => void;
  onProfile: () => void;
  onDeleted: () => void;
};

function getTimeAgo(value: string) {
  const time = new Date(value).getTime();

  if (Number.isNaN(time)) return '';

  const minutes = Math.floor(
    (Date.now() - time) / 60000
  );

  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes}m ago`;

  const hours = Math.floor(minutes / 60);

  if (hours < 24) return `${hours}h ago`;

  return `${Math.floor(hours / 24)}d ago`;
}

export default function PostDetailsScreen({
  postId,
  user,
  onBack,
  onNotifications,
  onProfile,
  onDeleted,
}: PostDetailsScreenProps) {
  const insets = useSafeAreaInsets();

  const [post, setPost] =
    useState<LostFoundPost | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [comment, setComment] = useState('');
  const [commentBusy, setCommentBusy] =
    useState(false);

  const [likeBusy, setLikeBusy] = useState(false);
  const [liked, setLiked] = useState(false);

  const [editing, setEditing] = useState(false);
  const [editBusy, setEditBusy] = useState(false);

  const [editItem, setEditItem] = useState('');
  const [editDescription, setEditDescription] =
    useState('');
  const [editRouteTime, setEditRouteTime] =
    useState('');

  const [confirmDelete, setConfirmDelete] =
    useState(false);

  async function loadPost() {
    if (!postId) {
      setError('Post unavailable.');
      setLoading(false);
      return;
    }

    setLoading(true);
    setError('');

    try {
      const result = await getLostFoundPost(postId);
      setPost(result.post);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not load this post.'
      );
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPost();
  }, [postId]);

  const isOwner =
    Boolean(user && post && user.id === post.userId);

  async function submitComment() {
    if (!post) return;

    if (!user) {
      onProfile();
      return;
    }

    const message = comment.trim();

    if (!message) return;

    setCommentBusy(true);
    setError('');

    try {
      const result = await addLostFoundComment(
        post.id,
        message
      );

      setPost(result.post);
      setComment('');
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not add comment.'
      );
    } finally {
      setCommentBusy(false);
    }
  }

  async function handleLike() {
    if (!post || liked || likeBusy) return;

    if (!user) {
      onProfile();
      return;
    }

    setLikeBusy(true);
    setError('');

    try {
      const result = await likeLostFoundPost(post.id);

      setPost(result.post);
      setLiked(true);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not like this post.'
      );
    } finally {
      setLikeBusy(false);
    }
  }

  function startEditing() {
    if (!post) return;

    setEditItem(post.item);
    setEditDescription(post.description);
    setEditRouteTime(post.routeTime);
    setEditing(true);
  }

  async function saveEdit() {
    if (!post) return;

    if (
      !editItem.trim() ||
      !editDescription.trim() ||
      !editRouteTime.trim()
    ) {
      setError('Complete all post fields.');
      return;
    }

    setEditBusy(true);
    setError('');

    try {
      const result = await updateLostFoundPost(
        post.id,
        {
          item: editItem.trim(),
          description: editDescription.trim(),
          routeTime: editRouteTime.trim(),
        }
      );

      setPost(result.post);
      setEditing(false);
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not update post.'
      );
    } finally {
      setEditBusy(false);
    }
  }

  async function removePost() {
    if (!post) return;

    setError('');

    try {
      await deleteLostFoundPost(post.id);
      onDeleted();
    } catch (e) {
      setError(
        e instanceof Error
          ? e.message
          : 'Could not delete post.'
      );
    }
  }

  const header = (
    <View style={styles.header}>
      <Pressable
        onPress={onBack}
        style={styles.iconButton}
      >
        <Icon name="back" size={20} />
      </Pressable>

      <Text style={styles.headerTitle}>
        Post details
      </Text>

      <Pressable
        onPress={onNotifications}
        style={styles.iconButton}
      >
        <Icon name="bell" size={20} />
      </Pressable>
    </View>
  );

  if (loading) {
    return (
      <View style={styles.stage}>
        <View
          style={[
            styles.screen,
            {
              paddingTop: Math.max(insets.top, 12),
            },
          ]}
        >
          {header}

          <View style={styles.center}>
            <ActivityIndicator color={c.teal} />
            <Text style={styles.muted}>
              Loading post...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (!post) {
    return (
      <View style={styles.stage}>
        <View
          style={[
            styles.screen,
            {
              paddingTop: Math.max(insets.top, 12),
            },
          ]}
        >
          {header}

          <View style={styles.center}>
            <Text style={styles.title}>
              Post unavailable
            </Text>

            <Text style={styles.muted}>
              {error}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const found = post.type === 'found';

  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.screen,
          {
            paddingTop: Math.max(insets.top, 12),
          },
        ]}
      >
        {header}

        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <View
            style={[
              styles.badge,
              found
                ? styles.foundBadge
                : styles.lostBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                found
                  ? styles.foundText
                  : styles.lostText,
              ]}
            >
              {post.type.toUpperCase()}
            </Text>
          </View>

          {editing ? (
            <>
              <Text style={styles.label}>
                Item
              </Text>

              <TextInput
                value={editItem}
                onChangeText={setEditItem}
                style={styles.input}
              />

              <Text style={styles.label}>
                Description
              </Text>

              <TextInput
                value={editDescription}
                onChangeText={setEditDescription}
                style={[
                  styles.input,
                  styles.largeInput,
                ]}
                multiline
              />

              <Text style={styles.label}>
                Route and time
              </Text>

              <TextInput
                value={editRouteTime}
                onChangeText={setEditRouteTime}
                style={styles.input}
              />

              <View style={styles.actionRow}>
                <Pressable
                  onPress={() => setEditing(false)}
                  style={styles.secondaryButton}
                >
                  <Text style={styles.secondaryText}>
                    Cancel
                  </Text>
                </Pressable>

                <Pressable
                  onPress={() => void saveEdit()}
                  disabled={editBusy}
                  style={styles.primaryButton}
                >
                  <Text style={styles.primaryText}>
                    {editBusy
                      ? 'Saving...'
                      : 'Save changes'}
                  </Text>
                </Pressable>
              </View>
            </>
          ) : (
            <>
              <Text style={styles.title}>
                {post.item}
              </Text>

              <Text style={styles.meta}>
                {post.authorName} ·{' '}
                {getTimeAgo(post.createdAt)}
              </Text>

              {post.image ? (
                <Image
                    source={{
                    uri: getLostFoundImageUrl(post.image),
                    }}
                    style={styles.postImage}
                    resizeMode="cover"
                />
                ) : (
                <View
                    style={[
                    styles.itemCard,
                    found
                        ? styles.foundItemCard
                        : styles.lostItemCard,
                    ]}
                >
                    <Text style={styles.itemCardLabel}>
                    {found ? 'FOUND ITEM' : 'LOST ITEM'}
                    </Text>

                    <Text style={styles.itemCardTitle}>
                    {post.item}
                    </Text>
                </View>
                )}

              <Text style={styles.label}>
                Description
              </Text>

              <Text style={styles.body}>
                {post.description}
              </Text>

              <Text style={styles.label}>
                Route and time
              </Text>

              <Text style={styles.body}>
                {post.routeTime}
              </Text>
            </>
          )}

          {!!error && (
            <Text style={styles.error}>
              {error}
            </Text>
          )}

          {isOwner && !editing && (
            <View style={styles.ownerBox}>
              <Text style={styles.ownerTitle}>
                Manage your post
              </Text>

              <Pressable
                onPress={startEditing}
                style={styles.editButton}
              >
                <Text style={styles.editText}>
                  Edit post
                </Text>
              </Pressable>

              {!confirmDelete ? (
                <Pressable
                  onPress={() =>
                    setConfirmDelete(true)
                  }
                  style={styles.deleteButton}
                >
                  <Text style={styles.deleteText}>
                    Delete post
                  </Text>
                </Pressable>
              ) : (
                <View style={styles.deleteConfirm}>
                  <Text style={styles.deleteWarning}>
                    Delete this post permanently?
                  </Text>

                  <View style={styles.actionRow}>
                    <Pressable
                      onPress={() =>
                        setConfirmDelete(false)
                      }
                      style={styles.secondaryButton}
                    >
                      <Text
                        style={styles.secondaryText}
                      >
                        Cancel
                      </Text>
                    </Pressable>

                    <Pressable
                      onPress={() =>
                        void removePost()
                      }
                      style={styles.deleteButtonSmall}
                    >
                      <Text style={styles.deleteText}>
                        Yes, delete
                      </Text>
                    </Pressable>
                  </View>
                </View>
              )}
            </View>
          )}

          <Pressable
            onPress={() => void handleLike()}
            disabled={liked || likeBusy}
            style={styles.likeButton}
          >
            <Text style={styles.likeText}>
              {liked ? '♥ Liked' : '♡ Like'} ·{' '}
              {post.likes ?? 0}
            </Text>
          </Pressable>

          <Text style={styles.sectionTitle}>
            Comments ({post.comments?.length ?? 0})
          </Text>

          {post.comments?.length ? (
            post.comments.map((entry, index) => (
              <View
                key={`${entry.createdAt}-${index}`}
                style={styles.commentCard}
              >
                <Text
                  style={styles.commentAuthor}
                >
                  {entry.authorName}
                </Text>

                <Text style={styles.body}>
                  {entry.message}
                </Text>
              </View>
            ))
          ) : (
            <Text style={styles.muted}>
              No comments yet.
            </Text>
          )}

          <Text style={styles.commentLabel}>
            Your comment
          </Text>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Write a comment..."
            placeholderTextColor={c.muted}
            style={styles.input}
            maxLength={250}
          />

          <Pressable
            onPress={() => void submitComment()}
            disabled={commentBusy}
            style={styles.commentButton}
          >
            <Text style={styles.primaryText}>
              {commentBusy
                ? 'Posting...'
                : user
                  ? 'Post comment'
                  : 'Sign in to comment'}
            </Text>
          </Pressable>

          <View style={{ height: 30 }} />
        </ScrollView>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stage: {
    flex: 1,
    width: '100%',
    backgroundColor: c.background,
    alignItems: 'center',
  },

  screen: {
    flex: 1,
    width: '100%',
    maxWidth: 430,
    backgroundColor: c.background,
  },

  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 14,
    marginBottom: 10,
  },

  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    color: c.navy,
    fontSize: 17,
    fontWeight: '700',
  },

  content: {
    paddingHorizontal: 22,
    paddingBottom: 28,
  },

  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    padding: 30,
  },

  badge: {
    alignSelf: 'flex-start',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
    marginBottom: 12,
  },

  foundBadge: {
    backgroundColor: '#DDF7EF',
  },

  lostBadge: {
    backgroundColor: '#FCE9E4',
  },

  badgeText: {
    fontSize: 11,
    fontWeight: '800',
  },

  foundText: {
    color: '#00897B',
  },

  lostText: {
    color: '#D4593D',
  },

  title: {
    color: c.navy,
    fontSize: 23,
    fontWeight: '800',
  },

  meta: {
    color: c.muted,
    fontSize: 13,
    marginTop: 7,
    marginBottom: 22,
  },

  itemCard: {
    minHeight: 125,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 22,
    padding: 20,
  },

  foundItemCard: {
    backgroundColor: '#DDF7EF',
  },

  lostItemCard: {
    backgroundColor: '#FCE9E4',
  },

  itemCardLabel: {
    color: c.muted,
    fontSize: 11,
    fontWeight: '800',
    marginBottom: 8,
  },

  itemCardTitle: {
    color: c.navy,
    fontSize: 22,
    fontWeight: '800',
  },

  label: {
    color: c.muted,
    fontSize: 12,
    fontWeight: '700',
    marginTop: 12,
    marginBottom: 7,
  },

  body: {
    color: c.navy,
    fontSize: 14,
    lineHeight: 22,
  },

  input: {
    minHeight: 50,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 13,
    backgroundColor: c.white,
    paddingHorizontal: 14,
    color: c.navy,
    fontSize: 14,
    marginBottom: 12,
  },

  largeInput: {
    minHeight: 85,
    paddingTop: 12,
    textAlignVertical: 'top',
  },

  sectionTitle: {
    color: c.navy,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 25,
    marginBottom: 14,
  },

  commentCard: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 14,
    padding: 14,
    marginBottom: 10,
  },

  commentAuthor: {
    color: c.teal,
    fontWeight: '700',
    marginBottom: 6,
  },

  commentLabel: {
    color: c.muted,
    fontSize: 13,
    marginTop: 20,
    marginBottom: 7,
  },

  commentButton: {
    minHeight: 48,
    borderRadius: 13,
    backgroundColor: c.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  likeButton: {
    marginTop: 22,
    minHeight: 46,
    borderRadius: 13,
    backgroundColor: c.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  likeText: {
    color: c.teal,
    fontWeight: '700',
  },

  ownerBox: {
    marginTop: 24,
    borderTopWidth: 1,
    borderColor: c.border,
    paddingTop: 18,
    gap: 10,
  },

  ownerTitle: {
    color: c.navy,
    fontSize: 16,
    fontWeight: '800',
  },

  editButton: {
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: c.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  editText: {
    color: c.teal,
    fontWeight: '700',
  },

  deleteButton: {
    minHeight: 45,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  deleteText: {
    color: c.error,
    fontWeight: '700',
  },

  deleteConfirm: {
    gap: 10,
  },

  deleteWarning: {
    color: c.error,
    fontSize: 13,
  },

  deleteButtonSmall: {
    flex: 1,
    minHeight: 44,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: c.error,
    alignItems: 'center',
    justifyContent: 'center',
  },

  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 8,
  },

  primaryButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: c.teal,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryButton: {
    flex: 1,
    minHeight: 45,
    borderRadius: 12,
    backgroundColor: c.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  primaryText: {
    color: c.white,
    fontWeight: '700',
  },

  secondaryText: {
    color: c.teal,
    fontWeight: '700',
  },

  error: {
    color: c.error,
    fontSize: 13,
    marginTop: 14,
  },

  muted: {
    color: c.muted,
    fontSize: 13,
  },

  postImage: {
  width: '100%',
  height: 190,
  borderRadius: 18,
  marginBottom: 22,
},
});