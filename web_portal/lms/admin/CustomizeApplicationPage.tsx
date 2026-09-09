import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  StyleSheet,
  Switch,
  Modal
} from 'react-native';
import { MaterialCommunityIcons } from '@expo/vector-icons';
import api from '../core/api';

export interface CustomField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'dropdown' | 'date' | 'textarea';
  placeholder?: string;
  required: boolean;
  options?: string[]; // array of strings for dropdown
  order: number;
}

export interface FormConfig {
  id: string;
  title: string;
  subtitle: string;
  bannerText?: string;
  isActive: boolean;
  customFields: CustomField[];
}

const DEFAULT_INITIAL_FIELDS: CustomField[] = [
  { id: 'f_name', label: 'Full Name', type: 'text', placeholder: 'Enter your full name', required: true, order: 1 },
  { id: 'f_phone', label: 'Phone Number', type: 'number', placeholder: 'Enter 10-digit mobile number', required: true, order: 2 },
  { id: 'f_email', label: 'Email Address', type: 'text', placeholder: 'your.email@example.com', required: false, order: 3 },
  { id: 'f_city', label: 'City / Location', type: 'text', placeholder: 'Enter your city', required: false, order: 4 },
  { id: 'f_mode', label: 'Preferred Mode', type: 'dropdown', placeholder: 'Select mode', required: true, options: ['Offline', 'Online'], order: 5 }
];

const DEFAULT_CONFIG: FormConfig = {
  id: 'mock_test_app',
  title: 'Mock Test Application Form',
  subtitle: 'Fill in your details below to register for the upcoming Mock Test.',
  bannerText: 'Special Mock Test Registration for Aspirants',
  isActive: true,
  customFields: DEFAULT_INITIAL_FIELDS
};

export default function CustomizeApplicationPage() {
  const [config, setConfig] = useState<FormConfig>(DEFAULT_CONFIG);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccessMessage, setSaveSuccessMessage] = useState<string | null>(null);

  // Field modal state (for both Add and Edit)
  const [showFieldModal, setShowFieldModal] = useState(false);
  const [editingFieldId, setEditingFieldId] = useState<string | null>(null);
  const [fieldLabel, setFieldLabel] = useState('');
  const [fieldType, setFieldType] = useState<'text' | 'number' | 'dropdown' | 'date' | 'textarea'>('text');
  const [fieldPlaceholder, setFieldPlaceholder] = useState('');
  const [fieldRequired, setFieldRequired] = useState(false);
  const [fieldOptionsRaw, setFieldOptionsRaw] = useState('');

  // Interactive preview state
  const [previewValues, setPreviewValues] = useState<Record<string, any>>({
    f_mode: 'Offline'
  });

  useEffect(() => {
    fetchConfig();
  }, []);

  const fetchConfig = async () => {
    setLoading(true);
    try {
      const res = await api.get('/crm/custom-form/mock_test_app');
      const data = res.data;
      if (data?.success && data?.data) {
        const loadedFields = (data.data.customFields && data.data.customFields.length > 0)
          ? data.data.customFields
          : DEFAULT_INITIAL_FIELDS;

        setConfig({
          ...DEFAULT_CONFIG,
          ...data.data,
          customFields: loadedFields
        });
      }
    } catch (err) {
      console.error('Failed to load form config:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccessMessage(null);
    try {
      const res = await api.post('/crm/custom-form', config);
      const data = res.data;
      if (data?.success) {
        setSaveSuccessMessage('Form Configuration Saved Successfully!');
        setTimeout(() => setSaveSuccessMessage(null), 4000);
      } else {
        alert(data?.message || 'Failed to save configuration');
      }
    } catch (err: any) {
      console.error('Save error:', err);
      const msg = err.response?.data?.message || err.message || 'Error saving configuration';
      alert('Error saving configuration: ' + msg);
    } finally {
      setSaving(false);
    }
  };

  const openAddFieldModal = () => {
    setEditingFieldId(null);
    setFieldLabel('');
    setFieldType('text');
    setFieldPlaceholder('');
    setFieldRequired(false);
    setFieldOptionsRaw('');
    setShowFieldModal(true);
  };

  const openEditFieldModal = (field: CustomField) => {
    setEditingFieldId(field.id);
    setFieldLabel(field.label);
    setFieldType(field.type);
    setFieldPlaceholder(field.placeholder || '');
    setFieldRequired(field.required);
    setFieldOptionsRaw(field.options ? field.options.join(', ') : '');
    setShowFieldModal(true);
  };

  const saveFieldFromModal = () => {
    if (!fieldLabel.trim()) {
      alert('Field Label is required');
      return;
    }

    const options = fieldType === 'dropdown'
      ? fieldOptionsRaw.split(',').map(o => o.trim()).filter(Boolean)
      : undefined;

    if (editingFieldId) {
      // Update existing field
      setConfig(prev => ({
        ...prev,
        customFields: prev.customFields.map(f =>
          f.id === editingFieldId
            ? {
                ...f,
                label: fieldLabel.trim(),
                type: fieldType,
                placeholder: fieldPlaceholder.trim() || undefined,
                required: fieldRequired,
                options: options && options.length > 0 ? options : ['Option 1', 'Option 2']
              }
            : f
        )
      }));
    } else {
      // Add new field
      const newField: CustomField = {
        id: 'field_' + Date.now(),
        label: fieldLabel.trim(),
        type: fieldType,
        placeholder: fieldPlaceholder.trim() || undefined,
        required: fieldRequired,
        options: options && options.length > 0 ? options : ['Option 1', 'Option 2'],
        order: config.customFields.length + 1
      };

      setConfig(prev => ({
        ...prev,
        customFields: [...prev.customFields, newField]
      }));
    }

    setShowFieldModal(false);
  };

  const removeCustomField = (id: string) => {
    if (config.customFields.length <= 1) {
      alert('You must have at least one field in the application form.');
      return;
    }
    setConfig(prev => ({
      ...prev,
      customFields: prev.customFields.filter(f => f.id !== id)
    }));
  };

  const moveField = (index: number, direction: 'up' | 'down') => {
    const list = [...config.customFields];
    if (direction === 'up' && index > 0) {
      const temp = list[index];
      list[index] = list[index - 1];
      list[index - 1] = temp;
    } else if (direction === 'down' && index < list.length - 1) {
      const temp = list[index];
      list[index] = list[index + 1];
      list[index + 1] = temp;
    }
    setConfig(prev => ({ ...prev, customFields: list }));
  };

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#b91c1c" />
        <Text style={{ marginTop: 12, color: '#64748b', fontWeight: '500' }}>Loading Application Form Designer...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Top Action Header */}
      <View style={styles.header}>
        <View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <MaterialCommunityIcons name="form-select" size={26} color="#b91c1c" />
            <Text style={styles.headerTitle}>Customize Application Form</Text>
          </View>
          <Text style={styles.headerSubtitle}>
            Fully customize the fields, questions, and options shown to applicants.
          </Text>
        </View>

        <View style={{ flexDirection: 'row', alignItems: 'center', gap: 12 }}>
          {saveSuccessMessage && (
            <View style={styles.successBadge}>
              <MaterialCommunityIcons name="check-circle" size={16} color="#15803d" />
              <Text style={styles.successBadgeText}>{saveSuccessMessage}</Text>
            </View>
          )}

          <TouchableOpacity
            style={[styles.saveButton, saving && { opacity: 0.7 }]}
            onPress={handleSave}
            disabled={saving}
          >
            {saving ? (
              <ActivityIndicator size="small" color="#fff" />
            ) : (
              <>
                <MaterialCommunityIcons name="content-save" size={18} color="#fff" />
                <Text style={styles.saveButtonText}>Save Form</Text>
              </>
            )}
          </TouchableOpacity>
        </View>
      </View>

      {/* Main Two-Column Layout (Editor Left, Live Preview Right) */}
      <View style={styles.workspace}>
        {/* LEFT COLUMN: BUILDER / EDITOR */}
        <ScrollView style={styles.editorPane} showsVerticalScrollIndicator={false}>
          {/* Form General Settings */}
          <View style={styles.card}>
            <View style={styles.cardHeader}>
              <MaterialCommunityIcons name="tune-vertical" size={20} color="#b91c1c" />
              <Text style={styles.cardTitle}>General Form Settings</Text>
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Form Title *</Text>
              <TextInput
                style={styles.input}
                value={config.title}
                onChangeText={t => setConfig(prev => ({ ...prev, title: t }))}
                placeholder="e.g. Mock Test Application Form"
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Form Subtitle / Instructions</Text>
              <TextInput
                style={styles.input}
                value={config.subtitle}
                onChangeText={t => setConfig(prev => ({ ...prev, subtitle: t }))}
                placeholder="e.g. Fill in your details below to register for the upcoming Mock Test."
              />
            </View>

            <View style={styles.inputGroup}>
              <Text style={styles.label}>Top Banner Tagline</Text>
              <TextInput
                style={styles.input}
                value={config.bannerText || ''}
                onChangeText={t => setConfig(prev => ({ ...prev, bannerText: t }))}
                placeholder="e.g. Special Mock Test Registration for Aspirants"
              />
            </View>

            <View style={styles.switchRow}>
              <View>
                <Text style={styles.switchLabel}>Form Active Status</Text>
                <Text style={styles.switchHelp}>When active, guests can view and submit this form.</Text>
              </View>
              <Switch
                value={config.isActive}
                onValueChange={v => setConfig(prev => ({ ...prev, isActive: v }))}
                trackColor={{ false: '#cbd5e1', true: '#fca5a5' }}
                thumbColor={config.isActive ? '#b91c1c' : '#f8fafc'}
              />
            </View>
          </View>

          {/* Dynamic Form Fields Section (All Fields Completely Customizable) */}
          <View style={styles.card}>
            <View style={[styles.cardHeader, { justifyContent: 'space-between' }]}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons name="format-list-bulleted-type" size={20} color="#b91c1c" />
                <Text style={styles.cardTitle}>Form Fields ({config.customFields.length})</Text>
              </View>
              <TouchableOpacity
                style={styles.addFieldButton}
                onPress={openAddFieldModal}
              >
                <MaterialCommunityIcons name="plus" size={16} color="#fff" />
                <Text style={styles.addFieldButtonText}>Add Field</Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.cardDesc}>
              All fields are fully customizable. You can edit labels, reorder, change input types, add dropdown options, or remove fields.
            </Text>

            <View style={{ gap: 10, marginTop: 12 }}>
              {config.customFields.map((field, idx) => (
                <View key={field.id} style={styles.customFieldRow}>
                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 10, flex: 1 }}>
                    <View style={styles.orderControls}>
                      <TouchableOpacity
                        disabled={idx === 0}
                        onPress={() => moveField(idx, 'up')}
                        style={{ opacity: idx === 0 ? 0.3 : 1, padding: 2 }}
                      >
                        <MaterialCommunityIcons name="chevron-up" size={18} color="#475569" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        disabled={idx === config.customFields.length - 1}
                        onPress={() => moveField(idx, 'down')}
                        style={{ opacity: idx === config.customFields.length - 1 ? 0.3 : 1, padding: 2 }}
                      >
                        <MaterialCommunityIcons name="chevron-down" size={18} color="#475569" />
                      </TouchableOpacity>
                    </View>

                    <View style={{ flex: 1 }}>
                      <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
                        <Text style={styles.fieldNameText}>{field.label}</Text>
                        {field.required && (
                          <Text style={{ color: '#dc2626', fontSize: 13, fontWeight: '700' }}>*</Text>
                        )}
                      </View>
                      <Text style={styles.fieldTypeText}>
                        Type: <Text style={{ fontWeight: '600' }}>{field.type.toUpperCase()}</Text>
                        {field.options && field.options.length > 0 && ` • Options: (${field.options.join(', ')})`}
                      </Text>
                    </View>
                  </View>

                  <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                    <View style={field.required ? styles.badgeRequired : styles.badgeOptional}>
                      <Text style={field.required ? styles.badgeRequiredText : styles.badgeOptionalText}>
                        {field.required ? 'Required' : 'Optional'}
                      </Text>
                    </View>

                    <TouchableOpacity
                      style={styles.editFieldBtn}
                      onPress={() => openEditFieldModal(field)}
                      title="Edit Field"
                    >
                      <MaterialCommunityIcons name="pencil-outline" size={18} color="#2563eb" />
                    </TouchableOpacity>

                    <TouchableOpacity
                      style={styles.deleteFieldBtn}
                      onPress={() => removeCustomField(field.id)}
                      title="Delete Field"
                    >
                      <MaterialCommunityIcons name="trash-can-outline" size={18} color="#dc2626" />
                    </TouchableOpacity>
                  </View>
                </View>
              ))}
            </View>
          </View>
        </ScrollView>

        {/* RIGHT COLUMN: LIVE INTERACTIVE PREVIEW */}
        <View style={styles.previewPane}>
          <View style={styles.previewHeader}>
            <View style={{ flexDirection: 'row', alignItems: 'center', gap: 6 }}>
              <MaterialCommunityIcons name="eye-outline" size={18} color="#0f172a" />
              <Text style={styles.previewTitle}>Live Guest Preview</Text>
            </View>
            <View style={styles.liveIndicator}>
              <View style={styles.liveDot} />
              <Text style={styles.liveText}>Interactive</Text>
            </View>
          </View>

          <ScrollView style={styles.previewCard} showsVerticalScrollIndicator={false}>
            {/* Modal Mock Header */}
            <View style={styles.modalMockHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>📋</Text>
                <View>
                  <Text style={styles.mockModalTitle}>{config.title || 'Application Form'}</Text>
                  <Text style={styles.mockModalSubtitle}>{config.subtitle || 'Complete your registration details below.'}</Text>
                </View>
              </View>
              <MaterialCommunityIcons name="close" size={20} color="#94a3b8" />
            </View>

            {/* Render Every Field Dynamically */}
            <View style={styles.mockSection}>
              {config.customFields.map((cf) => {
                const isSelected = (val: string) => previewValues[cf.id] === val;

                return (
                  <View key={cf.id} style={{ marginBottom: 14 }}>
                    <Text style={styles.mockLabel}>
                      {cf.label.toUpperCase()} {cf.required && '*'}
                    </Text>

                    {cf.type === 'dropdown' ? (
                      cf.options && cf.options.length <= 4 ? (
                        <View style={styles.mockModesRow}>
                          {cf.options.map(opt => {
                            const active = isSelected(opt);
                            return (
                              <TouchableOpacity
                                key={opt}
                                style={[styles.mockModeBtn, active && styles.mockModeBtnActive]}
                                onPress={() => setPreviewValues(prev => ({ ...prev, [cf.id]: opt }))}
                              >
                                <Text style={active ? styles.mockModeBtnActiveText : styles.mockModeBtnText}>
                                  {opt}
                                </Text>
                              </TouchableOpacity>
                            );
                          })}
                        </View>
                      ) : (
                        <View style={[styles.mockInput, { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' }]}>
                          <Text style={styles.mockPlaceholder}>Select {cf.label}...</Text>
                          <MaterialCommunityIcons name="chevron-down" size={16} color="#94a3b8" />
                        </View>
                      )
                    ) : cf.type === 'textarea' ? (
                      <View style={[styles.mockInput, { height: 60, justifyContent: 'flex-start', paddingTop: 8 }]}>
                        <Text style={styles.mockPlaceholder}>{cf.placeholder || `Enter ${cf.label}...`}</Text>
                      </View>
                    ) : (
                      <View style={styles.mockInput}>
                        <Text style={styles.mockPlaceholder}>
                          {cf.placeholder || (cf.type === 'number' ? 'Enter numbers' : `Enter ${cf.label.toLowerCase()}`)}
                        </Text>
                      </View>
                    )}
                  </View>
                );
              })}
            </View>

            {/* Submit Button Mock */}
            <View style={styles.mockActionsRow}>
              <View style={styles.mockCancelBtn}>
                <Text style={styles.mockCancelBtnText}>Cancel</Text>
              </View>
              <View style={styles.mockSubmitBtn}>
                <Text style={styles.mockSubmitBtnText}>Submit Application</Text>
              </View>
            </View>
          </ScrollView>
        </View>
      </View>

      {/* FULLY CENTERED ADD/EDIT FIELD MODAL DIALOG */}
      <Modal
        visible={showFieldModal}
        transparent={true}
        animationType="fade"
        onRequestClose={() => setShowFieldModal(false)}
      >
        <View style={styles.modalBackdrop}>
          <View style={styles.dialogCard}>
            {/* Dialog Header */}
            <View style={styles.dialogHeader}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <MaterialCommunityIcons
                  name={editingFieldId ? "pencil-box-outline" : "plus-box-outline"}
                  size={22}
                  color="#b91c1c"
                />
                <Text style={styles.dialogTitle}>
                  {editingFieldId ? 'Edit Field' : 'Add New Field'}
                </Text>
              </View>
              <TouchableOpacity
                onPress={() => setShowFieldModal(false)}
                style={{ padding: 4 }}
              >
                <MaterialCommunityIcons name="close" size={22} color="#64748b" />
              </TouchableOpacity>
            </View>

            {/* Dialog Scrollable Content */}
            <ScrollView
              style={styles.dialogBody}
              contentContainerStyle={{ padding: 20, gap: 16 }}
              showsVerticalScrollIndicator={false}
            >
              <View style={styles.inputGroup}>
                <Text style={styles.label}>Field Label / Question *</Text>
                <TextInput
                  style={styles.input}
                  value={fieldLabel}
                  onChangeText={setFieldLabel}
                  placeholder="e.g. Degree / College, Target Year, City"
                />
              </View>

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Field Type</Text>
                <View style={styles.typeSelectorRow}>
                  {[
                    { type: 'text', label: 'Text' },
                    { type: 'number', label: 'Number' },
                    { type: 'dropdown', label: 'Dropdown / Choice' },
                    { type: 'date', label: 'Date' },
                    { type: 'textarea', label: 'Text Area' }
                  ].map(t => (
                    <TouchableOpacity
                      key={t.type}
                      style={[
                        styles.typeOption,
                        fieldType === t.type && styles.typeOptionActive
                      ]}
                      onPress={() => setFieldType(t.type as any)}
                    >
                      <Text
                        style={[
                          styles.typeOptionText,
                          fieldType === t.type && styles.typeOptionTextActive
                        ]}
                      >
                        {t.label}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>

              {fieldType === 'dropdown' && (
                <View style={styles.inputGroup}>
                  <Text style={styles.label}>Options (comma separated) *</Text>
                  <TextInput
                    style={styles.input}
                    value={fieldOptionsRaw}
                    onChangeText={setFieldOptionsRaw}
                    placeholder="e.g. Offline, Online or 2026, 2027, 2028"
                  />
                  <Text style={{ fontSize: 11, color: '#64748b', marginTop: 4 }}>
                    Enter the selectable options separated by commas (e.g. Offline, Online).
                  </Text>
                </View>
              )}

              <View style={styles.inputGroup}>
                <Text style={styles.label}>Placeholder Hint (Optional)</Text>
                <TextInput
                  style={styles.input}
                  value={fieldPlaceholder}
                  onChangeText={setFieldPlaceholder}
                  placeholder="e.g. Enter your college name"
                />
              </View>

              <View style={styles.switchRow}>
                <View style={{ flex: 1 }}>
                  <Text style={styles.switchLabel}>Is this field mandatory?</Text>
                  <Text style={styles.switchHelp}>Applicants cannot submit without filling this field.</Text>
                </View>
                <Switch
                  value={fieldRequired}
                  onValueChange={setFieldRequired}
                  trackColor={{ false: '#cbd5e1', true: '#fca5a5' }}
                  thumbColor={fieldRequired ? '#b91c1c' : '#f8fafc'}
                />
              </View>
            </ScrollView>

            {/* Dialog Footer Actions */}
            <View style={styles.dialogFooter}>
              <TouchableOpacity
                style={styles.dialogCancelBtn}
                onPress={() => setShowFieldModal(false)}
              >
                <Text style={styles.dialogCancelText}>Cancel</Text>
              </TouchableOpacity>
              <TouchableOpacity
                style={styles.dialogConfirmBtn}
                onPress={saveFieldFromModal}
              >
                <Text style={styles.dialogConfirmText}>
                  {editingFieldId ? 'Save Changes' : 'Add to Form'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f8fafc',
    padding: 24
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f8fafc'
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
    backgroundColor: '#fff',
    padding: 20,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    shadowColor: '#000',
    shadowOpacity: 0.03,
    shadowRadius: 6,
    shadowOffset: { width: 0, height: 2 }
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: '700',
    color: '#0f172a'
  },
  headerSubtitle: {
    fontSize: 13,
    color: '#64748b',
    marginTop: 4
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#b91c1c',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 8,
    shadowColor: '#b91c1c',
    shadowOpacity: 0.2,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 }
  },
  saveButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600'
  },
  successBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#dcfce7',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  successBadgeText: {
    color: '#15803d',
    fontSize: 13,
    fontWeight: '600'
  },
  workspace: {
    flex: 1,
    flexDirection: 'row',
    gap: 24
  },
  editorPane: {
    flex: 1.2
  },
  previewPane: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    display: 'flex',
    flexDirection: 'column',
    maxHeight: 780
  },
  previewHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  previewTitle: {
    fontSize: 15,
    fontWeight: '700',
    color: '#0f172a'
  },
  liveIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#f0fdf4',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#bbf7d0'
  },
  liveDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#22c55e'
  },
  liveText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#16a34a'
  },
  previewCard: {
    flex: 1,
    marginTop: 14
  },
  modalMockHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingBottom: 12,
    marginBottom: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  mockModalTitle: {
    fontSize: 15,
    fontWeight: '800',
    color: '#b91c1c'
  },
  mockModalSubtitle: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  mockSection: {
    gap: 2
  },
  mockLabel: {
    fontSize: 10,
    fontWeight: '800',
    color: '#334155',
    letterSpacing: 0.5,
    marginBottom: 4
  },
  mockInput: {
    backgroundColor: '#f8fafc',
    borderWidth: 1,
    borderColor: '#e2e8f0',
    borderRadius: 6,
    paddingHorizontal: 12,
    paddingVertical: 9,
    justifyContent: 'center',
    marginBottom: 4
  },
  mockPlaceholder: {
    fontSize: 12,
    color: '#94a3b8'
  },
  mockModesRow: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 4
  },
  mockModeBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 8,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    backgroundColor: '#f8fafc'
  },
  mockModeBtnActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#b91c1c'
  },
  mockModeBtnText: {
    fontSize: 11,
    color: '#64748b',
    fontWeight: '600'
  },
  mockModeBtnActiveText: {
    fontSize: 11,
    color: '#b91c1c',
    fontWeight: '700'
  },
  mockActionsRow: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 14,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  mockCancelBtn: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1'
  },
  mockCancelBtnText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#475569'
  },
  mockSubmitBtn: {
    flex: 2,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    borderRadius: 6,
    backgroundColor: '#b91c1c'
  },
  mockSubmitBtnText: {
    fontSize: 12,
    fontWeight: '700',
    color: '#fff'
  },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#e2e8f0',
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOpacity: 0.02,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 1 }
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 14
  },
  cardTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  cardDesc: {
    fontSize: 12,
    color: '#64748b',
    marginBottom: 10,
    lineHeight: 18
  },
  inputGroup: {
    marginBottom: 14
  },
  label: {
    fontSize: 12,
    fontWeight: '600',
    color: '#334155',
    marginBottom: 6
  },
  input: {
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#cbd5e1',
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 9,
    fontSize: 13,
    color: '#0f172a'
  },
  switchRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 8,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9'
  },
  switchLabel: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a'
  },
  switchHelp: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  addFieldButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    backgroundColor: '#b91c1c',
    paddingHorizontal: 14,
    paddingVertical: 7,
    borderRadius: 6
  },
  addFieldButtonText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '700'
  },
  customFieldRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e2e8f0'
  },
  orderControls: {
    flexDirection: 'column',
    alignItems: 'center',
    justifyContent: 'center'
  },
  fieldNameText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#0f172a'
  },
  fieldTypeText: {
    fontSize: 11,
    color: '#64748b',
    marginTop: 2
  },
  badgeRequired: {
    backgroundColor: '#fef2f2',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeRequiredText: {
    color: '#dc2626',
    fontSize: 10,
    fontWeight: '700'
  },
  badgeOptional: {
    backgroundColor: '#f1f5f9',
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 4
  },
  badgeOptionalText: {
    color: '#64748b',
    fontSize: 10,
    fontWeight: '600'
  },
  editFieldBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#eff6ff',
    alignItems: 'center',
    justifyContent: 'center'
  },
  deleteFieldBtn: {
    padding: 6,
    borderRadius: 6,
    backgroundColor: '#fef2f2',
    alignItems: 'center',
    justifyContent: 'center'
  },

  /* MODAL OVERLAY & DIALOG */
  modalBackdrop: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 16
  },
  dialogCard: {
    width: '100%',
    maxWidth: 520,
    maxHeight: '90%',
    backgroundColor: '#fff',
    borderRadius: 14,
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
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f1f5f9'
  },
  dialogTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#0f172a'
  },
  dialogBody: {
    flexShrink: 1
  },
  typeSelectorRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 4
  },
  typeOption: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#f8fafc'
  },
  typeOptionActive: {
    backgroundColor: '#fee2e2',
    borderColor: '#b91c1c'
  },
  typeOptionText: {
    fontSize: 12,
    color: '#475569',
    fontWeight: '500'
  },
  typeOptionTextActive: {
    color: '#b91c1c',
    fontWeight: '700'
  },
  dialogFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 10,
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderTopWidth: 1,
    borderTopColor: '#f1f5f9',
    backgroundColor: '#f8fafc'
  },
  dialogCancelBtn: {
    paddingHorizontal: 16,
    paddingVertical: 9,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: '#cbd5e1',
    backgroundColor: '#fff'
  },
  dialogCancelText: {
    color: '#475569',
    fontSize: 13,
    fontWeight: '600'
  },
  dialogConfirmBtn: {
    paddingHorizontal: 18,
    paddingVertical: 9,
    borderRadius: 6,
    backgroundColor: '#b91c1c'
  },
  dialogConfirmText: {
    color: '#fff',
    fontSize: 13,
    fontWeight: '700'
  }
});
