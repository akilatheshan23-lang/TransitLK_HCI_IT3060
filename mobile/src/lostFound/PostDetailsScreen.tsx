import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../Artwork';
import { colors as c } from '../theme';
import {
  getLostFoundPost,
} from './lostFoundApi';
import type {
  LostFoundPost,
} from './lostFoundApi';

type PostDetailsScreenProps = {
  postId: string | null;
  onBack: () => void;
  onNotifications: () => void;
};

function getTimeAgo(dateValue: string) {
  const created = new Date(dateValue).getTime();

  if (Number.isNaN(created)) {
    return '';
  }

  const difference = Date.now() - created;
  const minutes = Math.floor(difference / 60000);

  if (minutes < 1) {
    return 'Just now';
  }

  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);

  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);

  return `${days}d ago`;
}

export default function PostDetailsScreen({
  postId,
  onBack,
  onNotifications,
}: PostDetailsScreenProps) {
  const insets = useSafeAreaInsets();

  const [post, setPost] =
    useState<LostFoundPost | null>(null);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [comment, setComment] = useState('');

  useEffect(() => {
    let active = true;

    async function loadPost() {
      if (!postId) {
        setPost(null);
        setError('Post unavailable.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError('');

      try {
        const result = await getLostFoundPost(postId);

        if (active) {
          setPost(result.post);
        }
      } catch (e) {
        if (active) {
          setPost(null);
          setError(
            e instanceof Error
              ? e.message
              : 'Could not load this post.'
          );
        }
      } finally {
        if (active) {
          setLoading(false);
        }
      }
    }

    void loadPost();

    return () => {
      active = false;
    };
  }, [postId]);

  const header = (
    <View style={styles.header}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Back"
        onPress={onBack}
        style={styles.iconButton}
      >
        <Icon name="back" size={20} />
      </Pressable>

      <Text style={styles.headerTitle}>
        Post details
      </Text>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Notifications"
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

          <View style={styles.centerBox}>
            <ActivityIndicator color={c.teal} />

            <Text style={styles.loadingText}>
              Loading post...
            </Text>
          </View>
        </View>
      </View>
    );
  }

  if (error || !post) {
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

          <View style={styles.centerBox}>
            <Text style={styles.emptyTitle}>
              Post unavailable
            </Text>

            <Text style={styles.emptyText}>
              {error ||
                'Go back to the community and select a post.'}
            </Text>
          </View>
        </View>
      </View>
    );
  }

  const isFound = post.type === 'found';

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
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View
            style={[
              styles.badge,
              isFound
                ? styles.foundBadge
                : styles.lostBadge,
            ]}
          >
            <Text
              style={[
                styles.badgeText,
                isFound
                  ? styles.foundText
                  : styles.lostText,
              ]}
            >
              {post.type.toUpperCase()}
            </Text>
          </View>

          <Text style={styles.title}>
            {post.item}
          </Text>

          <Text style={styles.meta}>
            {post.authorName}
            {post.createdAt
              ? ` · ${getTimeAgo(post.createdAt)}`
              : ''}
          </Text>

          <View
            style={[
              styles.itemCard,
              isFound
                ? styles.foundItemCard
                : styles.lostItemCard,
            ]}
          >
            <Text style={styles.itemCardLabel}>
              {isFound
                ? 'FOUND ITEM'
                : 'LOST ITEM'}
            </Text>

            <Text style={styles.itemCardTitle}>
              {post.item}
            </Text>
          </View>

          <Text style={styles.sectionLabel}>
            Description
          </Text>

          <Text style={styles.description}>
            {post.description}
          </Text>

          <Text style={styles.sectionLabel}>
            Route and time
          </Text>

          <Text style={styles.routeText}>
            {post.routeTime}
          </Text>

          <Text style={styles.sectionTitle}>
            Comments ({post.comments?.length ?? 0})
          </Text>

          {post.comments?.length ? (
            post.comments.map(
              (postComment, index) => (
                <View
                  key={`${postComment.createdAt}-${index}`}
                  style={styles.commentCard}
                >
                  <Text style={styles.commentAuthor}>
                    {postComment.authorName}
                  </Text>

                  <Text style={styles.commentText}>
                    {postComment.message}
                  </Text>
                </View>
              )
            )
          ) : (
            <View style={styles.noCommentsBox}>
              <Text style={styles.noCommentsText}>
                No comments yet.
              </Text>
            </View>
          )}

          <Text style={styles.commentLabel}>
            Your comment
          </Text>

          <TextInput
            value={comment}
            onChangeText={setComment}
            placeholder="Write a comment..."
            placeholderTextColor={c.muted}
            style={styles.commentInput}
            maxLength={250}
          />

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

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 22,
    paddingBottom: 28,
  },

  centerBox: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 30,
    gap: 10,
  },

  loadingText: {
    color: c.muted,
    fontSize: 13,
  },

  emptyTitle: {
    color: c.navy,
    fontSize: 20,
    fontWeight: '800',
  },

  emptyText: {
    color: c.muted,
    fontSize: 14,
    textAlign: 'center',
    lineHeight: 21,
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
    lineHeight: 29,
  },

  meta: {
    color: c.muted,
    fontSize: 13,
    marginTop: 7,
    marginBottom: 22,
  },

  itemCard: {
    width: '100%',
    minHeight: 130,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    marginBottom: 24,
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
    textAlign: 'center',
  },

  sectionLabel: {
    color: c.muted,
    fontSize: 12,
    fontWeight: '700',
    marginBottom: 6,
  },

  description: {
    color: c.navy,
    fontSize: 14,
    lineHeight: 22,
    marginBottom: 20,
  },

  routeText: {
    color: c.navy,
    fontSize: 14,
    lineHeight: 22,
  },

  sectionTitle: {
    color: c.navy,
    fontSize: 18,
    fontWeight: '800',
    marginTop: 26,
    marginBottom: 14,
  },

  commentCard: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  commentAuthor: {
    color: c.teal,
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 10,
  },

  commentText: {
    color: c.navy,
    fontSize: 14,
    lineHeight: 21,
  },

  noCommentsBox: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
  },

  noCommentsText: {
    color: c.muted,
    fontSize: 13,
  },

  commentLabel: {
    color: c.muted,
    fontSize: 13,
    marginTop: 10,
    marginBottom: 7,
  },

  commentInput: {
    minHeight: 50,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 13,
    paddingHorizontal: 15,
    color: c.navy,
    fontSize: 14,
  },
});