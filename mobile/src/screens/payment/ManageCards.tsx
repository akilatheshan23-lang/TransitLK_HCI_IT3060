import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  SafeAreaView,
  FlatList,
  Modal,
  TextInput,
  ActivityIndicator,
  Alert,
  Platform,
  ScrollView,
} from 'react-native';
import { useNavigation } from '@react-navigation/native';
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { PaymentStackParamList } from '../../navigation/navigationTypes';
import { platformShadow } from '../../theme/shadows';
import { Ionicons, FontAwesome } from '@expo/vector-icons';
import Header from '../../components/Header';
import { api, SavedCard } from '../../services/api';

type NavigationProp = NativeStackNavigationProp<PaymentStackParamList, 'ManageCards'>;

export default function ManageCards() {
  const navigation = useNavigation<NavigationProp>();
  const [cards, setCards] = useState<SavedCard[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [actionLoading, setActionLoading] = useState<boolean>(false);

  // Modal State
  const [modalVisible, setModalVisible] = useState<boolean>(false);
  const [editingCardId, setEditingCardId] = useState<string | null>(null);

  // Form Fields
  const [cardholderName, setCardholderName] = useState<string>('');
  const [cardNumber, setCardNumber] = useState<string>('');
  const [expiry, setExpiry] = useState<string>('');
  const [cvv, setCvv] = useState<string>('');
  const [cardType, setCardType] = useState<string>('visa');
  const [isDefault, setIsDefault] = useState<boolean>(false);
  const [formError, setFormError] = useState<string>('');

  useEffect(() => {
    loadCards();
  }, []);

  const loadCards = async () => {
    try {
      setLoading(true);
      const res = await api.getSavedCards();
      if (res && res.data) {
        setCards(res.data);
      }
    } catch (err: any) {
      console.warn('Failed to load cards:', err);
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingCardId(null);
    setCardholderName('');
    setCardNumber('');
    setExpiry('');
    setCvv('');
    setCardType('visa');
    setIsDefault(false);
    setFormError('');
  };

  const openAddModal = () => {
    resetForm();
    if (cards.length === 0) {
      setIsDefault(true);
    }
    setModalVisible(true);
  };

  const openEditModal = (card: SavedCard) => {
    setEditingCardId(card.id || card._id || '');
    setCardholderName(card.cardholderName);
    setCardNumber(card.cardNumberMasked);
    setExpiry(card.expiry);
    setCvv('•••');
    setCardType(card.cardType || 'visa');
    setIsDefault(Boolean(card.isDefault));
    setFormError('');
    setModalVisible(true);
  };

  // Card Number formatting (Auto-space or 4-6-5 for Amex)
  const handleCardNumberChange = (text: string) => {
    const cleanNum = text.replace(/\D/g, '');
    let formattedText = cleanNum;

    if (cardType === 'amex') {
      const match = cleanNum.match(/^(\d{0,4})(\d{0,6})(\d{0,5})$/);
      if (match) {
        formattedText = !match[2] ? match[1] : `${match[1]} ${match[2]}${match[3] ? ` ${match[3]}` : ''}`;
      }
    } else {
      formattedText = cleanNum.match(/.{1,4}/g)?.join(' ') || '';
    }

    setCardNumber(formattedText.substring(0, 19));
  };

  // Expiry formatting: auto-slash insertion
  const handleExpiryChange = (text: string) => {
    const clean = text.replace(/\D/g, '');
    let formatted = clean;
    if (clean.length >= 2) {
      formatted = `${clean.substring(0, 2)}/${clean.substring(2, 4)}`;
    }
    setExpiry(formatted.substring(0, 5));
  };

  // CVV formatting
  const handleCvvChange = (text: string) => {
    const clean = text.replace(/\D/g, '');
    const maxLen = cardType === 'amex' ? 4 : 3;
    setCvv(clean.substring(0, maxLen));
  };

  const handleSaveCard = async () => {
    setFormError('');

    // 1. Cardholder Name Validation
    if (!cardholderName.trim()) {
      setFormError('Please enter the cardholder name.');
      return;
    }

    // 2. Card Number Validation (when adding)
    if (!editingCardId) {
      const cleanNum = cardNumber.replace(/\D/g, '');
      if (cleanNum.length < 12) {
        setFormError('Please enter a valid card number.');
        return;
      }
    }

    // 3. Expiry Date Validation
    if (expiry.length < 5) {
      setFormError('Please enter card expiry date (MM/YY).');
      return;
    }

    // 4. CVV Validation (when adding)
    if (!editingCardId) {
      const minCvvLen = cardType === 'amex' ? 4 : 3;
      if (cvv.length < minCvvLen) {
        setFormError(`Please enter a valid ${minCvvLen}-digit CVV.`);
        return;
      }
    }

    setActionLoading(true);
    try {
      if (editingCardId) {
        // Edit Card
        await api.updateSavedCard(editingCardId, {
          cardholderName: cardholderName.trim().toUpperCase(),
          expiry: expiry.trim(),
          cardType,
          isDefault,
        });
      } else {
        // Add Card
        await api.addSavedCard({
          cardNumber,
          cardholderName: cardholderName.trim().toUpperCase(),
          expiry: expiry.trim(),
          cardType,
          isDefault,
        });
      }

      setModalVisible(false);
      resetForm();
      await loadCards();
    } catch (err: any) {
      setFormError(err.message || 'Failed to save card. Please try again.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleSetDefault = async (card: SavedCard) => {
    const targetId = card.id || card._id;
    if (!targetId || card.isDefault) return;

    try {
      setActionLoading(true);
      await api.updateSavedCard(targetId, { isDefault: true });
      await loadCards();
    } catch (e: any) {
      Alert.alert('Error', 'Could not set as default card.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleDeleteCard = (card: SavedCard) => {
    const targetId = card.id || card._id;
    if (!targetId) return;

    const executeDelete = async () => {
      try {
        setActionLoading(true);
        await api.deleteSavedCard(targetId);
        await loadCards();
      } catch (err: any) {
        Alert.alert('Delete Error', 'Could not delete card.');
      } finally {
        setActionLoading(false);
      }
    };

    if (Platform.OS === 'web') {
      if (window.confirm(`Are you sure you want to delete ${card.cardNumberMasked}?`)) {
        executeDelete();
      }
    } else {
      Alert.alert(
        'Delete Card',
        `Are you sure you want to remove card ending in ${card.last4}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          { text: 'Delete', style: 'destructive', onPress: executeDelete },
        ]
      );
    }
  };

  const getCardIcon = (type: string = 'visa') => {
    switch (type.toLowerCase()) {
      case 'visa':
        return 'cc-visa';
      case 'mastercard':
        return 'cc-mastercard';
      case 'amex':
        return 'cc-amex';
      case 'discover':
        return 'cc-discover';
      default:
        return 'credit-card';
    }
  };

  const getBrandMeta = (type: string = 'visa') => {
    switch (type.toLowerCase()) {
      case 'visa':
        return {
          bg: '#1d4ed8', // Royal Blue
          cardShadow: '#1e40af',
          badgeBg: '#1e3a8a',
          accent: '#60a5fa',
          chipColor: '#facc15',
          glow: 'rgba(255, 255, 255, 0.12)',
          buttonActiveBg: '#eff6ff',
          buttonActiveBorder: '#2563eb',
          buttonActiveText: '#1d4ed8',
          name: 'VISA',
        };
      case 'mastercard':
        return {
          bg: '#b91c1c', // Rich Crimson Ruby Red (No more black!)
          cardShadow: '#991b1b',
          badgeBg: '#7f1d1d',
          accent: '#fed7aa',
          chipColor: '#fde047',
          glow: 'rgba(251, 146, 60, 0.22)',
          buttonActiveBg: '#fef2f2',
          buttonActiveBorder: '#dc2626',
          buttonActiveText: '#b91c1c',
          name: 'MASTERCARD',
        };
      case 'amex':
        return {
          bg: '#047857', // Deep Emerald Jade
          cardShadow: '#064e3b',
          badgeBg: '#064e3b',
          accent: '#6ee7b7',
          chipColor: '#e2e8f0',
          glow: 'rgba(52, 211, 153, 0.2)',
          buttonActiveBg: '#ecfdf5',
          buttonActiveBorder: '#059669',
          buttonActiveText: '#047857',
          name: 'AMEX',
        };
      case 'discover':
        return {
          bg: '#c2410c', // Warm Terracotta / Sunset Bronze
          cardShadow: '#9a3412',
          badgeBg: '#7c2d12',
          accent: '#fde047',
          chipColor: '#fef08a',
          glow: 'rgba(251, 146, 60, 0.25)',
          buttonActiveBg: '#fff7ed',
          buttonActiveBorder: '#ea580c',
          buttonActiveText: '#c2410c',
          name: 'DISCOVER',
        };
      default:
        return {
          bg: '#0f766e', // Deep Teal
          cardShadow: '#115e59',
          badgeBg: '#134e4a',
          accent: '#5eead4',
          chipColor: '#facc15',
          glow: 'rgba(20, 184, 166, 0.2)',
          buttonActiveBg: '#f0fdfa',
          buttonActiveBorder: '#0f766e',
          buttonActiveText: '#0f766e',
          name: 'CARD',
        };
    }
  };

  const renderCardItem = ({ item }: { item: SavedCard }) => {
    const maskedDisplay = item.last4
      ? `••••  ••••  ••••  ${item.last4}`
      : (item.cardNumberMasked || '••••  ••••  ••••  1111').replace(/\s+/g, '  ');

    const brandTheme = getBrandMeta(item.cardType);

    return (
      <View style={[styles.cardItem, { backgroundColor: brandTheme.bg, shadowColor: brandTheme.cardShadow }]}>
        {/* Subtle decorative circles for high-end card aesthetics */}
        <View style={[styles.cardDecoCircle1, { backgroundColor: brandTheme.glow }]} />
        <View style={[styles.cardDecoCircle2, { backgroundColor: brandTheme.glow }]} />

        {/* Top Row: Brand & DEFAULT Badge */}
        <View style={styles.cardTopRow}>
          <View style={styles.cardBrandContainer}>
            <FontAwesome name={getCardIcon(item.cardType) as any} size={24} color="#ffffff" style={{ marginRight: 10 }} />
            <Text style={styles.cardBrandTitle}>{(item.cardType || 'VISA').toUpperCase()}</Text>
          </View>

          {item.isDefault && (
            <View style={[styles.defaultPill, { backgroundColor: brandTheme.badgeBg }]}>
              <Ionicons name="checkmark-circle" size={12} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.defaultPillText}>DEFAULT</Text>
            </View>
          )}
        </View>

        {/* Chip & Contactless Indicator */}
        <View style={styles.chipRow}>
          <View style={[styles.whiteChip, { backgroundColor: brandTheme.chipColor }]}>
            <View style={styles.chipInnerPattern} />
          </View>
          <Ionicons name="wifi" size={20} color="rgba(255,255,255,0.85)" style={styles.contactlessWave} />
        </View>

        {/* Masked Card Number */}
        <Text style={styles.cardNumberText}>{maskedDisplay}</Text>

        {/* Cardholder & Expiry Row */}
        <View style={styles.cardMetaRow}>
          <View>
            <Text style={styles.metaLabel}>CARDHOLDER</Text>
            <Text style={styles.metaValue}>{item.cardholderName}</Text>
          </View>
          <View style={{ alignItems: 'flex-end' }}>
            <Text style={styles.metaLabel}>EXPIRES</Text>
            <Text style={styles.metaValue}>{item.expiry}</Text>
          </View>
        </View>

        {/* Action Buttons: Set as default, Edit Card, Delete */}
        <View style={styles.cardActionsRow}>
          {!item.isDefault ? (
            <TouchableOpacity
              style={styles.setDefaultPill}
              onPress={() => handleSetDefault(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="star-outline" size={13} color="#ffffff" style={{ marginRight: 4 }} />
              <Text style={styles.setDefaultPillText}>Set as default</Text>
            </TouchableOpacity>
          ) : (
            <View style={{ flex: 1 }} />
          )}

          <View style={styles.rightActions}>
            <TouchableOpacity
              style={styles.editCardBtn}
              onPress={() => openEditModal(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="pencil" size={12} color="#ffffff" style={{ marginRight: 5 }} />
              <Text style={styles.editCardBtnText}>Edit</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.deleteCardBtn}
              onPress={() => handleDeleteCard(item)}
              activeOpacity={0.8}
            >
              <Ionicons name="trash" size={12} color="#ffffff" style={{ marginRight: 5 }} />
              <Text style={styles.deleteCardBtnText}>Delete</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    );
  };

  return (
    <SafeAreaView style={styles.container}>
      <Header title="Saved payment cards" />

      <View style={styles.content}>
        <View style={styles.headerBanner}>
          <View style={{ flex: 1, paddingRight: 12 }}>
            <Text style={styles.pageTitle}>Payment Cards</Text>
            <Text style={styles.pageSubtitle}>Manage your cards for hassle-free bus transit.</Text>
          </View>
          <TouchableOpacity style={styles.addCardButton} onPress={openAddModal} activeOpacity={0.8}>
            <Ionicons name="add" size={18} color="#fff" />
            <Text style={styles.addCardButtonText}>Add Card</Text>
          </TouchableOpacity>
        </View>

        {loading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#0f766e" />
            <Text style={styles.loadingText}>Loading saved cards...</Text>
          </View>
        ) : (
          <FlatList
            data={cards}
            keyExtractor={(item) => item.id || item._id || Math.random().toString()}
            renderItem={renderCardItem}
            contentContainerStyle={styles.listContainer}
            ListEmptyComponent={
              <View style={styles.emptyState}>
                <View style={styles.emptyIconCircle}>
                  <Ionicons name="card-outline" size={48} color="#94a3b8" />
                </View>
                <Text style={styles.emptyTitle}>No saved cards found</Text>
                <Text style={styles.emptySubtitle}>
                  Add your credit or debit card for instant 1-tap bus and train ticket checkout.
                </Text>
                <TouchableOpacity style={styles.emptyAddBtn} onPress={openAddModal} activeOpacity={0.8}>
                  <Ionicons name="add-circle-outline" size={18} color="#fff" />
                  <Text style={styles.emptyAddBtnText}>Add your first card</Text>
                </TouchableOpacity>
              </View>
            }
          />
        )}
      </View>

      {/* Add / Edit Card Bottom Sheet (Constrained inside phone screen) */}
      {modalVisible && (
        <View style={styles.modalOverlay}>
          <View style={styles.modalSheet}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {editingCardId ? 'Edit Card Details' : 'Add New Payment Card'}
              </Text>
              <TouchableOpacity onPress={() => setModalVisible(false)} hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}>
                <Ionicons name="close" size={24} color="#64748b" />
              </TouchableOpacity>
            </View>

            <ScrollView contentContainerStyle={styles.modalFormContent} showsVerticalScrollIndicator={false}>
              {formError ? (
                <View style={styles.errorAlert}>
                  <Ionicons name="alert-circle" size={18} color="#b91c1c" />
                  <Text style={styles.errorAlertText}>{formError}</Text>
                </View>
              ) : null}

              {/* Card Type Selector */}
              <Text style={styles.inputLabel}>CARD TYPE</Text>
              <View style={styles.cardTypeRow}>
                {['visa', 'mastercard', 'amex', 'discover'].map((type) => {
                  const isCurrent = cardType === type;
                  const typeMeta = getBrandMeta(type);
                  return (
                    <TouchableOpacity
                      key={type}
                      style={[
                        styles.typeOption,
                        isCurrent && {
                          borderColor: typeMeta.buttonActiveBorder,
                          backgroundColor: typeMeta.buttonActiveBg,
                        },
                      ]}
                      onPress={() => setCardType(type)}
                      activeOpacity={0.8}
                    >
                      <FontAwesome
                        name={getCardIcon(type) as any}
                        size={20}
                        color={isCurrent ? typeMeta.buttonActiveText : '#64748b'}
                      />
                      <Text
                        style={[
                          styles.typeText,
                          isCurrent && { color: typeMeta.buttonActiveText, fontWeight: '800' },
                        ]}
                      >
                        {type.toUpperCase()}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>

              {/* Live Brand Card Color Preview */}
              <View style={[styles.miniModalCard, { backgroundColor: getBrandMeta(cardType).bg }]}>
                <View style={styles.miniModalTop}>
                  <View style={{ flexDirection: 'row', alignItems: 'center' }}>
                    <FontAwesome name={getCardIcon(cardType) as any} size={18} color="#ffffff" style={{ marginRight: 6 }} />
                    <Text style={styles.miniModalBrand}>{cardType.toUpperCase()}</Text>
                  </View>
                  <Ionicons name="wifi" size={16} color="rgba(255,255,255,0.8)" />
                </View>
                <Text style={styles.miniModalNumber}>
                  {cardNumber || (cardType === 'amex' ? '••••  ••••••  •••••' : '••••  ••••  ••••  ••••')}
                </Text>
                <View style={styles.miniModalBottom}>
                  <Text style={styles.miniModalHolder}>{cardholderName || 'CARDHOLDER NAME'}</Text>
                  <Text style={styles.miniModalExpiry}>{expiry || 'MM/YY'}</Text>
                </View>
              </View>

              {/* Cardholder Name */}
              <Text style={styles.inputLabel}>CARDHOLDER NAME</Text>
              <TextInput
                style={styles.textInput}
                placeholder="e.g. KAMAL PERERA"
                placeholderTextColor="#94a3b8"
                value={cardholderName}
                onChangeText={(text) => setCardholderName(text.toUpperCase())}
                autoCapitalize="characters"
              />

              {/* Card Number (disabled in edit mode) */}
              <Text style={styles.inputLabel}>
                CARD NUMBER {editingCardId ? '(MASKED)' : ''}
              </Text>
              <TextInput
                style={[styles.textInput, editingCardId ? styles.disabledInput : null]}
                placeholder={cardType === 'amex' ? '4000 123456 78901' : '4000 1234 5678 9010'}
                placeholderTextColor="#94a3b8"
                value={cardNumber}
                onChangeText={handleCardNumberChange}
                keyboardType="numeric"
                editable={!editingCardId}
              />

              {/* Expiry & CVV */}
              <View style={styles.rowTwoInputs}>
                <View style={{ flex: 1, marginRight: 10 }}>
                  <Text style={styles.inputLabel}>EXPIRY DATE (MM/YY)</Text>
                  <TextInput
                    style={styles.textInput}
                    placeholder="12/28"
                    placeholderTextColor="#94a3b8"
                    value={expiry}
                    onChangeText={handleExpiryChange}
                    keyboardType="numeric"
                    maxLength={5}
                  />
                </View>
                <View style={{ flex: 1, marginLeft: 10 }}>
                  <Text style={styles.inputLabel}>CVV / CVC</Text>
                  <TextInput
                    style={[styles.textInput, editingCardId ? styles.disabledInput : null]}
                    placeholder={cardType === 'amex' ? '4 digits' : '3 digits'}
                    placeholderTextColor="#94a3b8"
                    value={cvv}
                    onChangeText={handleCvvChange}
                    keyboardType="numeric"
                    maxLength={cardType === 'amex' ? 4 : 3}
                    secureTextEntry={!editingCardId}
                    editable={!editingCardId}
                  />
                </View>
              </View>

              {/* Default Card Checkbox */}
              <TouchableOpacity
                style={styles.checkboxRow}
                onPress={() => setIsDefault(!isDefault)}
                activeOpacity={0.8}
              >
                <View style={[styles.checkbox, isDefault && styles.checkboxChecked]}>
                  {isDefault && <Ionicons name="checkmark" size={14} color="#fff" />}
                </View>
                <Text style={styles.checkboxLabel}>Set as default card for future payments</Text>
              </TouchableOpacity>

              {/* Save Button */}
              <TouchableOpacity
                style={styles.saveButton}
                onPress={handleSaveCard}
                disabled={actionLoading}
                activeOpacity={0.8}
              >
                {actionLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <>
                    <Text style={styles.saveButtonText}>
                      {editingCardId ? 'Save Changes' : 'Save Card Securely'}
                    </Text>
                    <Ionicons name="shield-checkmark-outline" size={18} color="#fff" style={{ marginLeft: 8 }} />
                  </>
                )}
              </TouchableOpacity>
            </ScrollView>
          </View>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc', position: 'relative' },
  content: { flex: 1, padding: 20 },
  headerBanner: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  pageTitle: { fontSize: 22, fontWeight: '800', color: '#0f172a' },
  pageSubtitle: { fontSize: 13, color: '#64748b', marginTop: 2, maxWidth: 220 },
  addCardButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f766e',
    paddingVertical: 9,
    paddingHorizontal: 14,
    borderRadius: 10,
    ...platformShadow({ color: '#0f766e', width: 0, height: 2, opacity: 0.25, radius: 4, elevation: 3 }),
  },
  addCardButtonText: { color: '#fff', fontWeight: '700', fontSize: 13, marginLeft: 4 },
  loadingContainer: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  loadingText: { marginTop: 12, color: '#64748b', fontSize: 14 },
  listContainer: { paddingBottom: 40 },
  cardItem: {
    position: 'relative',
    overflow: 'hidden',
    backgroundColor: '#1d4ed8',
    borderRadius: 22,
    padding: 20,
    marginBottom: 16,
    ...platformShadow({ color: '#000', width: 0, height: 6, opacity: 0.25, radius: 12, elevation: 6 }),
  },
  cardDecoCircle1: {
    position: 'absolute',
    top: -40,
    right: -40,
    width: 140,
    height: 140,
    borderRadius: 70,
  },
  cardDecoCircle2: {
    position: 'absolute',
    bottom: -50,
    left: -30,
    width: 130,
    height: 130,
    borderRadius: 65,
  },
  cardTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 14,
  },
  cardBrandContainer: { flexDirection: 'row', alignItems: 'center' },
  cardBrandTitle: { fontSize: 14, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  defaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  defaultPillText: { fontSize: 10, fontWeight: '800', color: '#ffffff', letterSpacing: 0.5 },
  chipRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 12 },
  whiteChip: {
    width: 38,
    height: 26,
    borderRadius: 6,
    backgroundColor: '#facc15',
    padding: 3,
  },
  chipInnerPattern: {
    flex: 1,
    borderWidth: 1,
    borderColor: 'rgba(0, 0, 0, 0.15)',
    borderRadius: 4,
  },
  contactlessWave: {
    marginLeft: 10,
    transform: [{ rotate: '90deg' }],
  },
  cardNumberText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 3,
    marginBottom: 16,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  cardMetaRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255, 255, 255, 0.15)',
    marginBottom: 14,
  },
  metaLabel: { fontSize: 9, fontWeight: '700', color: 'rgba(255, 255, 255, 0.7)', letterSpacing: 0.8 },
  metaValue: { fontSize: 13, fontWeight: '800', color: '#ffffff', marginTop: 3 },
  cardActionsRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  setDefaultPill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.2)',
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
  },
  setDefaultPillText: { fontSize: 11, fontWeight: '700', color: '#ffffff' },
  rightActions: { flexDirection: 'row', alignItems: 'center', marginLeft: 'auto' },
  editCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.22)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.35)',
    marginRight: 8,
  },
  editCardBtnText: { fontSize: 12, fontWeight: '700', color: '#ffffff' },
  deleteCardBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: 'rgba(255, 255, 255, 0.25)',
  },
  deleteCardBtnText: { fontSize: 12, fontWeight: '700', color: '#fecaca' },
  emptyState: { alignItems: 'center', marginTop: 60, paddingHorizontal: 20 },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: '#f1f5f9',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 16,
  },
  emptyTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a', marginBottom: 8 },
  emptySubtitle: { fontSize: 14, color: '#64748b', textAlign: 'center', marginBottom: 24, lineHeight: 20 },
  emptyAddBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#0f766e',
    paddingVertical: 12,
    paddingHorizontal: 20,
    borderRadius: 12,
  },
  emptyAddBtnText: { color: '#fff', fontSize: 14, fontWeight: '700', marginLeft: 6 },
  modalOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(15, 23, 42, 0.65)',
    justifyContent: 'flex-end',
    zIndex: 9999,
  },
  modalSheet: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 28,
    borderTopRightRadius: 28,
    maxHeight: '85%',
    padding: 20,
    paddingBottom: 24,
    ...platformShadow({ color: '#000', width: 0, height: -4, opacity: 0.2, radius: 16, elevation: 16 }),
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: { fontSize: 18, fontWeight: '800', color: '#0f172a' },
  modalFormContent: { paddingBottom: 20 },
  errorAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fef2f2',
    borderWidth: 1,
    borderColor: '#fecaca',
    padding: 10,
    borderRadius: 10,
    marginBottom: 16,
  },
  errorAlertText: { color: '#b91c1c', fontSize: 12, fontWeight: '600', marginLeft: 8 },
  inputLabel: { fontSize: 11, fontWeight: '700', color: '#475569', marginBottom: 6, letterSpacing: 0.5 },
  textInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 10,
    paddingHorizontal: 14,
    paddingVertical: 12,
    fontSize: 14,
    color: '#0f172a',
    marginBottom: 16,
  },
  disabledInput: { backgroundColor: '#f1f5f9', color: '#94a3b8' },
  rowTwoInputs: { flexDirection: 'row', justifyContent: 'space-between' },
  cardTypeRow: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  miniModalCard: {
    borderRadius: 14,
    padding: 14,
    marginBottom: 16,
    ...platformShadow({ color: '#000', width: 0, height: 2, opacity: 0.15, radius: 6, elevation: 3 }),
  },
  miniModalTop: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  miniModalBrand: {
    fontSize: 12,
    fontWeight: '800',
    color: '#ffffff',
    letterSpacing: 0.5,
  },
  miniModalNumber: {
    fontSize: 15,
    fontWeight: '700',
    color: '#ffffff',
    letterSpacing: 2,
    marginBottom: 8,
    fontFamily: Platform.OS === 'ios' ? 'Courier' : 'monospace',
  },
  miniModalBottom: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  miniModalHolder: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  miniModalExpiry: {
    fontSize: 11,
    fontWeight: '700',
    color: 'rgba(255, 255, 255, 0.9)',
  },
  typeOption: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: 10,
    marginHorizontal: 3,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc',
  },
  typeOptionActive: { borderColor: '#0f766e', backgroundColor: '#f0fdfa' },
  typeText: { fontSize: 10, fontWeight: '700', color: '#64748b', marginTop: 4 },
  typeTextActive: { color: '#0f766e' },
  checkboxRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 20, marginTop: 4 },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 6,
    borderWidth: 1.5,
    borderColor: '#cbd5e1',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  checkboxChecked: { backgroundColor: '#0f766e', borderColor: '#0f766e' },
  checkboxLabel: { fontSize: 13, color: '#334155', fontWeight: '600' },
  saveButton: {
    backgroundColor: '#0f766e',
    borderRadius: 12,
    paddingVertical: 14,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    ...platformShadow({ color: '#0f766e', width: 0, height: 3, opacity: 0.25, radius: 6, elevation: 4 }),
  },
  saveButtonText: { color: '#fff', fontSize: 15, fontWeight: '700' },
});
