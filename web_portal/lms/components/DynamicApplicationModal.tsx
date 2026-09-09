import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import { FormConfig, CustomField } from '../admin/CustomizeApplicationPage';
import api from '../core/api';

interface DynamicApplicationModalProps {
  visible: boolean;
  onClose: () => void;
  prefillName?: string;
  prefillPhone?: string;
  prefillEmail?: string;
  onSuccess?: () => void;
}

export default function DynamicApplicationModal({
  visible,
  onClose,
  prefillName = '',
  prefillPhone = '',
  prefillEmail = '',
  onSuccess
}: DynamicApplicationModalProps) {
  const [formConfig, setFormConfig] = useState<FormConfig | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Dynamic Form Values (keyed by field id or label)
  const [formValues, setFormValues] = useState<Record<string, any>>({});

  useEffect(() => {
    if (visible) {
      loadActiveForm();
      setSubmitted(false);
      setErrorMessage(null);
    }
  }, [visible]);

  const loadActiveForm = async () => {
    setLoading(true);
    try {
      const res = await api.get('/crm/custom-form/active');
      const data = res.data;
      if (data?.success && data?.data) {
        setFormConfig(data.data);

        // Prepopulate values based on loaded fields
        const initialVals: Record<string, any> = {};
        const fields: CustomField[] = data.data.customFields || [];

        fields.forEach(f => {
          const l = f.label.toLowerCase();
          if (l.includes('name') && prefillName) {
            initialVals[f.id] = prefillName;
          } else if ((l.includes('phone') || l.includes('mobile')) && prefillPhone) {
            initialVals[f.id] = prefillPhone;
          } else if (l.includes('email') && prefillEmail) {
            initialVals[f.id] = prefillEmail;
          } else if (f.type === 'dropdown' && f.options && f.options.length > 0) {
            initialVals[f.id] = f.options[0];
          } else {
            initialVals[f.id] = '';
          }
        });

        setFormValues(initialVals);
      }
    } catch (err) {
      console.error('Failed to load active application form:', err);
    } finally {
      setLoading(false);
    }
  };

  const setFieldValue = (fieldId: string, val: any) => {
    setFormValues(prev => ({ ...prev, [fieldId]: val }));
  };

  const handleSubmit = async () => {
    setErrorMessage(null);

    const fields = formConfig?.customFields || [];

    // 1. Validate required fields
    for (const field of fields) {
      const val = formValues[field.id];
      if (field.required) {
        if (!val || String(val).trim() === '') {
          setErrorMessage(`Please enter '${field.label}'`);
          return;
        }
      }
    }

    // 2. Identify core fields for lead indexing (name, phone, email, city, mode)
    let leadName = '';
    let leadPhone = '';
    let leadEmail = '';
    let leadCity = '';
    let leadMode = '';

    const customPayload: Record<string, any> = {};

    fields.forEach(f => {
      const val = formValues[f.id] || '';
      const lbl = f.label.toLowerCase();

      customPayload[f.label] = val;

      if (!leadName && lbl.includes('name')) leadName = String(val).trim();
      else if (!leadPhone && (lbl.includes('phone') || lbl.includes('mobile'))) leadPhone = String(val).replace(/\D/g, '');
      else if (!leadEmail && lbl.includes('email')) leadEmail = String(val).trim();
      else if (!leadCity && (lbl.includes('city') || lbl.includes('location'))) leadCity = String(val).trim();
      else if (!leadMode && (lbl.includes('mode') || lbl.includes('batch'))) leadMode = String(val).trim();
    });

    if (!leadName) leadName = prefillName || 'Aspirant';
    if (!leadPhone) leadPhone = prefillPhone || '';

    setSubmitting(true);
    try {
      const res = await api.post('/crm/custom-leads', {
        name: leadName,
        phone: leadPhone,
        email: leadEmail || prefillEmail,
        city: leadCity,
        mode: leadMode || 'Offline',
        customData: customPayload,
        formId: formConfig?.id || 'mock_test_app',
        formTitle: formConfig?.title || 'Mock Test Application Form'
      });

      const data = res.data;
      if (data?.success) {
        setSubmitted(true);
        if (onSuccess) onSuccess();
      } else {
        setErrorMessage(data?.message || 'Failed to submit application');
      }
    } catch (err: any) {
      console.error('Submission error:', err);
      const msg = err.response?.data?.message || err.message || 'Network error occurred. Please try again.';
      setErrorMessage(msg);
    } finally {
      setSubmitting(false);
    }
  };

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={onClose}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.dialogContainer}>
          {/* Header */}
          <View style={styles.dialogHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10 }}>
              <Text style={{ fontSize: 24 }}>📋</Text>
              <View>
                <Text style={styles.formTitle}>
                  {formConfig?.title || 'Mock Test Application Form'}
                </Text>
                <Text style={styles.formSubtitle}>
                  {formConfig?.subtitle || 'Complete your registration details below.'}
                </Text>
              </View>
            </View>
            <TouchableOpacity style={styles.closeBtn} onPress={onClose}>
              <MaterialCommunityIcons name="close" size={22} color="#64748b" />
            </TouchableOpacity>
          </View>

          {loading ? (
            <View style={styles.loadingBox}>
              <ActivityIndicator size="large" color="#b91c1c" />
              <Text style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>Loading application form...</Text>
            </View>
          ) : formConfig?.isActive === false ? (
            /* INACTIVE FORM NOTICE */
            <View style={styles.successBox}>
              <View style={[styles.successIconCircle, { backgroundColor: '#fef2f2' }]}>
                <MaterialCommunityIcons name="clock-alert-outline" size={36} color="#b91c1c" />
              </View>
              <Text style={[styles.successTitle, { color: '#991b1b' }]}>Applications Closed</Text>
              <Text style={styles.successSubtitle}>
                Registration for <Text style={{ fontWeight: '700' }}>{formConfig?.title || 'this application'}</Text> is currently inactive or closed. Please contact academy support or check back later.
              </Text>
              <TouchableOpacity style={[styles.successDoneBtn, { backgroundColor: '#475569' }]} onPress={onClose}>
                <Text style={styles.successDoneBtnText}>Close</Text>
              </TouchableOpacity>
            </View>
          ) : (
            /* DYNAMIC APPLICATION FORM INPUTS */
            <ScrollView
              style={styles.formBody}
              contentContainerStyle={{ padding: 20, gap: 14 }}
              showsVerticalScrollIndicator={false}
            >
              {errorMessage && (
                <View style={styles.errorBanner}>
                  <MaterialCommunityIcons name="alert-circle" size={18} color="#b91c1c" />
                  <Text style={styles.errorBannerText}>{errorMessage}</Text>
                </View>
              )}

              {/* Render Every Dynamic Field */}
              {(formConfig?.customFields || []).map((field: CustomField) => {
                const currentVal = formValues[field.id] || '';

                return (
                  <View key={field.id} style={styles.inputGroup}>
                    <Text style={styles.inputLabel}>
                      {field.label.toUpperCase()} {field.required && '*'}
                    </Text>

                    {field.type === 'dropdown' ? (
                      <View style={styles.dropdownContainer}>
                        {(field.options || []).map(opt => {
                          const isSelected = currentVal === opt;
                          return (
                            <TouchableOpacity
                              key={opt}
                              style={[
                                styles.dropdownPill,
                                isSelected && styles.dropdownPillActive
                              ]}
                              onPress={() => setFieldValue(field.id, opt)}
                            >
                              <Text
                                style={[
                                  styles.dropdownPillText,
                                  isSelected && styles.dropdownPillTextActive
                                ]}
                              >
                                {opt}
                              </Text>
                            </TouchableOpacity>
                          );
                        })}
                      </View>
                    ) : field.type === 'textarea' ? (
                      <TextInput
                        style={[styles.input, { height: 75, textAlignVertical: 'top' }]}
                        multiline
                        placeholder={field.placeholder || `Enter ${field.label}`}
                        placeholderTextColor="#94a3b8"
                        value={String(currentVal)}
                        onChangeText={t => setFieldValue(field.id, t)}
                      />
                    ) : (
                      <TextInput
                        style={styles.input}
                        placeholder={field.placeholder || `Enter ${field.label}`}
                        placeholderTextColor="#94a3b8"
                        keyboardType={field.type === 'number' ? 'phone-pad' : 'default'}
                        value={String(currentVal)}
                        onChangeText={t => setFieldValue(field.id, t)}
                      />
                    )}
                  </View>
                );
              })}

              {/* Action Buttons */}
              <View style={styles.actionsRow}>
                <TouchableOpacity style={styles.cancelBtn} onPress={onClose} disabled={submitting}>
                  <Text style={styles.cancelBtnText}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.submitBtn, submitting && { opacity: 0.7 }]}
                  onPress={handleSubmit}
                  disabled={submitting}
                >
                  {submitting ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.submitBtnText}>Submit Application</Text>
                  )}
                </TouchableOpacity>
              </View>
            </ScrollView>
          )}
        </View>
      </View>
    </Modal>
  );
}

const styles = StyleSheet.create({
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  dialogContainer: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 16,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 16,
    shadowOffset: { width: 0, height: 6 },
    elevation: 24,
    display: 'flex',
    flexDirection: 'column'
  },
  dialogHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  formTitle: {
    fontSize: 17,
    fontWeight: '800',
    color: '#b91c1c'
  },
  formSubtitle: {
    fontSize: 12,
    color: '#64748b',
    marginTop: 2
  },
  closeBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#f8fafc'
  },
  loadingBox: {
    padding: 60,
    alignItems: 'center',
    justifyContent: 'center'
  },
  formBody: {
    flexShrink: 1
  },
  errorBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#fee2e2',
    borderWidth: 1,
    borderColor: '#fca5a5',
    padding: 10,
    borderRadius: 8,
    marginBottom: 4
  },
  errorBannerText: {
    color: '#b91c1c',
    fontSize: 12,
    fontWeight: '600',
    flex: 1
  },
  inputGroup: {
    marginBottom: 4
  },
  inputLabel: {
    fontSize: 11,
    fontWeight: '700',
    color: '#334155',
    marginBottom: 6,
    letterSpacing: 0.5
  },
  input: {
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
    color: '#0f172a',
    backgroundColor: '#fff'
  },
  dropdownContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8
  },
  dropdownPill: {
    flex: 1,
    minWidth: 100,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc'
  },
  dropdownPillActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#b91c1c'
  },
  dropdownPillText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#64748b'
  },
  dropdownPillTextActive: {
    fontSize: 12,
    fontWeight: '700',
    color: '#b91c1c'
  },
  actionsRow: {
    flexDirection: 'row',
    gap: 12,
    marginTop: 10,
    paddingTop: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  cancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff'
  },
  cancelBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#475569'
  },
  submitBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    borderRadius: 8,
    backgroundColor: '#b91c1c',
    shadowColor: '#b91c1c',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  submitBtnText: {
    fontSize: 13,
    fontWeight: '700',
    color: '#fff'
  },

  /* SUCCESS BOX */
  successBox: {
    padding: 36,
    alignItems: 'center',
    justifyContent: 'center'
  },
  successIconCircle: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: '#dcfce7',
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: 16
  },
  successTitle: {
    fontSize: 18,
    fontWeight: '800',
    color: '#15803d',
    textAlign: 'center',
    marginBottom: 8
  },
  successSubtitle: {
    fontSize: 13,
    color: '#475569',
    textAlign: 'center',
    lineHeight: 20,
    marginBottom: 24,
    maxWidth: 380
  },
  successDoneBtn: {
    backgroundColor: '#15803d',
    paddingHorizontal: 36,
    paddingVertical: 10,
    borderRadius: 8
  },
  successDoneBtnText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700'
  }
});
