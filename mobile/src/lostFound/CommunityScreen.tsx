import React from 'react';
import {
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

type CommunityScreenProps = {
  onBack: () => void;
  onCreatePost: () => void;
  onOpenPost: (postId: string) => void;
  onHome: () => void;
  onTickets: () => void;
  onProfile: () => void;
  onNotifications: () => void;
};

type CommunityPost = {
  id: string;
  type: 'lost' | 'found';
  title: string;
  author: string;
  timeAgo: string;
  route?: string;
  travelTime?: string;
  likes?: number;
  comments?: number;
};

const demoPosts: CommunityPost[] = [
  {
    id: 'umbrella-125',
    type: 'found',
    title: 'Umbrella on Route 125',
    author: 'Kamal Perera',
    timeAgo: '2h ago',
    route: 'Horana → Colombo',
    travelTime: '08:30 AM',
    likes: 5,
    comments: 2,
  },
  {
    id: 'wallet-ravi',
    type: 'lost',
    title: 'Black wallet · Ravi Silva',
    author: 'Ravi Silva',
    timeAgo: '1h ago',
  },
];

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

          {demoPosts.map((post) => (
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
                  {post.author} · {post.timeAgo}
                </Text>
              </View>

              <Text style={styles.cardTitle}>{post.title}</Text>

              {post.type === 'found' && (
                <View style={styles.artwork}>
                  <View style={styles.umbrellaTop} />
                  <View style={styles.umbrellaHandle}>
                    <View style={styles.umbrellaHook} />
                  </View>
                </View>
              )}

              {post.route && (
                <Text style={styles.route}>
                  {post.route} · {post.travelTime}
                </Text>
              )}

              {typeof post.likes === 'number' &&
                typeof post.comments === 'number' && (
                  <Text style={styles.engagement}>
                    {post.likes} likes {post.comments} comments
                  </Text>
                )}
            </Pressable>
          ))}

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
          <Pressable style={styles.navItem} onPress={onHome}>
            <TransitIcon name="home" size={21} color={c.muted} />
            <Text style={styles.navText}>Home</Text>
          </Pressable>

          <Pressable style={styles.navItem} onPress={onTickets}>
            <TransitIcon name="ticket" size={21} color={c.muted} />
            <Text style={styles.navText}>Tickets</Text>
          </Pressable>

          <Pressable style={[styles.navItem, styles.navActive]}>
            <TransitIcon name="community" size={21} color={c.teal} />
            <Text style={[styles.navText, styles.navActiveText]}>
              Community
            </Text>
          </Pressable>

          <Pressable style={styles.navItem} onPress={onProfile}>
            <TransitIcon name="profile" size={21} color={c.muted} />
            <Text style={styles.navText}>Profile</Text>
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
    marginBottom: 13,
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
});