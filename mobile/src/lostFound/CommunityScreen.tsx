import React, { useEffect, useState } from 'react';
import {
  ActivityIndicator,
  Image,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';

import { Icon } from '../Artwork';
import { TransitIcon } from '../TransitIcon';
import { colors as c } from '../theme';

import { getLostFoundPosts } from './lostFoundApi';
import type { LostFoundPost } from './lostFoundApi';

import { getLostFoundImageUrl } from './lostFoundApi';

type CommunityScreenProps = {
  onBack: () => void;
  onCreatePost: () => void;
  onOpenPost: (postId: string) => void;
  onHome: () => void;
  onTickets: () => void;
  onProfile: () => void;
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

export default function CommunityScreen({
  onBack,
  onCreatePost,
  onOpenPost,
  onHome,
  onTickets,
  onProfile,
  onNotifications,
}: CommunityScreenProps) {
  const insets = useSafeAreaInsets();

  const [posts, setPosts] = useState<LostFoundPost[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  async function loadPosts() {
    setLoading(true);
    setError('');

    try {
      const result = await getLostFoundPosts();
      setPosts(result.posts);
    } catch {
      setError('Could not load community posts.');
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    void loadPosts();
  }, []);

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
        <View style={styles.header}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Back"
            onPress={onBack}
            style={styles.iconButton}
          >
            <Icon name="back" size={20} />
          </Pressable>

          <Text style={styles.headerTitle}>Community</Text>

          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Notifications"
            onPress={onNotifications}
            style={styles.iconButton}
          >
            <Icon name="bell" size={20} />
          </Pressable>
        </View>

        <ScrollView
          style={styles.scroll}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>A little help goes far</Text>

          <Text style={styles.subtitle}>
            Lost something? Let’s find it together.
          </Text>

          <Pressable
            accessibilityRole="button"
            onPress={onCreatePost}
            style={({ pressed }) => [
              styles.createButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.createButtonText}>
              Post a lost or found item
            </Text>

            <Text style={styles.plus}>＋</Text>
          </Pressable>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator color={c.teal} />

              <Text style={styles.loadingText}>
                Loading community posts...
              </Text>
            </View>
          ) : error ? (
            <Pressable
              accessibilityRole="button"
              onPress={() => void loadPosts()}
              style={styles.errorBox}
            >
              <Text style={styles.errorText}>
                {error}
              </Text>

              <Text style={styles.retryText}>
                Tap to retry
              </Text>
            </Pressable>
          ) : posts.length === 0 ? (
            <View style={styles.emptyBox}>
              <Text style={styles.emptyTitle}>
                No posts yet
              </Text>

              <Text style={styles.emptyText}>
                Be the first to post a lost or found item.
              </Text>
            </View>
          ) : (
            posts.map((post) => (
              <Pressable
                key={post.id}
                accessibilityRole="button"
                onPress={() => onOpenPost(post.id)}
                style={({ pressed }) => [
                  styles.card,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.metaRow}>
                  <View
                    style={[
                      styles.badge,
                      post.type === 'found'
                        ? styles.foundBadge
                        : styles.lostBadge,
                    ]}
                  >
                    <Text
                      style={[
                        styles.badgeText,
                        post.type === 'found'
                          ? styles.foundText
                          : styles.lostText,
                      ]}
                    >
                      {post.type.toUpperCase()}
                    </Text>
                  </View>

                  <Text style={styles.meta}>
                    {post.authorName}
                    {post.createdAt
                      ? ` · ${getTimeAgo(post.createdAt)}`
                      : ''}
                  </Text>
                </View>

                <Text style={styles.cardTitle}>
                  {post.item}
                </Text>

                {/* {post.image ? (
                  <Image
                    source={{
                      uri: getLostFoundImageUrl(post.image),
                    }}
                    style={styles.postImage}
                    resizeMode="cover"
                  />
                ) : post.type === 'found' ? (
                  <View style={styles.artwork}>
                    <View style={styles.umbrellaTop} />

                    <View style={styles.umbrellaHandle}>
                      <View style={styles.umbrellaHook} />
                    </View>
                  </View>
                ) : null} */}

                              {post.image ? (
                <Image
                  source={{
                    uri: getLostFoundImageUrl(post.image),
                  }}
                  style={styles.postImage}
                  resizeMode="cover"
                />
              ) : null}

                <Text style={styles.description}>
                  {post.description}
                </Text>

                <Text style={styles.route}>
                  {post.routeTime}
                </Text>

                <Text style={styles.engagement}>
                  {post.likes ?? 0} likes{' '}
                  {post.comments?.length ?? 0} comments
                </Text>
              </Pressable>
            ))
          )}

          <View style={{ height: 20 }} />
        </ScrollView>

        <View
          style={[
            styles.bottomNav,
            {
              paddingBottom: Math.max(insets.bottom, 8),
            },
          ]}
        >
          <Pressable
            style={styles.navItem}
            onPress={onHome}
          >
            <TransitIcon
              name="home"
              size={21}
              color={c.muted}
            />

            <Text style={styles.navText}>
              Home
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={onTickets}
          >
            <TransitIcon
              name="ticket"
              size={21}
              color={c.muted}
            />

            <Text style={styles.navText}>
              Tickets
            </Text>
          </Pressable>

          <Pressable
            style={[
              styles.navItem,
              styles.navActive,
            ]}
          >
            <TransitIcon
              name="community"
              size={21}
              color={c.teal}
            />

            <Text
              style={[
                styles.navText,
                styles.navActiveText,
              ]}
            >
              Community
            </Text>
          </Pressable>

          <Pressable
            style={styles.navItem}
            onPress={onProfile}
          >
            <TransitIcon
              name="profile"
              size={21}
              color={c.muted}
            />

            <Text style={styles.navText}>
              Profile
            </Text>
          </Pressable>
        </View>
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
    marginBottom: 12,
  },

  iconButton: {
    width: 44,
    height: 44,
    alignItems: 'center',
    justifyContent: 'center',
  },

  headerTitle: {
    flex: 1,
    fontSize: 17,
    fontWeight: '700',
    color: c.navy,
  },

  scroll: {
    flex: 1,
  },

  content: {
    paddingHorizontal: 22,
    paddingBottom: 24,
  },

  title: {
    marginTop: 12,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    color: c.navy,
    letterSpacing: -0.4,
  },

  subtitle: {
    marginTop: 6,
    fontSize: 14,
    color: c.muted,
    lineHeight: 21,
  },

  createButton: {
    marginTop: 24,
    marginBottom: 20,
    minHeight: 50,
    borderRadius: 15,
    paddingHorizontal: 18,
    backgroundColor: c.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  createButtonText: {
    color: c.white,
    fontWeight: '700',
    fontSize: 14,
  },

  plus: {
    color: c.white,
    fontSize: 27,
    lineHeight: 27,
    fontWeight: '300',
  },

  card: {
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 18,
    padding: 15,
    marginBottom: 16,
  },

  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    marginBottom: 12,
  },

  badge: {
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
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

  meta: {
    flex: 1,
    color: c.muted,
    fontSize: 12,
  },

  cardTitle: {
    color: c.navy,
    fontWeight: '800',
    fontSize: 18,
    lineHeight: 23,
    marginBottom: 10,
  },

  description: {
    color: c.navy,
    fontSize: 13,
    lineHeight: 20,
    marginBottom: 12,
  },

  artwork: {
    height: 112,
    borderRadius: 14,
    backgroundColor: '#DDF7EF',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 14,
  },

  umbrellaTop: {
    width: 70,
    height: 34,
    backgroundColor: c.teal,
    borderTopLeftRadius: 70,
    borderTopRightRadius: 70,
  },

  umbrellaHandle: {
    width: 5,
    height: 48,
    backgroundColor: c.navy,
    marginTop: -1,
    position: 'relative',
  },

  umbrellaHook: {
    position: 'absolute',
    bottom: -7,
    left: 0,
    width: 18,
    height: 14,
    borderLeftWidth: 5,
    borderBottomWidth: 5,
    borderColor: c.navy,
    borderBottomLeftRadius: 12,
  },

  route: {
    fontSize: 12,
    color: c.muted,
    marginBottom: 10,
  },

  engagement: {
    fontSize: 12,
    color: c.teal,
    fontWeight: '700',
  },

  loadingBox: {
    paddingVertical: 40,
    alignItems: 'center',
    gap: 12,
  },

  loadingText: {
    color: c.muted,
    fontSize: 13,
  },

  errorBox: {
    padding: 20,
    backgroundColor: c.white,
    borderWidth: 1,
    borderColor: c.border,
    borderRadius: 16,
    alignItems: 'center',
  },

  errorText: {
    color: c.error,
    fontSize: 13,
    textAlign: 'center',
  },

  retryText: {
    marginTop: 8,
    color: c.teal,
    fontSize: 13,
    fontWeight: '700',
  },

  emptyBox: {
    paddingVertical: 40,
    alignItems: 'center',
  },

  emptyTitle: {
    color: c.navy,
    fontSize: 17,
    fontWeight: '700',
  },

  emptyText: {
    marginTop: 7,
    color: c.muted,
    fontSize: 13,
    textAlign: 'center',
  },

  pressed: {
    opacity: 0.8,
  },

  bottomNav: {
    flexDirection: 'row',
    backgroundColor: c.white,
    borderTopWidth: 1,
    borderColor: c.border,
    paddingTop: 8,
    paddingHorizontal: 12,
    justifyContent: 'space-between',
  },

  navItem: {
    minWidth: 66,
    minHeight: 55,
    paddingHorizontal: 7,
    paddingVertical: 7,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
  },

  navActive: {
    backgroundColor: c.mint,
    borderRadius: 16,
  },

  navText: {
    fontSize: 10,
    color: c.muted,
  },

  navActiveText: {
    color: c.teal,
    fontWeight: '700',
  },

  postImage: {
  width: '100%',
  height: 170,
  borderRadius: 14,
  marginBottom: 14,
},
});