import React, { useState, useEffect } from 'react';
import { Text, View, StyleSheet, TouchableOpacity, Platform, SafeAreaView } from 'react-native';
import { CameraView, Camera } from 'expo-camera';
import { useNavigation, useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function ScanTicket() {
  const [hasPermission, setHasPermission] = useState<boolean | null>(null);
  const [scanned, setScanned] = useState(false);
  const navigation = useNavigation<any>();
  const isFocused = useIsFocused();

  useEffect(() => {
    const getCameraPermissions = async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    };
    getCameraPermissions();
  }, []);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (scanned) return;
    setScanned(true);
    setTimeout(() => {
      navigation.navigate('ValidationResult', { ticketData: data });
      // Reset for next scan
      setTimeout(() => setScanned(false), 2000);
    }, 500);
  };

  if (hasPermission === null || hasPermission === false) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()}>
            <Ionicons name="arrow-back" size={24} color="#0f172a" />
          </TouchableOpacity>
          <Text style={styles.headerTitleDark}>Scan QR code</Text>
          <Ionicons name="notifications-outline" size={24} color="#0f172a" />
        </View>
        <View style={styles.center}>
          <Ionicons name="camera-outline" size={64} color="#94a3b8" />
          <Text style={styles.errorText}>No access to camera</Text>
          <TouchableOpacity style={styles.manualBtn} onPress={() => navigation.navigate('ManualCheck')}>
            <Text style={styles.manualBtnText}>Enter Ticket Manually</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Ionicons name="arrow-back" size={24} color="#0f172a" />
        </TouchableOpacity>
        <Text style={styles.headerTitleDark}>Scan QR code</Text>
        <Ionicons name="notifications-outline" size={24} color="#0f172a" />
      </View>
      
      <View style={styles.cameraWrapper}>
        <View style={styles.cameraContainer}>
          {isFocused && (
            <CameraView
              onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
              barcodeScannerSettings={{ barcodeTypes: ["qr"] }}
              style={StyleSheet.absoluteFill}
            />
          )}
          
          {/* Scan Overlay matching Figma */}
          <View style={styles.overlay}>
            <View style={styles.scanFrame}>
              {/* Top Left */}
              <View style={[styles.corner, styles.topLeft]} />
              {/* Top Right */}
              <View style={[styles.corner, styles.topRight]} />
              {/* Bottom Left */}
              <View style={[styles.corner, styles.bottomLeft]} />
              {/* Bottom Right */}
              <View style={[styles.corner, styles.bottomRight]} />
              
              {/* Center Target Icon */}
              <Ionicons name="scan" size={48} color="#ccfbf1" style={{ opacity: 0.5 }} />
            </View>
            
            <Text style={styles.instructionTitle}>Place passenger QR</Text>
            <Text style={styles.instructionSub}>inside the frame</Text>
          </View>
          
          {scanned && (
            <View style={styles.loadingOverlay}>
              <Text style={styles.verifyingText}>Verifying Ticket...</Text>
            </View>
          )}
        </View>
      </View>

      {/* Footer Area */}
      <View style={styles.footer}>
        <Text style={styles.statusText}>Camera active • Keep the ticket steady</Text>
        <Text style={styles.exampleText}>Invalid ticket example</Text>
        
        <TouchableOpacity style={styles.cancelBtn} onPress={() => navigation.goBack()}>
          <Text style={styles.cancelBtnText}>Cancel scanning</Text>
          <Ionicons name="close" size={20} color="#0f766e" />
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f8fafc' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 20, paddingVertical: 16 },
  headerTitleDark: { fontSize: 18, fontWeight: '700', color: '#0f172a' },
  center: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  cameraWrapper: { flex: 1, marginHorizontal: 20, borderRadius: 24, overflow: 'hidden', backgroundColor: '#0f172a' },
  cameraContainer: { flex: 1 },
  overlay: { flex: 1, backgroundColor: 'rgba(15, 23, 42, 0.4)', justifyContent: 'center', alignItems: 'center' },
  scanFrame: { width: 220, height: 220, justifyContent: 'center', alignItems: 'center', marginBottom: 32 },
  corner: { position: 'absolute', width: 40, height: 40, borderColor: '#2dd4bf', borderWidth: 0 },
  topLeft: { top: 0, left: 0, borderTopWidth: 4, borderLeftWidth: 4 },
  topRight: { top: 0, right: 0, borderTopWidth: 4, borderRightWidth: 4 },
  bottomLeft: { bottom: 0, left: 0, borderBottomWidth: 4, borderLeftWidth: 4 },
  bottomRight: { bottom: 0, right: 0, borderBottomWidth: 4, borderRightWidth: 4 },
  instructionTitle: { color: '#fff', fontSize: 18, fontWeight: '700', marginBottom: 4 },
  instructionSub: { color: '#94a3b8', fontSize: 14 },
  loadingOverlay: { ...StyleSheet.absoluteFill, backgroundColor: 'rgba(15, 23, 42, 0.8)', justifyContent: 'center', alignItems: 'center' },
  verifyingText: { color: '#2dd4bf', fontSize: 24, fontWeight: 'bold' },
  footer: { padding: 24, alignItems: 'center' },
  statusText: { fontSize: 12, color: '#64748b', marginBottom: 4 },
  exampleText: { fontSize: 12, color: '#94a3b8', marginBottom: 24 },
  cancelBtn: { flexDirection: 'row', width: '100%', justifyContent: 'space-between', alignItems: 'center', backgroundColor: '#fff', padding: 18, borderRadius: 12, borderWidth: 1, borderColor: '#e2e8f0' },
  cancelBtnText: { color: '#0f172a', fontSize: 16, fontWeight: '600' },
  errorText: { fontSize: 18, color: '#0f172a', marginTop: 16, fontWeight: 'bold' },
  manualBtn: { backgroundColor: '#0f766e', padding: 16, borderRadius: 12, marginTop: 24 },
  manualBtnText: { color: '#fff', fontWeight: 'bold' },
  webFallback: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 24 },
  webText: { color: '#94a3b8', textAlign: 'center', marginTop: 16 }
});

