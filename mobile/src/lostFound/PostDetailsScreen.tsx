import React, { useState } from 'react';
import {
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { BusArtwork, Icon } from '../Artwork';
import { colors as c } from '../theme';

type PostDetailsScreenProps = {
  onBack: () => void;
  onNotifications: () => void;
};

export default function PostDetailsScreen({
  onBack,
  onNotifications,
}: PostDetailsScreenProps) {
  const insets = useSafeAreaInsets();

  const [comment, setComment] = useState('');

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

          <Text style={styles.headerTitle}>Post details</Text>

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
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.badge}>
            <Text style={styles.badgeText}>FOUND</Text>
          </View>

          <Text style={styles.title}>
            Umbrella on Route 125
          </Text>

          <Text style={styles.meta}>
            Kamal Perera · 2 hours ago
          </Text>

          <View style={styles.artworkCard}>
            <BusArtwork />
          </View>

          <Text style={styles.description}>
            Found near the front seat this morning.
          </Text>

          <Text style={styles.claimText}>
            Describe your umbrella to claim it.
          </Text>

          <Text style={styles.sectionTitle}>
            Comments (2)
          </Text>

          <View style={styles.commentCard}>
            <Text style={styles.commentAuthor}>
              Nimali
            </Text>

            <Text style={styles.commentText}>
              Is it a small black umbrella?
            </Text>
          </View>

          <View style={styles.commentCard}>
            <Text style={styles.commentAuthor}>
              Ravi
            </Text>

            <Text style={styles.commentText}>
              Was it found near the front seat?
            </Text>
          </View>

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

  badge: {
    alignSelf: 'flex-start',
    backgroundColor: '#DDF7EF',
    borderRadius: 20,
    paddingHorizontal: 12,
    paddingVertical: 6,
    marginTop: 14,
    marginBottom: 12,
  },

  badgeText: {
    color: '#00897B',
    fontSize: 11,
    fontWeight: '800',
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

  artworkCard: {
    width: '100%',
    height: 145,
    borderRadius: 18,
    overflow: 'hidden',
    marginBottom: 24,
  },

  description: {
    color: c.navy,
    fontSize: 14,
    lineHeight: 22,
  },

  claimText: {
    color: c.muted,
    fontSize: 14,
    lineHeight: 22,
    marginTop: 4,
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