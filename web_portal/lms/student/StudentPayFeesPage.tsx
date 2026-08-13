import React, { useState, useEffect, useRef } from 'react';
import { StudentApi } from '../core/services';
import { PageHeader } from '../components/ui/PageHeader';
import { Card, CardContent } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { Dialog } from '../components/ui/Dialog';
import { useToast } from '../components/ui/Toast/ToastContext';
import { QrCode, Clock, CheckCircle2, AlertCircle, Send, Upload, Eye, Image as ImageIcon } from 'lucide-react';

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
          success("The payment QR code session has expired.");
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
      success("Request sent, admin will respond in a short time");
      setIsDialogOpen(false);
      fetchQrStatus();
    } catch (err: any) {
      error(err?.response?.data?.message || 'Failed to send request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleScreenshotChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
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

  const handleSubmitAcknowledgement = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!transactionId && !screenshotUrl) {
      return error("Please enter a Transaction ID or upload a payment screenshot.");
    }

    setSubmittingPayment(true);
    try {
      await StudentApi.submitPaymentAcknowledgement({
        transactionId,
        screenshotUrl
      });
      success("Transaction acknowledgement submitted successfully!");
      setTransactionId('');
      setScreenshotUrl('');
      
      // Reset file input
      const fileInput = document.getElementById('screenshot-upload') as HTMLInputElement;
      if (fileInput) fileInput.value = '';

      fetchPaymentHistory();
    } catch (err: any) {
      error(err?.response?.data?.message || 'Failed to submit acknowledgement.');
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
              // Horizontal listing: "if another transaction done, its status should list next to the first one and it goes on..."
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
};
