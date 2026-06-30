import { useEffect, useRef, useState } from 'react';
import { View, Text, TextInput, FlatList, StyleSheet, KeyboardAvoidingView, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { api, apiErrorMessage } from '../../api/client';
import { getSocket } from '../../api/socket';
import { useAuth } from '../../context/AuthContext';
import Button from '../../components/Button';
import { colors, fonts, spacing, radius } from '../../theme/tokens';

export default function ChatScreen({ route }) {
  const { requestId } = route.params;
  const { user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [draft, setDraft] = useState('');
  const [error, setError] = useState('');
  const listRef = useRef(null);

  useEffect(() => {
    (async () => {
      try {
        const { data } = await api.get(`/requests/${requestId}/chat`);
        setMessages(data.messages);
      } catch (err) {
        setError(apiErrorMessage(err));
      }
    })();

    const socket = getSocket();
    if (!socket) return;
    socket.emit('join:request', { requestId });
    function onMessage({ message }) {
      if (message.requestId === requestId) setMessages((prev) => [...prev, message]);
    }
    socket.on('chat:message', onMessage);
    return () => socket.off('chat:message', onMessage);
  }, [requestId]);

  async function send() {
    const text = draft.trim();
    if (!text) return;
    setDraft('');
    try {
      await api.post(`/requests/${requestId}/chat`, { message: text });
    } catch (err) {
      setError(apiErrorMessage(err));
    }
  }

  return (
    <SafeAreaView style={styles.screen}>
      <KeyboardAvoidingView style={{ flex: 1 }} behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <FlatList
          ref={listRef}
          data={messages}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.list}
          onContentSizeChange={() => listRef.current?.scrollToEnd({ animated: true })}
          renderItem={({ item }) => {
            const mine = item.senderId === user?.id;
            return (
              <View style={[styles.bubble, mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                <Text style={[styles.bubbleText, mine && { color: colors.textOnAccent }]}>{item.message}</Text>
              </View>
            );
          }}
        />
        {!!error && <Text style={styles.error}>{error}</Text>}
        <View style={styles.inputRow}>
          <TextInput
            value={draft}
            onChangeText={setDraft}
            placeholder="Type a message"
            style={styles.input}
            placeholderTextColor={colors.textSecondary}
            onSubmitEditing={send}
          />
          <Button title="Send" onPress={send} style={styles.sendButton} />
        </View>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1, backgroundColor: colors.background },
  list: { padding: spacing(5), gap: spacing(2) },
  bubble: { maxWidth: '78%', borderRadius: radius.md, paddingVertical: spacing(2.5), paddingHorizontal: spacing(4), marginBottom: spacing(2) },
  bubbleMine: { backgroundColor: colors.accent, alignSelf: 'flex-end' },
  bubbleTheirs: { backgroundColor: colors.surfaceMuted, alignSelf: 'flex-start' },
  bubbleText: { fontFamily: fonts.body, fontSize: 14, color: colors.textPrimary },
  error: { color: colors.sos, fontFamily: fonts.body, fontSize: 12, paddingHorizontal: spacing(5) },
  inputRow: { flexDirection: 'row', alignItems: 'center', gap: spacing(2), padding: spacing(4), borderTopWidth: 1, borderTopColor: colors.border },
  input: {
    flex: 1,
    height: 48,
    borderRadius: radius.pill,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.surface,
    paddingHorizontal: spacing(4),
    fontFamily: fonts.body,
    fontSize: 14,
    color: colors.textPrimary,
  },
  sendButton: { height: 48, paddingHorizontal: spacing(5) },
});
