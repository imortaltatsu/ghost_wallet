import { useColorScheme } from '@/hooks/use-color-scheme';
import { useChatStore } from '@/store/chatStore';
import { useLLMStore } from '@/store/llmStore';
import type { ColorSchemeSetting, NetworkKind } from '@/store/settingsStore';
import { useSettingsStore } from '@/store/settingsStore';
import { useWalletStore } from '@/store/walletStore';
import { Ionicons } from '@expo/vector-icons';
import * as Clipboard from 'expo-clipboard';
import { Stack } from 'expo-router';
import React, { useEffect, useMemo, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    Modal,
    Pressable,
    ScrollView,
    StyleSheet,
    Switch,
    Text,
    TextInput,
    View,
} from 'react-native';

const PLACEHOLDER_COLOR = '#6C6C70';
const PLACEHOLDER_COLOR_DARK = '#8E8E93';

export default function AISettingsScreen() {
    const systemColorScheme = useColorScheme();
    const {
        currentModel,
        availableModels,
        isLoading,
        downloadProgress,
        downloadModel,
        deleteModel,
        setCurrentModel,
        modelConfig,
        updateModelConfig,
        loadAvailableModels,
    } = useLLMStore();

    const { clearHistory, messages } = useChatStore();
    const { colorScheme, network, setColorScheme, setNetwork } = useSettingsStore();
    const {
        wallet,
        importFromPrivateKey,
        getPrivateKeyBase58,
        getMnemonic,
    } = useWalletStore();

    const [showMnemonicModal, setShowMnemonicModal] = useState(false);
    const [showPrivateKeyModal, setShowPrivateKeyModal] = useState(false);
    const [showImportModal, setShowImportModal] = useState(false);
    const [mnemonicText, setMnemonicText] = useState('');
    const [privateKeyText, setPrivateKeyText] = useState('');
    const [importPrivateKeyInput, setImportPrivateKeyInput] = useState('');
    const [isImporting, setIsImporting] = useState(false);

    const resolvedTheme =
        colorScheme === 'system' ? (systemColorScheme ?? 'light') : colorScheme;
    const isDark = resolvedTheme === 'dark';

    const headerOptions = useMemo(
        () => ({
            title: 'Settings',
            headerLargeTitle: false,
            presentation: 'modal' as const,
            headerStyle: {
                backgroundColor: isDark ? '#1C1C1E' : '#fff',
            },
            headerTintColor: isDark ? '#fff' : '#000',
            headerShadowVisible: false,
        }),
        [isDark],
    );

    useEffect(() => {
        loadAvailableModels();
    }, []);

    const handleBackupWallet = async () => {
        if (!wallet) {
            Alert.alert('No Wallet', 'Create or import a wallet first.');
            return;
        }
        const mnemonic = await getMnemonic();
        if (!mnemonic) {
            Alert.alert(
                'No Mnemonic',
                'This wallet was imported from a private key. Use "Export private key" to backup.',
            );
            return;
        }
        setMnemonicText(mnemonic);
        setShowMnemonicModal(true);
    };

    const handleExportPrivateKey = () => {
        if (!wallet) {
            Alert.alert('No Wallet', 'Create or import a wallet first.');
            return;
        }
        const pk = getPrivateKeyBase58();
        setPrivateKeyText(pk ?? '');
        setShowPrivateKeyModal(true);
    };

    const handleLoadBackup = () => {
        setImportPrivateKeyInput('');
        setShowImportModal(true);
    };

    const handleImportPrivateKey = async () => {
        const trimmed = importPrivateKeyInput.trim();
        if (!trimmed) {
            Alert.alert('Invalid', 'Paste your private key (base58).');
            return;
        }
        setIsImporting(true);
        try {
            await importFromPrivateKey(trimmed);
            setShowImportModal(false);
            Alert.alert('Success', 'Wallet restored from private key.');
        } catch (e) {
            Alert.alert('Import Failed', e instanceof Error ? e.message : 'Invalid private key.');
        } finally {
            setIsImporting(false);
        }
    };

    const copyToClipboard = async (text: string, label: string) => {
        await Clipboard.setStringAsync(text);
        Alert.alert('Copied', `${label} copied to clipboard.`);
    };

    const handleDownload = async (model: any) => {
        try {
            await downloadModel(model);
        } catch (error) {
            Alert.alert('Download Failed', error instanceof Error ? error.message : 'Unknown error');
        }
    };

    const handleDelete = async (modelId: string) => {
        Alert.alert(
            'Delete Model',
            'Are you sure you want to delete this model? You will need to re-download it to use it again.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Delete',
                    style: 'destructive',
                    onPress: async () => {
                        try {
                            await deleteModel(modelId);
                        } catch (error) {
                            Alert.alert('Error', 'Failed to delete model');
                        }
                    },
                },
            ]
        );
    };

    const handleClearHistory = () => {
        Alert.alert(
            'Clear History',
            'This will remove all messages from your chat history.',
            [
                { text: 'Cancel', style: 'cancel' },
                {
                    text: 'Clear',
                    style: 'destructive',
                    onPress: () => {
                        clearHistory();
                        Alert.alert('Success', 'Chat history cleared');
                    },
                },
            ]
        );
    };

    const formatSize = (bytes: number) => {
        if (bytes === 0) return '0 B';
        const k = 1024;
        const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
    };

    return (
        <View style={[styles.container, isDark && styles.containerDark]}>
            <Stack.Screen options={headerOptions} />

            <ScrollView contentContainerStyle={styles.scrollContent}>

                {/* Appearance */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Appearance</Text>
                    <View style={[styles.card, isDark && styles.cardDark]}>
                        <View style={[styles.settingRow, styles.lastRow, isDark && styles.settingRowDark]}>
                            <Text style={[styles.settingLabel, isDark && styles.settingLabelDark]}>Dark mode</Text>
                            <View style={styles.segmentedRow}>
                                {(['light', 'dark', 'system'] as ColorSchemeSetting[]).map((opt) => (
                                    <Pressable
                                        key={opt}
                                        style={[
                                            styles.segmentedOption,
                                            isDark && !(colorScheme === opt) && styles.segmentedOptionDark,
                                            colorScheme === opt && styles.segmentedOptionActive,
                                        ]}
                                        onPress={() => setColorScheme(opt)}
                                    >
                                        <Text
                                            style={[
                                                styles.segmentedOptionText,
                                                isDark && !(colorScheme === opt) && styles.segmentedOptionTextDark,
                                                colorScheme === opt && styles.segmentedOptionTextActive,
                                            ]}
                                        >
                                            {opt === 'system' ? 'System' : opt === 'dark' ? 'Dark' : 'Light'}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                    </View>
                </View>

                {/* Network */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Network</Text>
                    <View style={[styles.card, isDark && styles.cardDark]}>
                        <View style={[styles.settingRow, styles.lastRow, isDark && styles.settingRowDark]}>
                            <View style={{ flex: 1 }}>
                                <Text style={[styles.settingLabel, isDark && styles.settingLabelDark]}>Chain</Text>
                                <Text style={[styles.settingDesc, isDark && styles.settingDescDark]}>
                                    {network === 'devnet'
                                        ? 'Testnet (dev SOL, no real value).'
                                        : 'Mainnet (real SOL). Not tested.'}
                                </Text>
                            </View>
                            <View style={styles.segmentedRow}>
                                {(['devnet', 'mainnet'] as NetworkKind[]).map((opt) => (
                                    <Pressable
                                        key={opt}
                                        style={[
                                            styles.segmentedOption,
                                            network === opt && styles.segmentedOptionActive,
                                        ]}
                                        onPress={() => setNetwork(opt)}
                                    >
                                        <Text
                                            style={[
                                                styles.segmentedOptionText,
                                                network === opt && styles.segmentedOptionTextActive,
                                            ]}
                                        >
                                            {opt === 'devnet' ? 'Testnet' : 'Mainnet'}
                                        </Text>
                                    </Pressable>
                                ))}
                            </View>
                        </View>
                        {network === 'mainnet' && (
                            <View style={styles.mainnetNote}>
                                <Ionicons name="warning-outline" size={16} color="#FF9500" />
                                <Text style={styles.mainnetNoteText}>Mainnet mode is not tested. Use at your own risk.</Text>
                            </View>
                        )}
                    </View>
                </View>

                {/* Wallet backup / load / export */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Wallet</Text>
                    <View style={[styles.card, isDark && styles.cardDark]}>
                        <Pressable style={[styles.settingRow, isDark && styles.settingRowDark]} onPress={handleBackupWallet}>
                            <View>
                                <Text style={[styles.settingLabel, isDark && styles.settingLabelDark]}>Backup wallet</Text>
                                <Text style={[styles.settingDesc, isDark && styles.settingDescDark]}>View & copy recovery phrase (mnemonic)</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={isDark ? '#94a3b8' : '#C7C7CC'} />
                        </Pressable>
                        <Pressable style={[styles.settingRow, isDark && styles.settingRowDark]} onPress={handleLoadBackup}>
                            <View>
                                <Text style={[styles.settingLabel, isDark && styles.settingLabelDark]}>Load backup</Text>
                                <Text style={[styles.settingDesc, isDark && styles.settingDescDark]}>Restore wallet from private key</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={isDark ? '#94a3b8' : '#C7C7CC'} />
                        </Pressable>
                        <Pressable style={[styles.settingRow, styles.lastRow, isDark && styles.settingRowDark]} onPress={handleExportPrivateKey}>
                            <View>
                                <Text style={[styles.settingLabel, isDark && styles.settingLabelDark]}>Export private key</Text>
                                <Text style={[styles.settingDesc, isDark && styles.settingDescDark]}>View & copy secret key (base58)</Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={isDark ? '#94a3b8' : '#C7C7CC'} />
                        </Pressable>
                    </View>
                </View>

                {/* Model Selection Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>AI Models</Text>
                    <Text style={[styles.sectionSubtitle, isDark && styles.sectionSubtitleDark]}>
                        manage your on-device AI models. Larger models are smarter but slower.
                    </Text>
                    <Text style={[styles.sectionSubtitle, isDark && styles.sectionSubtitleDark, { marginBottom: 4 }]}>
                        Selecting a model resets and reinitializes the GGUF.
                    </Text>

                    <View style={[styles.card, isDark && styles.cardDark]}>
                        {availableModels.map((model) => {
                            const isActive = currentModel?.id === model.id;
                            const isDownloading = downloadProgress?.modelId === model.id && downloadProgress?.status === 'downloading';

                            return (
                                <View key={model.id} style={[styles.modelItem, isDark && styles.modelItemDark, isActive && styles.activeModelItem, isActive && isDark && styles.activeModelItemDark]}>
                                    <View style={styles.modelHeader}>
                                        <View style={styles.modelInfo}>
                                            <Text style={[styles.modelName, isDark && styles.modelNameDark]}>{model.name}</Text>
                                            <Text style={[styles.modelMeta, isDark && styles.modelMetaDark]}>
                                                {model.size} • {model.quantization || 'Q4_K_M'}
                                            </Text>
                                            {isActive && (
                                                <View style={styles.activeBadge}>
                                                    <Text style={styles.activeBadgeText}>Active</Text>
                                                </View>
                                            )}
                                        </View>

                                        <View style={styles.modelActions}>
                                            {isDownloading ? (
                                                <View style={styles.downloadStatusContainer}>
                                                    <View style={styles.progressRow}>
                                                        <ActivityIndicator size="small" color="#007AFF" />
                                                        <Text style={styles.downloadingText}>Downloading...</Text>
                                                    </View>
                                                    <Text style={styles.progressText}>
                                                        {Math.round(downloadProgress?.percentage || 0)}%
                                                        <Text style={[styles.progressDetail, isDark && styles.sectionSubtitleDark]}>
                                                            {' '}({formatSize(downloadProgress?.bytesDownloaded || 0)} / {formatSize(downloadProgress?.totalBytes || 0)})
                                                        </Text>
                                                    </Text>
                                                </View>
                                            ) : model.downloaded ? (
                                                <View style={styles.downloadedActions}>
                                                    {!isActive && (
                                                        <Pressable
                                                            style={({ pressed }) => [
                                                                styles.selectButton,
                                                                pressed && styles.buttonPressed
                                                            ]}
                                                            onPress={() => setCurrentModel(model)}
                                                        >
                                                            <Text style={styles.selectButtonText}>Select</Text>
                                                        </Pressable>
                                                    )}
                                                    <Pressable
                                                        style={({ pressed }) => [
                                                            styles.deleteButton,
                                                            pressed && styles.buttonPressed
                                                        ]}
                                                        onPress={() => handleDelete(model.id)}
                                                    >
                                                        <Ionicons name="trash-outline" size={20} color="#FF3B30" />
                                                    </Pressable>
                                                </View>
                                            ) : (
                                                <Pressable
                                                    style={({ pressed }) => [
                                                        styles.downloadButton,
                                                        pressed && styles.buttonPressed
                                                    ]}
                                                    onPress={() => handleDownload(model)}
                                                >
                                                    <Ionicons name="cloud-download-outline" size={20} color="#007AFF" />
                                                    <Text style={styles.downloadButtonText}>Download</Text>
                                                </Pressable>
                                            )}
                                        </View>
                                    </View>

                                    <Text style={[styles.modelDesc, isDark && styles.modelDescDark]}>{model.description}</Text>

                                    {isDownloading && (
                                        <View style={styles.progressBarBg}>
                                            <View
                                                style={[
                                                    styles.progressBarFill,
                                                    { width: `${downloadProgress?.percentage || 0}%` }
                                                ]}
                                            />
                                        </View>
                                    )}
                                </View>
                            );
                        })}
                    </View>
                </View>

                {/* Configuration Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Parameters</Text>
                    <View style={[styles.card, isDark && styles.cardDark]}>
                        <View style={[styles.settingRow, isDark && styles.settingRowDark]}>
                            <View>
                                <Text style={[styles.settingLabel, isDark && styles.settingLabelDark]}>Use GPU Acceleration</Text>
                                <Text style={[styles.settingDesc, isDark && styles.settingDescDark]}>Use Metal (iOS) or Vulkan (Android)</Text>
                            </View>
                            <Switch
                                value={modelConfig.nGpuLayers > 0}
                                onValueChange={(val) => updateModelConfig({ nGpuLayers: val ? 99 : 0 })}
                                trackColor={{ false: '#767577', true: '#34C759' }}
                            />
                        </View>

                        <View style={[styles.settingRow, styles.lastRow, isDark && styles.settingRowDark]}>
                            <View>
                                <Text style={[styles.settingLabel, isDark && styles.settingLabelDark]}>Context Size</Text>
                                <Text style={[styles.settingDesc, isDark && styles.settingDescDark]}>
                                    {modelConfig.contextSize} tokens (higher uses more RAM)
                                </Text>
                            </View>
                            <View style={styles.readOnlyValue}>
                                <Text style={[styles.valueText, isDark && styles.valueTextDark]}>{modelConfig.contextSize}</Text>
                            </View>
                        </View>
                    </View>
                </View>

                {/* Data Management Section */}
                <View style={styles.section}>
                    <Text style={[styles.sectionTitle, isDark && styles.sectionTitleDark]}>Data & Storage</Text>
                    <View style={[styles.card, isDark && styles.cardDark]}>
                        <Pressable
                            style={[styles.settingRow, styles.lastRow, isDark && styles.settingRowDark]}
                            onPress={handleClearHistory}
                        >
                            <View>
                                <Text style={[styles.settingLabel, { color: '#FF3B30' }]}>Clear Chat History</Text>
                                <Text style={[styles.settingDesc, isDark && styles.settingDescDark]}>
                                    Delete all {messages.length} messages permanently
                                </Text>
                            </View>
                            <Ionicons name="chevron-forward" size={20} color={isDark ? '#94a3b8' : '#C7C7CC'} />
                        </Pressable>
                    </View>
                </View>

                <View style={styles.footer}>
                    <Text style={[styles.footerText, isDark && styles.footerTextDark]}>Ghost Wallet AI v1.0.0</Text>
                    <Text style={[styles.footerText, isDark && styles.footerTextDark]}>Powered by Yeetlabs</Text>
                </View>

            </ScrollView>

            {/* Backup mnemonic modal */}
            <Modal visible={showMnemonicModal} transparent animationType="slide">
                <Pressable style={styles.modalBackdrop} onPress={() => setShowMnemonicModal(false)}>
                    <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Recovery phrase (mnemonic)</Text>
                        <Text style={styles.modalWarning}>
                            Never share this with anyone. Anyone with this phrase can control your wallet.
                        </Text>
                        <ScrollView style={styles.modalScroll}>
                            <Text selectable style={styles.modalSecretText}>{mnemonicText}</Text>
                        </ScrollView>
                        <Pressable
                            style={styles.modalButton}
                            onPress={() => copyToClipboard(mnemonicText, 'Mnemonic')}
                        >
                            <Text style={styles.modalButtonText}>Copy to clipboard</Text>
                        </Pressable>
                        <Pressable style={styles.modalClose} onPress={() => setShowMnemonicModal(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Export private key modal */}
            <Modal visible={showPrivateKeyModal} transparent animationType="slide">
                <Pressable style={styles.modalBackdrop} onPress={() => setShowPrivateKeyModal(false)}>
                    <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Private key (secret key)</Text>
                        <Text style={styles.modalWarning}>
                            Never share this. Anyone with this key has full control of your wallet.
                        </Text>
                        <ScrollView style={styles.modalScroll}>
                            <Text selectable style={styles.modalSecretText}>{privateKeyText}</Text>
                        </ScrollView>
                        <Pressable
                            style={styles.modalButton}
                            onPress={() => copyToClipboard(privateKeyText, 'Private key')}
                        >
                            <Text style={styles.modalButtonText}>Copy to clipboard</Text>
                        </Pressable>
                        <Pressable style={styles.modalClose} onPress={() => setShowPrivateKeyModal(false)}>
                            <Text style={styles.modalCloseText}>Close</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>

            {/* Import from private key modal */}
            <Modal visible={showImportModal} transparent animationType="slide">
                <Pressable style={styles.modalBackdrop} onPress={() => setShowImportModal(false)}>
                    <Pressable style={styles.modalSheet} onPress={(e) => e.stopPropagation()}>
                        <Text style={styles.modalTitle}>Load backup (private key)</Text>
                        <Text style={styles.modalWarning}>
                            Paste your base58 private key. This will replace the current wallet.
                        </Text>
                        <TextInput
                            style={styles.modalInput}
                            placeholder="Paste private key (base58)"
                            placeholderTextColor={PLACEHOLDER_COLOR}
                            value={importPrivateKeyInput}
                            onChangeText={setImportPrivateKeyInput}
                            multiline
                            autoCapitalize="none"
                            autoCorrect={false}
                        />
                        <Pressable
                            style={[styles.modalButton, isImporting && styles.modalButtonDisabled]}
                            onPress={handleImportPrivateKey}
                            disabled={isImporting}
                        >
                            {isImporting ? (
                                <ActivityIndicator color="#fff" size="small" />
                            ) : (
                                <Text style={styles.modalButtonText}>Restore wallet</Text>
                            )}
                        </Pressable>
                        <Pressable style={styles.modalClose} onPress={() => setShowImportModal(false)}>
                            <Text style={styles.modalCloseText}>Cancel</Text>
                        </Pressable>
                    </Pressable>
                </Pressable>
            </Modal>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: '#F2F2F7',
    },
    containerDark: {
        backgroundColor: '#1e293b',
    },
    scrollContent: {
        padding: 20,
        paddingBottom: 40,
    },
    section: {
        marginBottom: 24,
    },
    sectionTitle: {
        fontSize: 13,
        fontWeight: '600',
        color: '#6e6e73',
        textTransform: 'uppercase',
        marginBottom: 8,
        marginLeft: 12,
    },
    sectionTitleDark: { color: '#cbd5e1' },
    sectionSubtitle: {
        fontSize: 13,
        color: '#8e8e93',
        marginBottom: 12,
        marginLeft: 12,
    },
    sectionSubtitleDark: { color: '#94a3b8' },
    card: {
        backgroundColor: '#fff',
        borderRadius: 12,
        overflow: 'hidden',
    },
    cardDark: { backgroundColor: '#334155' },
    modelItem: {
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
    },
    modelItemDark: { borderBottomColor: '#475569' },
    activeModelItem: {
        backgroundColor: '#F7F7FA',
    },
    activeModelItemDark: { backgroundColor: '#475569' },
    modelHeader: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'flex-start',
        marginBottom: 8,
    },
    modelInfo: {
        flex: 1,
        marginRight: 12,
    },
    modelName: {
        fontSize: 17,
        fontWeight: '600',
        color: '#000',
        marginBottom: 4,
    },
    modelNameDark: { color: '#fff' },
    modelMeta: {
        fontSize: 13,
        color: '#8E8E93',
        marginBottom: 6,
    },
    modelMetaDark: { color: '#94a3b8' },
    activeBadge: {
        backgroundColor: '#34C759',
        paddingHorizontal: 8,
        paddingVertical: 2,
        borderRadius: 4,
        alignSelf: 'flex-start',
    },
    activeBadgeText: {
        color: '#fff',
        fontSize: 11,
        fontWeight: '600',
    },
    modelDesc: {
        fontSize: 14,
        color: '#3C3C43',
        lineHeight: 20,
    },
    modelDescDark: { color: '#cbd5e1' },
    modelActions: {
        alignItems: 'flex-end',
    },
    downloadButton: {
        flexDirection: 'row',
        alignItems: 'center',
        backgroundColor: 'rgba(0, 122, 255, 0.1)',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
        gap: 4,
    },
    downloadButtonText: {
        color: '#007AFF',
        fontSize: 14,
        fontWeight: '600',
    },
    downloadedActions: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 12,
    },
    selectButton: {
        backgroundColor: '#007AFF',
        paddingHorizontal: 12,
        paddingVertical: 6,
        borderRadius: 14,
    },
    selectButtonText: {
        color: '#fff',
        fontSize: 14,
        fontWeight: '600',
    },
    deleteButton: {
        padding: 6,
    },
    progressContainer: {
        alignItems: 'center',
    },
    progressText: {
        fontSize: 10,
        color: '#007AFF',
        marginTop: 2,
        fontWeight: '600',
    },
    progressBarBg: {
        height: 4,
        backgroundColor: '#E5E5EA',
        borderRadius: 2,
        marginTop: 12,
        overflow: 'hidden',
    },
    progressBarFill: {
        height: '100%',
        backgroundColor: '#007AFF',
    },
    settingRow: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        padding: 16,
        borderBottomWidth: 1,
        borderBottomColor: '#E5E5EA',
        backgroundColor: '#fff',
    },
    settingRowDark: { borderBottomColor: '#475569', backgroundColor: '#334155' },
    lastRow: {
        borderBottomWidth: 0,
    },
    settingLabel: {
        fontSize: 17,
        color: '#000',
        marginBottom: 4,
    },
    settingLabelDark: { color: '#fff' },
    settingDesc: {
        fontSize: 13,
        color: '#8E8E93',
        maxWidth: 240,
    },
    settingDescDark: { color: '#94a3b8' },
    readOnlyValue: {
        flexDirection: 'row',
        alignItems: 'center',
    },
    valueText: {
        fontSize: 17,
        color: '#8E8E93',
    },
    valueTextDark: { color: '#94a3b8' },
    footer: {
        alignItems: 'center',
        marginTop: 20,
    },
    footerText: {
        fontSize: 13,
        color: '#C7C7CC',
        marginBottom: 4,
    },
    footerTextDark: { color: '#94a3b8' },
    downloadStatusContainer: {
        alignItems: 'flex-end',
    },
    progressRow: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 6,
        marginBottom: 2,
    },
    downloadingText: {
        fontSize: 12,
        color: '#007AFF',
        fontWeight: '500',
    },
    progressDetail: {
        fontSize: 10,
        color: '#8E8E93',
        fontWeight: 'regular',
    },
    buttonPressed: {
        opacity: 0.7,
    },
    segmentedRow: {
        flexDirection: 'row',
        gap: 8,
    },
    segmentedOption: {
        paddingHorizontal: 12,
        paddingVertical: 8,
        borderRadius: 8,
        backgroundColor: '#E5E5EA',
    },
    segmentedOptionDark: { backgroundColor: '#475569' },
    segmentedOptionActive: {
        backgroundColor: '#007AFF',
    },
    segmentedOptionText: {
        fontSize: 14,
        fontWeight: '600',
        color: '#3C3C43',
    },
    segmentedOptionTextDark: { color: '#cbd5e1' },
    segmentedOptionTextActive: {
        color: '#fff',
    },
    mainnetNote: {
        flexDirection: 'row',
        alignItems: 'center',
        gap: 8,
        paddingHorizontal: 16,
        paddingVertical: 12,
        backgroundColor: '#FFF8E6',
        borderTopWidth: 1,
        borderTopColor: '#E5E5EA',
    },
    mainnetNoteText: {
        flex: 1,
        fontSize: 13,
        color: '#8E6B00',
        lineHeight: 18,
    },
    modalBackdrop: {
        flex: 1,
        backgroundColor: 'rgba(0,0,0,0.5)',
        justifyContent: 'flex-end',
    },
    modalSheet: {
        backgroundColor: '#fff',
        borderTopLeftRadius: 20,
        borderTopRightRadius: 20,
        padding: 24,
        paddingBottom: 40,
        maxHeight: '80%',
    },
    modalTitle: {
        fontSize: 18,
        fontWeight: '700',
        color: '#1C1C1E',
        marginBottom: 8,
    },
    modalWarning: {
        fontSize: 13,
        color: '#FF3B30',
        marginBottom: 16,
        lineHeight: 18,
    },
    modalScroll: {
        maxHeight: 160,
        marginBottom: 16,
    },
    modalSecretText: {
        fontSize: 13,
        fontFamily: 'Menlo',
        color: '#1C1C1E',
        lineHeight: 20,
    },
    modalInput: {
        backgroundColor: '#F2F2F7',
        borderRadius: 12,
        padding: 16,
        fontSize: 14,
        color: '#1C1C1E',
        borderWidth: 1,
        borderColor: '#E5E5EA',
        marginBottom: 16,
        minHeight: 80,
        textAlignVertical: 'top',
    },
    modalButton: {
        backgroundColor: '#007AFF',
        paddingVertical: 14,
        borderRadius: 12,
        alignItems: 'center',
        marginBottom: 12,
    },
    modalButtonDisabled: {
        opacity: 0.6,
    },
    modalButtonText: {
        color: '#fff',
        fontSize: 16,
        fontWeight: '600',
    },
    modalClose: {
        paddingVertical: 12,
        alignItems: 'center',
    },
    modalCloseText: {
        fontSize: 16,
        color: '#007AFF',
        fontWeight: '600',
    },
});
