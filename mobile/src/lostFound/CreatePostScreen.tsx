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
import { Icon } from '../Artwork';
import { colors as c } from '../theme';

type CreatePostScreenProps = {
  onBack: () => void;
  onPublished: () => void;
  onNotifications: () => void;
};

export default function CreatePostScreen({
  onBack,
  onPublished,
  onNotifications,
}: CreatePostScreenProps) {
  const insets = useSafeAreaInsets();

  const [type, setType] = useState<'lost' | 'found'>('found');
  const [item, setItem] = useState('Umbrella');
  const [description, setDescription] = useState(
    'Black umbrella near the front seat'
  );
  const [routeTime, setRouteTime] = useState(
    '125 • 12 Sep, 08:30 AM'
  );

  function publish() {
    if (!item.trim() || !description.trim() || !routeTime.trim()) {
      return;
    }

    onPublished();
  }

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

          <Text style={styles.headerTitle}>Create a post</Text>

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
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        >
          <Text style={styles.title}>Help it find its owner</Text>

          <Text style={styles.subtitle}>
            Share a few details with the community.
          </Text>

          <View style={styles.segment}>
            <Pressable
              accessibilityRole="button"
              onPress={() => setType('lost')}
              style={[
                styles.segmentButton,
                type === 'lost' && styles.segmentActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  type === 'lost' && styles.segmentActiveText,
                ]}
              >
                Lost
              </Text>
            </Pressable>

            <Pressable
              accessibilityRole="button"
              onPress={() => setType('found')}
              style={[
                styles.segmentButton,
                type === 'found' && styles.segmentActive,
              ]}
            >
              <Text
                style={[
                  styles.segmentText,
                  type === 'found' && styles.segmentActiveText,
                ]}
              >
                Found
              </Text>
            </Pressable>
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Item</Text>

            <TextInput
              value={item}
              onChangeText={setItem}
              placeholder="Item name"
              placeholderTextColor={c.muted}
              style={styles.input}
              maxLength={80}
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Description</Text>

            <TextInput
              value={description}
              onChangeText={setDescription}
              placeholder="Describe the item"
              placeholderTextColor={c.muted}
              style={[styles.input, styles.descriptionInput]}
              multiline
              maxLength={300}
              textAlignVertical="top"
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>Route and time</Text>

            <View style={styles.routeInput}>
              <Icon name="bus" size={18} color={c.teal} />

              <TextInput
                value={routeTime}
                onChangeText={setRouteTime}
                placeholder="Route and time"
                placeholderTextColor={c.muted}
                style={styles.routeTextInput}
                maxLength={100}
              />
            </View>
          </View>

          <Pressable
            accessibilityRole="button"
            style={({ pressed }) => [
              styles.photoButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.photoPlus}>＋</Text>
            <Text style={styles.photoText}>Add a photo</Text>
          </Pressable>

          <View style={styles.spacer} />

          <Pressable
            accessibilityRole="button"
            onPress={publish}
            style={({ pressed }) => [
              styles.publishButton,
              pressed && styles.pressed,
            ]}
          >
            <Text style={styles.publishText}>Publish post</Text>
            <Text style={styles.arrow}>→</Text>
          </Pressable>
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
    marginBottom: 14,
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
    fontWeight: '700',
    fontSize: 17,
  },

  scroll: {
    flex: 1,
  },

  content: {
    flexGrow: 1,
    paddingHorizontal: 22,
    paddingBottom: 26,
  },

  title: {
    marginTop: 12,
    fontSize: 25,
    lineHeight: 31,
    fontWeight: '800',
    color: c.navy,
  },

  subtitle: {
    marginTop: 5,
    color: c.muted,
    fontSize: 14,
    lineHeight: 21,
  },

  segment: {
    flexDirection: 'row',
    backgroundColor: c.white,
    borderRadius: 15,
    padding: 5,
    marginTop: 26,
    marginBottom: 26,
  },

  segmentButton: {
    flex: 1,
    minHeight: 40,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 11,
  },

  segmentActive: {
    backgroundColor: c.teal,
  },

  segmentText: {
    color: c.muted,
    fontSize: 14,
  },

  segmentActiveText: {
    color: c.white,
    fontWeight: '700',
  },

  field: {
    marginBottom: 20,
  },

  label: {
    fontSize: 13,
    color: c.muted,
    marginBottom: 7,
  },

  input: {
    minHeight: 50,
    paddingHorizontal: 15,
    paddingVertical: 12,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.white,
    color: c.navy,
    fontSize: 15,
  },

  descriptionInput: {
    minHeight: 70,
  },

  routeInput: {
    minHeight: 50,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 15,
    borderRadius: 13,
    borderWidth: 1,
    borderColor: c.border,
    backgroundColor: c.white,
  },

  routeTextInput: {
    flex: 1,
    minHeight: 48,
    color: c.navy,
    fontSize: 15,
  },

  photoButton: {
    minHeight: 78,
    borderRadius: 15,
    backgroundColor: c.mint,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    gap: 16,
  },

  photoPlus: {
    fontSize: 28,
    color: c.teal,
    fontWeight: '300',
  },

  photoText: {
    color: c.teal,
    fontWeight: '700',
    fontSize: 14,
  },

  spacer: {
    flexGrow: 1,
    minHeight: 45,
  },

  publishButton: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 15,
    backgroundColor: c.teal,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },

  publishText: {
    color: c.white,
    fontWeight: '700',
    fontSize: 15,
  },

  arrow: {
    color: c.white,
    fontSize: 23,
  },

  pressed: {
    opacity: 0.8,
  },
});