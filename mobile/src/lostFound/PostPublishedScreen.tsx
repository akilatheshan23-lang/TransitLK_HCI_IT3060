import React from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Icon } from '../Artwork';
import { colors as c } from '../theme';

type PostPublishedScreenProps = {
  onBack: () => void;
  onViewPost: () => void;
  onBackToCommunity: () => void;
};

export default function PostPublishedScreen({
  onBack,
  onViewPost,
  onBackToCommunity,
}: PostPublishedScreenProps) {
  const insets = useSafeAreaInsets();

  return (
    <View style={styles.stage}>
      <View
        style={[
          styles.screen,
          { paddingTop: Math.max(insets.top, 12) },
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

          <Text style={styles.headerTitle}>Post published</Text>

          <View style={styles.iconButton} />
        </View>

        <View style={styles.content}>
          <Text style={styles.title}>
            Thanks for helping out
          </Text>

          <View style={styles.card}>
            <Text style={styles.cardTitle}>
              Found umbrella
            </Text>

            <Text style={styles.cardText}>
              Your lost-and-found post is now visible to the
              community in this demo.
            </Text>
          </View>

          <Pressable
            accessibilityRole="button"
            onPress={onViewPost}
            style={({ pressed }) => [
              styles.primaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.primaryText}>
              View my post
            </Text>
          </Pressable>

          <Pressable
            accessibilityRole="button"
            onPress={onBackToCommunity}
            style={({ pressed }) => [
              styles.secondaryButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.secondaryText}>
              Back to community
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

  content: {
    paddingHorizontal: 22,
    paddingTop: 36,
  },

  title: {
    fontSize: 22,
    fontWeight: '800',
    color: c.teal,
    marginBottom: 30,
  },

  card: {
    backgroundColor: c.white,
    borderRadius: 16,
    padding: 18,
    marginBottom: 32,
  },

  cardTitle: {
    color: c.navy,
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 6,
  },

  cardText: {
    color: c.muted,
    fontSize: 13,
    lineHeight: 20,
  },

  primaryButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: c.teal,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 12,
  },

  primaryText: {
    color: c.white,
    fontSize: 14,
    fontWeight: '700',
  },

  secondaryButton: {
    minHeight: 50,
    borderRadius: 14,
    backgroundColor: c.mint,
    alignItems: 'center',
    justifyContent: 'center',
  },

  secondaryText: {
    color: c.teal,
    fontSize: 14,
    fontWeight: '700',
  },

  pressed: {
    opacity: 0.8,
  },
});