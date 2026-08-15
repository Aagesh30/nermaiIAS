import React, { useState, useEffect, useRef } from 'react';
import { StudentApi } from '../core/services';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast/ToastContext';
import { QrCode, Clock, CheckCircle2, AlertCircle, Send, Upload, Eye, Image as ImageIcon } from 'lucide-react';
import { 
  Platform, 
  View, 
  Text, 
  ScrollView, 
  StyleSheet, 
  TextInput, 
  TouchableOpacity, 
  Image, 
  ActivityIndicator, 
  Alert,
  Modal 
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import * as ImagePicker from 'expo-image-picker';

export const StudentPayFeesPage = () => {
  const { success, error } = useToast();
  const [status, setStatus] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [timeLeft, setTimeLeft] = useState<number>(0);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Payment Transaction States
  const [transactionId, setTransactionId] = useState('');
  const [screenshotUrl, setScreenshotUrl] = useState('');
  const [submittingPayment, setSubmittingPayment] = useState(false);
  const [paymentHistory, setPaymentHistory] = useState<any[]>([]);
  const [expandedAckId, setExpandedAckId] = useState<string | null>(null);

  const fetchQrStatus = async () => {
    try {
      const res = await StudentApi.getStudentQrStatus();
      const data = res.data?.data;
      setStatus(data);
      if (data?.qrCodeEnabled && data?.remainingSeconds > 0) {
        setTimeLeft(data.remainingSeconds);
      } else {
        setTimeLeft(0);
      }
    } catch (err) {
      console.error('Failed to load QR code status', err);
    }
  };

  const fetchPaymentHistory = async () => {
    try {
      const res = await StudentApi.getStudentPaymentAcknowledgements();
      setPaymentHistory(res.data?.data || []);
    } catch (err) {
      console.error('Failed to load payment history', err);
    }
  };

  const initData = async () => {
    setLoading(true);
    await Promise.all([fetchQrStatus(), fetchPaymentHistory()]);
    setLoading(false);
  };

  useEffect(() => {
    initData();
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, []);

  // Tick the countdown timer using device local time
  useEffect(() => {
    if (status?.qrCodeEnabled && timeLeft > 0) {
      if (timerRef.current) clearInterval(timerRef.current);
      
      const enabledAtTime = new Date(status.qrCodeEnabledAt).getTime();
      const durationMs = status.timerDuration * (status.timerUnit === 'minutes' ? 60 : 3600) * 1000;
      const expiryTime = enabledAtTime + durationMs;

      timerRef.current = setInterval(() => {
        const now = Date.now();
        const diff = Math.max(0, Math.floor((expiryTime - now) / 1000));
        
        setTimeLeft(diff);
        
        if (diff <= 0) {
          if (timerRef.current) clearInterval(timerRef.current);
          // Set qrCodeEnabled to false locally so page updates
          setStatus((prev: any) => ({ ...prev, qrCodeEnabled: false }));
          if (Platform.OS === 'web') {
            success("The payment QR code session has expired.");
          } else {
            Alert.alert("Expired", "The payment QR code session has expired.");
          }
        }
      }, 1000);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [status?.qrCodeEnabled, timeLeft, status?.qrCodeEnabledAt]);

  const handleRequestQr = async () => {
    setSubmitting(true);
    try {
      await StudentApi.requestStudentQr();
      const msg = "Request sent, admin will respond in a short time";
      if (Platform.OS === 'web') {
        success(msg);
      } else {
        Alert.alert("Request Sent", msg);
      }
      setIsDialogOpen(false);
      fetchQrStatus();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Failed to send request.';
      if (Platform.OS === 'web') {
        error(errMsg);
      } else {
        Alert.alert("Error", errMsg);
      }
    } finally {
      setSubmitting(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new window.Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement('canvas');
        let width = img.width;
        let height = img.height;

        // Scale down dimensions to keep it lightweight
        const MAX_DIM = 600;
        if (width > MAX_DIM || height > MAX_DIM) {
          if (width > height) {
            height = Math.round((height * MAX_DIM) / width);
            width = MAX_DIM;
          } else {
            width = Math.round((width * MAX_DIM) / height);
            height = MAX_DIM;
          }
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        ctx?.drawImage(img, 0, 0, width, height);

        // Adjust quality to ensure size is strictly less than 50KB (base64 length < ~68000 chars)
        let quality = 0.8;
        let compressed = canvas.toDataURL('image/jpeg', quality);
        
        while (compressed.length > 50 * 1024 && quality > 0.1) {
          quality -= 0.1;
          compressed = canvas.toDataURL('image/jpeg', quality);
        }

        // Second fallback: scale down by half if still too large
        if (compressed.length > 50 * 1024) {
          canvas.width = Math.round(width / 2);
          canvas.height = Math.round(height / 2);
          ctx?.drawImage(img, 0, 0, canvas.width, canvas.height);
          compressed = canvas.toDataURL('image/jpeg', 0.5);
        }

        setScreenshotUrl(compressed);
        success("Screenshot processed & compressed below 50KB successfully!");
      };
    };
    reader.readAsDataURL(file);
  };

  const handleMobileScreenshotPick = async () => {
    try {
      const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (status !== 'granted') {
        Alert.alert('Permission Denied', 'Sorry, we need camera roll permissions to upload screenshots!');
        return;
      }

      let result = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.4,
        base64: true,
      });

      if (!result.canceled && result.assets && result.assets.length > 0) {
        const base64Data = result.assets[0].base64;
        setScreenshotUrl(`data:image/jpeg;base64,${base64Data}`);
        Alert.alert("Success", "Screenshot attached successfully!");
      }
    } catch (err: any) {
      Alert.alert("Error", err.message || "Failed to pick image");
    }
  };

  const handleSubmitAcknowledgement = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!transactionId && !screenshotUrl) {
      const msg = "Please enter a Transaction ID or upload a payment screenshot.";
      if (Platform.OS === 'web') {
        return error(msg);
      } else {
        return Alert.alert("Error", msg);
      }
    }

    setSubmittingPayment(true);
    try {
      await StudentApi.submitPaymentAcknowledgement({
        transactionId,
        screenshotUrl
      });
      const msg = "Transaction acknowledgement submitted successfully!";
      if (Platform.OS === 'web') {
        success(msg);
      } else {
        Alert.alert("Success", msg);
      }
      setTransactionId('');
      setScreenshotUrl('');
      
      if (Platform.OS === 'web') {
        // Reset file input on web
        const fileInput = document.getElementById('screenshot-upload') as HTMLInputElement;
        if (fileInput) fileInput.value = '';
      }

      fetchPaymentHistory();
    } catch (err: any) {
      const errMsg = err?.response?.data?.message || 'Failed to submit acknowledgement.';
      if (Platform.OS === 'web') {
        error(errMsg);
      } else {
        Alert.alert("Error", errMsg);
      }
    } finally {
      setSubmittingPayment(false);
    }
  };

  const formatTime = (seconds: number) => {
    if (seconds <= 0) return 'Expired';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    
    if (hrs > 0) {
      return `${hrs}h ${mins}m ${secs}s`;
    }
    return `${mins}m ${secs}s`;
  };

  const formatDate = (dateStr: string) => {
    if (!dateStr) return '';
    const date = new Date(dateStr);
    return date.toLocaleDateString(undefined, { 
      month: 'short', 
      day: 'numeric', 
      hour: '2-digit', 
      minute: '2-digit' 
    });
  };

  if (Platform.OS === 'web') {
    return (
      <div className="space-y-6 max-w-4xl mx-auto">
        <PageHeader 
          title="Pay Fees" 
          description="View payment terms, scan QR codes, and pay your fees." 
        />

        {loading ? (
          <div className="flex justify-center items-center h-48">
            <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-600 border-t-primary" />
          </div>
        ) : (
          <div className="space-y-6">
            
            <Card className="backdrop-blur-md overflow-hidden">
              <CardContent className="p-8 flex flex-col items-center text-center">
                
                {!status?.qrCodeEnabled ? (
                  // Not enabled view
                  <div className="w-full space-y-6">
                    <div className="p-4 bg-primary/10 rounded-full w-16 h-16 flex items-center justify-center mx-auto text-primary">
                      <QrCode size={36} />
                    </div>
                    
                    {status?.qrCodeRequested ? (
                      // Request is pending
                      <div className="space-y-4">
                        <div className="inline-flex items-center gap-2 bg-amber-500/10 text-amber-400 px-4 py-2 rounded-full border border-amber-500/20 text-sm font-semibold">
                          <CheckCircle2 size={16} />
                          Request Pending Approval
                        </div>
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Your request is sent!</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                          The administrator has been notified. They will respond in a short time. Please refresh this page or check back later.
                        </p>
                        <Button 
                          variant="outline" 
                          onClick={fetchQrStatus}
                          className="mt-2"
                        >
                          Refresh Status
                        </Button>
                      </div>
                    ) : (
                      // Idle state - can request QR code
                      <div className="space-y-4">
                        <h3 className="text-xl font-bold text-gray-900 dark:text-white">Scan QR Code for Payments</h3>
                        <p className="text-sm text-gray-500 dark:text-gray-400 max-w-md mx-auto">
                          To view the administration's fee payment QR code, please request access. The code will be valid for a limited time.
                        </p>
                        <Button 
                          onClick={() => setIsDialogOpen(true)}
                          className="bg-gradient-to-r from-primary to-yellow-600 text-white font-bold px-8 py-3 rounded-xl shadow-lg hover:shadow-primary/20 transition-all flex items-center gap-2 mx-auto"
                        >
                          <QrCode size={18} />
                          Fees
                        </Button>
                      </div>
                    )}
                  </div>
                ) : (
                  // Enabled/Active view
                  <div className="w-full space-y-8">
                    <div className="inline-flex items-center gap-2 bg-emerald-500/10 text-emerald-400 px-4 py-2 rounded-full border border-emerald-500/20 text-sm font-semibold">
                      <CheckCircle2 size={16} />
                      Payment QR Code Active
                    </div>
                    
                    {/* Countdown & Scan Container */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8 items-center">
                      
                      {/* Left block: QR code display */}
                      <div className="space-y-4">
                        {/* Countdown Timer */}
                        <div className="bg-gray-50 dark:bg-surfaceHighlight/50 border border-gray-200 dark:border-gray-700 rounded-xl p-3.5 flex items-center justify-center gap-3 max-w-xs mx-auto">
                          <Clock className="text-primary animate-pulse" size={18} />
                          <span className="text-sm font-medium text-gray-500 dark:text-gray-400">
                            Expires in <b className="text-primary text-base font-bold font-mono">{formatTime(timeLeft)}</b>
                          </span>
                        </div>

                        {status?.qrCodeUrl ? (
                          <div className="relative inline-block p-4 bg-white rounded-2xl shadow-inner border border-gray-200">
                            <img 
                              src={status.qrCodeUrl} 
                              alt="Payment QR Code" 
                              className="w-56 h-56 object-contain rounded-lg"
                            />
                          </div>
                        ) : (
                          <div className="p-8 border border-dashed border-gray-200 dark:border-gray-700 rounded-xl text-center">
                            <AlertCircle className="mx-auto text-destructive mb-2 w-10 h-10" />
                            <p className="text-gray-500 dark:text-gray-400">No QR code image uploaded by admin.</p>
                          </div>
                        )}
                      </div>

                      {/* Right block: Submit transaction ID or screenshot */}
                      <div className="text-left border border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-surfaceHighlight/30 p-6 rounded-2xl space-y-4">
                        <h4 className="text-md font-bold text-gray-900 dark:text-white flex items-center gap-2">
                          <Send size={16} className="text-primary" />
                          Submit Transaction Proof
                        </h4>
                        
                        <form onSubmit={handleSubmitAcknowledgement} className="space-y-4">
                          
                          {/* Transaction ID Input */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Transaction ID / UTR</label>
                            <input 
                              type="text"
                              placeholder="Enter 12-digit transaction ID"
                              value={transactionId}
                              onChange={(e) => setTransactionId(e.target.value)}
                              className="w-full bg-white dark:bg-[#1a1a2e] border border-gray-300 dark:border-gray-700 rounded-lg px-3 py-2 text-sm text-gray-900 dark:text-white focus:outline-none focus:border-primary"
                            />
                          </div>

                          {/* File Upload Box */}
                          <div>
                            <label className="text-xs font-semibold text-gray-500 dark:text-gray-400 block mb-1">Upload Receipt Screenshot</label>
                            <div className="relative border border-dashed border-gray-300 dark:border-gray-700 rounded-lg p-3 bg-white dark:bg-[#1a1a2e] flex items-center justify-between">
                              <span className="text-xs text-gray-500 dark:text-gray-400 truncate max-w-[200px]">
                                {screenshotUrl ? "✓ Screenshot attached (<50KB)" : "Select payment receipt image"}
                              </span>
                              <label className="cursor-pointer bg-primary/10 border border-primary/20 text-primary px-3 py-1 rounded text-xs font-bold hover:bg-primary/20 transition-all flex items-center gap-1">
                                <Upload size={12} />
                                Choose
                                <input 
                                  id="screenshot-upload"
                                  type="file" 
                                  accept="image/*"
                                  onChange={handleScreenshotChange}
                                  className="hidden" 
                                />
                              </label>
                            </div>
                          </div>

                          {/* Image Thumbnail preview if selected */}
                          {screenshotUrl && (
                            <div className="flex items-center gap-2 bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20 text-emerald-400 text-xs font-medium">
                              <ImageIcon size={14} />
                              Screenshot compressed successfully to ~{(screenshotUrl.length / 1024 * 0.75).toFixed(1)} KB
                            </div>
                          )}

                          <Button 
                            type="submit" 
                            className="w-full font-bold bg-primary text-white flex items-center justify-center gap-2"
                            disabled={submittingPayment}
                          >
                            {submittingPayment ? 'Submitting...' : 'Submit Acknowledgement'}
                          </Button>

                        </form>
                      </div>

                    </div>

                    <div className="max-w-md mx-auto text-xs text-gray-500 dark:text-gray-400 leading-relaxed space-y-1.5 border-t border-gray-200 dark:border-gray-700 pt-4">
                      <p className="font-semibold text-gray-900 dark:text-white">Instructions:</p>
                      <p>1. Scan the QR code, fill in your details, and finalize the payment.</p>
                      <p>2. Paste the UTR transaction reference number or submit the compressed receipt screenshot above to request approval from the office.</p>
                    </div>
                  </div>
                )}

              </CardContent>
            </Card>

            {/* Payment Acknowledgement History */}
            <div className="space-y-3">
              <div className="flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-primary" />
                <h3 className="text-lg font-bold text-gray-900 dark:text-white">Transaction Acknowledgement History</h3>
              </div>
              
              {paymentHistory.length === 0 ? (
                <Card>
                  <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                    No payment submissions found. Once you submit transaction receipts, they will list here.
                  </CardContent>
                </Card>
              ) : (
                <div className="flex flex-row gap-4 overflow-x-auto pb-4 pt-1 snap-x scrollbar-thin scrollbar-thumb-border scrollbar-track-transparent">
                  {paymentHistory.map((item, idx) => {
                    const statusColors = {
                      pending: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
                      approved: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
                      rejected: 'bg-rose-500/10 text-rose-400 border-rose-500/20'
                    };

                    return (
                      <div 
                        key={item.id} 
                        className="snap-start flex-shrink-0 w-80 bg-white dark:bg-[#1a1a2e]/40 border border-gray-200 dark:border-gray-800 rounded-xl p-5 space-y-4 hover:border-primary/30 transition-all"
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-gray-400 dark:text-gray-500">
                            Submission #{paymentHistory.length - idx}
                          </span>
                          <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold border ${statusColors[item.status as 'pending' | 'approved' | 'rejected']}`}>
                            {(item.status || 'pending').toUpperCase()}
                          </span>
                        </div>

                        <div className="space-y-1.5 text-sm text-gray-500 dark:text-gray-400">
                          <div className="flex justify-between">
                            <span>Sent Date:</span>
                            <span className="font-semibold text-gray-900 dark:text-white">{formatDate(item.submittedAt)}</span>
                          </div>
                          <div className="flex justify-between">
                            <span>Txn UTR:</span>
                            <span className="font-semibold text-gray-900 dark:text-white truncate max-w-[160px]">
                              {item.transactionId || <span className="italic text-xs">Not Entered</span>}
                            </span>
                          </div>
                        </div>

                        {item.screenshotUrl && (
                          <div className="space-y-2">
                            <button
                              onClick={() => setExpandedAckId(expandedAckId === item.id ? null : item.id)}
                              className="w-full flex items-center justify-center gap-1.5 py-2 bg-gray-100 dark:bg-surfaceHighlight/50 hover:bg-gray-200 dark:hover:bg-surfaceHighlight border border-gray-200 dark:border-gray-700 text-xs font-bold text-gray-700 dark:text-gray-300 rounded-lg transition-colors"
                            >
                              <Eye size={12} />
                              {expandedAckId === item.id ? 'Hide Receipt' : 'View Receipt'}
                            </button>
                            
                            {expandedAckId === item.id && (
                              <div className="border border-border bg-white rounded-lg p-1.5 flex justify-center items-center overflow-hidden transition-all duration-200">
                                <img 
                                  src={item.screenshotUrl} 
                                  alt="Payment Receipt" 
                                  className="max-h-40 max-w-full object-contain rounded"
                                />
                              </div>
                            )}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

          </div>
        )}

        {/* Confirmation Dialog for requesting QR */}
        <Dialog
          isOpen={isDialogOpen}
          onClose={() => setIsDialogOpen(false)}
          title="Request Payment QR Code"
          size="sm"
        >
          <div className="space-y-4">
            <p className="text-sm text-textSecondary">
              Are you sure you want to request the fee payment QR code? 
              Once approved, it will be visible for a limited duration set by the administrator.
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <Button 
                variant="ghost" 
                onClick={() => setIsDialogOpen(false)}
                disabled={submitting}
              >
                Cancel
              </Button>
              <Button 
                onClick={handleRequestQr}
                disabled={submitting}
                className="bg-primary text-white font-semibold"
              >
                {submitting ? 'Sending...' : 'Confirm'}
              </Button>
            </div>
          </div>
        </Dialog>
      </div>
    );
  }

  // NATIVE MOBILE LAYOUT (Safe from div crashes)
  return (
    <ScrollView style={styles.container} contentContainerStyle={{ paddingBottom: 50 }}>
      <Text style={styles.headerTitle}>Pay Fees</Text>
      <Text style={styles.headerSub}>View payment terms, scan QR codes, and pay your fees.</Text>

      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#c62828" />
        </View>
      ) : (
        <View style={{ gap: 20 }}>
          
          <View style={styles.card}>
            {!status?.qrCodeEnabled ? (
              // Not enabled view
              <View style={{ alignItems: 'center', gap: 15 }}>
                <View style={[styles.iconCircle, { backgroundColor: '#ffebee' }]}>
                  <Ionicons name="qr-code" size={32} color="#c62828" />
                </View>

                {status?.qrCodeRequested ? (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <View style={styles.pendingBadge}>
                      <Ionicons name="time" size={14} color="#f57c00" />
                      <Text style={styles.pendingBadgeText}>Request Pending Approval</Text>
                    </View>
                    <Text style={styles.titleText}>Your request is sent!</Text>
                    <Text style={styles.bodyText}>
                      The administrator has been notified. They will respond in a short time. Please refresh this page or check back later.
                    </Text>
                    <TouchableOpacity style={styles.refreshBtn} onPress={fetchQrStatus}>
                      <Text style={styles.refreshBtnText}>Refresh Status</Text>
                    </TouchableOpacity>
                  </View>
                ) : (
                  <View style={{ alignItems: 'center', gap: 8 }}>
                    <Text style={styles.titleText}>Scan QR Code for Payments</Text>
                    <Text style={styles.bodyText}>
                      To view the administration's fee payment QR code, please request access. The code will be valid for a limited time.
                    </Text>
                    <TouchableOpacity style={styles.requestBtn} onPress={() => setIsDialogOpen(true)}>
                      <Ionicons name="qr-code" size={18} color="#fff" />
                      <Text style={styles.requestBtnText}>Request QR Code</Text>
                    </TouchableOpacity>
                  </View>
                )}
              </View>
            ) : (
              // Enabled/Active view
              <View style={{ gap: 15 }}>
                <View style={[styles.activeBadge, { alignSelf: 'center' }]}>
                  <Ionicons name="checkmark-circle" size={14} color="#2e7d32" />
                  <Text style={styles.activeBadgeText}>Payment QR Code Active</Text>
                </View>

                {/* Countdown Timer */}
                <View style={styles.timerBox}>
                  <Ionicons name="time-outline" size={16} color="#c62828" />
                  <Text style={styles.timerText}>
                    Expires in: <Text style={styles.timerValue}>{formatTime(timeLeft)}</Text>
                  </Text>
                </View>

                {/* QR Code image */}
                {status?.qrCodeUrl ? (
                  <View style={styles.qrContainer}>
                    <Image 
                      source={{ uri: status.qrCodeUrl }} 
                      style={styles.qrImage}
                    />
                  </View>
                ) : (
                  <View style={styles.placeholderBox}>
                    <Ionicons name="alert-circle-outline" size={32} color="#c62828" />
                    <Text style={styles.placeholderText}>No QR code uploaded by admin.</Text>
                  </View>
                )}

                {/* Submit Transaction Form */}
                <View style={styles.formContainer}>
                  <Text style={styles.formTitle}>
                    <Ionicons name="send" size={14} color="#c62828" /> Submit Transaction Proof
                  </Text>

                  <View style={{ gap: 10 }}>
                    <View>
                      <Text style={styles.inputLabel}>Transaction ID / UTR</Text>
                      <TextInput 
                        placeholder="Enter 12-digit transaction ID"
                        placeholderTextColor="#999"
                        value={transactionId}
                        onChangeText={setTransactionId}
                        style={styles.textInput}
                      />
                    </View>

                    <View>
                      <Text style={styles.inputLabel}>Upload Receipt Screenshot</Text>
                      <TouchableOpacity style={styles.filePicker} onPress={handleMobileScreenshotPick}>
                        <Text style={styles.filePickerText}>
                          {screenshotUrl ? "✓ Screenshot attached" : "Choose payment receipt image"}
                        </Text>
                        <Ionicons name="cloud-upload-outline" size={16} color="#c62828" />
                      </TouchableOpacity>
                    </View>

                    {screenshotUrl !== "" && (
                      <View style={styles.previewBox}>
                        <Image source={{ uri: screenshotUrl }} style={styles.previewImage} />
                        <Text style={{ fontSize: 10, color: '#2e7d32', marginTop: 4 }}>Screenshot Attached Successfully</Text>
                      </View>
                    )}

                    <TouchableOpacity 
                      style={[styles.submitBtn, submittingPayment && { opacity: 0.7 }]} 
                      onPress={() => handleSubmitAcknowledgement()}
                      disabled={submittingPayment}
                    >
                      <Text style={styles.submitBtnText}>
                        {submittingPayment ? 'Submitting...' : 'Submit Acknowledgement'}
                      </Text>
                    </TouchableOpacity>
                  </View>
                </View>
              </View>
            )}
          </View>

          {/* Payment Acknowledgement History */}
          <View style={{ gap: 10 }}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <View style={styles.smallCircle} />
              <Text style={styles.sectionHeader}>Acknowledgement History</Text>
            </View>

            {paymentHistory.length === 0 ? (
              <View style={styles.emptyCard}>
                <Text style={styles.emptyText}>No payment submissions found. Once you submit transaction receipts, they will list here.</Text>
              </View>
            ) : (
              <ScrollView horizontal showsHorizontalScrollIndicator={false} contentContainerStyle={{ gap: 12 }}>
                {paymentHistory.map((item, idx) => {
                  const isApproved = item.status === 'approved';
                  const isRejected = item.status === 'rejected';
                  return (
                    <View key={item.id || idx} style={styles.historyCard}>
                      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }}>
                        <Text style={styles.historyCardTitle}>Submission #{paymentHistory.length - idx}</Text>
                        <View style={[
                          styles.statusBadge, 
                          isApproved && { backgroundColor: '#e8f5e9', borderColor: '#2e7d32' },
                          isRejected && { backgroundColor: '#ffebee', borderColor: '#c62828' }
                        ]}>
                          <Text style={[
                            styles.statusBadgeText,
                            isApproved && { color: '#2e7d32' },
                            isRejected && { color: '#c62828' }
                          ]}>{(item.status || 'pending').toUpperCase()}</Text>
                        </View>
                      </View>

                      <View style={styles.historyCardRow}>
                        <Text style={styles.historyLabel}>Date:</Text>
                        <Text style={styles.historyValue}>{formatDate(item.submittedAt)}</Text>
                      </View>

                      <View style={styles.historyCardRow}>
                        <Text style={styles.historyLabel}>UTR ID:</Text>
                        <Text style={styles.historyValue} numberOfLines={1}>{item.transactionId || 'N/A'}</Text>
                      </View>

                      {item.screenshotUrl && (
                        <View style={{ marginTop: 8 }}>
                          <TouchableOpacity 
                            style={styles.viewReceiptBtn}
                            onPress={() => setExpandedAckId(expandedAckId === item.id ? null : item.id)}
                          >
                            <Text style={styles.viewReceiptBtnText}>
                              {expandedAckId === item.id ? 'Hide Receipt' : 'View Receipt'}
                            </Text>
                          </TouchableOpacity>
                          {expandedAckId === item.id && (
                            <Image source={{ uri: item.screenshotUrl }} style={styles.expandedReceiptImage} />
                          )}
                        </View>
                      )}
                    </View>
                  );
                })}
              </ScrollView>
            )}
          </View>
        </View>
      )}

      {/* Confirmation Dialog Modal for Mobile */}
      <Modal visible={isDialogOpen} transparent animationType="fade" onRequestClose={() => setIsDialogOpen(false)}>
        <View style={styles.modalOverlay}>
          <View style={styles.modalBox}>
            <Text style={styles.modalTitle}>Request Payment QR Code</Text>
            <Text style={styles.modalBody}>
              Are you sure you want to request the fee payment QR code? 
              Once approved, it will be visible for a limited duration set by the administrator.
            </Text>
            <View style={{ flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 15 }}>
              <TouchableOpacity onPress={() => setIsDialogOpen(false)} style={styles.modalCancelBtn}>
                <Text style={styles.modalCancelBtnText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity onPress={handleRequestQr} disabled={submitting} style={styles.modalConfirmBtn}>
                <Text style={styles.modalConfirmBtnText}>{submitting ? 'Sending...' : 'Confirm'}</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
    backgroundColor: '#0B0B14'
  },
  headerTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 4
  },
  headerSub: {
    fontSize: 12,
    color: '#aaa',
    marginBottom: 20
  },
  loadingContainer: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center'
  },
  card: {
    backgroundColor: '#1b1b2a',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    elevation: 3,
    shadowColor: '#000',
    shadowOpacity: 0.1,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }
  },
  iconCircle: {
    width: 60,
    height: 60,
    borderRadius: 30,
    justifyContent: 'center',
    alignItems: 'center'
  },
  pendingBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#fff3e0',
    borderColor: '#ffe0b2',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 15
  },
  pendingBadgeText: {
    color: '#e65100',
    fontSize: 11,
    fontWeight: 'bold'
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    backgroundColor: '#e8f5e9',
    borderColor: '#c8e6c9',
    borderWidth: 1,
    paddingVertical: 4,
    paddingHorizontal: 12,
    borderRadius: 15
  },
  activeBadgeText: {
    color: '#2e7d32',
    fontSize: 11,
    fontWeight: 'bold'
  },
  titleText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    textAlign: 'center'
  },
  bodyText: {
    fontSize: 12,
    color: '#aaa',
    textAlign: 'center',
    lineHeight: 18,
    marginHorizontal: 10
  },
  refreshBtn: {
    backgroundColor: 'transparent',
    borderColor: '#555',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    marginTop: 5
  },
  refreshBtnText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold'
  },
  requestBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#c62828',
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 20,
    marginTop: 5
  },
  requestBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  timerBox: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    backgroundColor: '#2a2a3e',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 8,
    paddingHorizontal: 16,
    maxWidth: 200,
    alignSelf: 'center'
  },
  timerText: {
    fontSize: 12,
    color: '#ccc'
  },
  timerValue: {
    color: '#c62828',
    fontWeight: 'bold'
  },
  qrContainer: {
    alignItems: 'center',
    padding: 10,
    backgroundColor: '#fff',
    borderRadius: 12,
    alignSelf: 'center',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    marginTop: 5
  },
  qrImage: {
    width: 180,
    height: 180,
    resizeMode: 'contain'
  },
  placeholderBox: {
    height: 150,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: '#444',
    borderRadius: 12,
    gap: 6
  },
  placeholderText: {
    color: '#888',
    fontSize: 12
  },
  formContainer: {
    backgroundColor: '#222235',
    borderRadius: 10,
    padding: 15,
    borderWidth: 1,
    borderColor: '#3a3a52',
    marginTop: 10
  },
  formTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 12
  },
  inputLabel: {
    fontSize: 11,
    color: '#aaa',
    marginBottom: 4,
    fontWeight: 'bold'
  },
  textInput: {
    backgroundColor: '#1b1b2a',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 8,
    color: '#fff',
    fontSize: 13
  },
  filePicker: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#1b1b2a',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 10
  },
  filePickerText: {
    color: '#aaa',
    fontSize: 12
  },
  previewBox: {
    alignItems: 'center',
    padding: 8,
    backgroundColor: '#152b1b',
    borderColor: '#2e7d32',
    borderWidth: 1,
    borderRadius: 6
  },
  previewImage: {
    width: 80,
    height: 80,
    resizeMode: 'contain',
    borderRadius: 4
  },
  submitBtn: {
    backgroundColor: '#c62828',
    borderRadius: 6,
    paddingVertical: 12,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 5
  },
  submitBtnText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: 'bold'
  },
  smallCircle: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#c62828'
  },
  sectionHeader: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff'
  },
  emptyCard: {
    backgroundColor: '#1b1b2a',
    borderRadius: 10,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333',
    alignItems: 'center'
  },
  emptyText: {
    color: '#888',
    fontSize: 12,
    textAlign: 'center',
    lineHeight: 18
  },
  historyCard: {
    backgroundColor: '#1b1b2a',
    borderColor: '#333',
    borderWidth: 1,
    borderRadius: 10,
    padding: 15,
    width: 260,
    gap: 6
  },
  historyCardTitle: {
    fontSize: 11,
    color: '#888',
    fontWeight: 'bold'
  },
  statusBadge: {
    backgroundColor: '#fff3e0',
    borderColor: '#ffe0b2',
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 8,
    paddingVertical: 2
  },
  statusBadgeText: {
    color: '#e65100',
    fontSize: 9,
    fontWeight: 'bold'
  },
  historyCardRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    fontSize: 12
  },
  historyLabel: {
    color: '#aaa',
    fontSize: 12
  },
  historyValue: {
    color: '#fff',
    fontWeight: 'bold',
    fontSize: 12
  },
  viewReceiptBtn: {
    backgroundColor: '#2a2a3e',
    borderColor: '#444',
    borderWidth: 1,
    borderRadius: 6,
    paddingVertical: 6,
    alignItems: 'center'
  },
  viewReceiptBtnText: {
    color: '#ccc',
    fontSize: 11,
    fontWeight: 'bold'
  },
  expandedReceiptImage: {
    width: '100%',
    height: 120,
    resizeMode: 'contain',
    borderRadius: 6,
    marginTop: 8,
    backgroundColor: '#fff'
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.6)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20
  },
  modalBox: {
    width: '100%',
    backgroundColor: '#1e1e1e',
    borderRadius: 12,
    padding: 20,
    borderWidth: 1,
    borderColor: '#333'
  },
  modalTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
    marginBottom: 8
  },
  modalBody: {
    fontSize: 12,
    color: '#aaa',
    lineHeight: 18
  },
  modalCancelBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#2a2a2a'
  },
  modalCancelBtnText: {
    color: '#ccc',
    fontSize: 12,
    fontWeight: 'bold'
  },
  modalConfirmBtn: {
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 6,
    backgroundColor: '#c62828'
  },
  modalConfirmBtnText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: 'bold'
  }
});
