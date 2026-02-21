import React, { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  Alert,
  Keyboard,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  TouchableWithoutFeedback,
  View,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

import { API_URL } from '../config/api';
import THEME from '../styles/theme';
import colors from '../styles/colors';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { extractBackendErrorMessage, normalizeMessage } from '../utils/backendErrorMessage';
import type { NavigationType } from '../navigation/NavigationType';

const REQUEST_TIMEOUT_MS = 15000;

type ForgotPasswordSuccess = {
  message?: string;
};

const ForgotPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationType>();

  const [email, setEmail] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const trimmedEmail = useMemo(() => email.trim(), [email]);

  const handleSend = async () => {
    if (!trimmedEmail) {
      Alert.alert('Erro', 'Por favor, preencha o email.');
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_URL}/auth/forgot-password`;

      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email: trimmedEmail }),
        timeoutMs: REQUEST_TIMEOUT_MS,
      });

      if (!res.ok) {
        const backendMsg = await extractBackendErrorMessage(res.clone());
        Alert.alert('Falha', backendMsg ?? 'Falha ao solicitar recuperação de senha.');
        return;
      }

      let message: string | null = null;
      try {
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/json')) {
          const json = (await res.json()) as ForgotPasswordSuccess;
          message = normalizeMessage(json?.message);
        } else {
          const text = await res.text();
          try {
            const parsed = JSON.parse(text) as ForgotPasswordSuccess;
            message = normalizeMessage(parsed?.message);
          } catch {
            message = normalizeMessage(text);
          }
        }
      } catch {
        message = null;
      }

      Alert.alert('Sucesso', message ?? 'Se existir uma conta com esse email, enviaremos um codigo.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('ValidateResetCode', { email: trimmedEmail }),
        },
      ]);
    } catch (e: any) {
      const msg = normalizeMessage(e);
      Alert.alert('Falha', msg ?? `Não foi possível conectar ao servidor em ${API_URL}.`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={{ flex: 1 }}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 20 : 20}
    >
      <TouchableWithoutFeedback onPress={Keyboard.dismiss} accessible={false}>
        <ScrollView
          contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', alignItems: 'center', padding: 20 }}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.inner}>
            <Text style={styles.title}>Recuperar senha</Text>

            <Text style={styles.description}>Digite o email para o envio do codigo de recuperação</Text>

            <TextInput
              style={styles.input}
              placeholder="Email"
              placeholderTextColor={THEME.muted}
              value={email}
              onChangeText={setEmail}
              autoCapitalize="none"
              keyboardType="email-address"
              textContentType="emailAddress"
              autoComplete="email"
              editable={!isLoading}
            />

            <TouchableOpacity
              onPress={handleSend}
              style={[styles.button, isLoading && styles.buttonDisabled]}
              disabled={isLoading}
            >
              {isLoading ? (
                <ActivityIndicator color={colors.textLight} />
              ) : (
                <Text style={styles.buttonText}>Enviar</Text>
              )}
            </TouchableOpacity>

            <TouchableOpacity
              onPress={() => navigation.navigate('Login')}
              style={[styles.secondaryButton, isLoading && styles.secondaryButtonDisabled]}
              disabled={isLoading}
            >
              <Ionicons name="arrow-back-outline" size={20} color={colors.primary} style={styles.secondaryButtonIcon} />
              <Text style={styles.secondaryButtonText}>Voltar para Login</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  inner: {
    width: '100%',
    maxWidth: 480,
    alignItems: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    color: colors.primary,
  },
  description: {
    width: '100%',
    color: THEME.muted,
    fontSize: 14,
    paddingHorizontal: 10,
    marginBottom: 12,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: THEME.border,
    borderRadius: 10,
    paddingHorizontal: 10,
    marginBottom: 15,
    color: THEME.text,
    backgroundColor: THEME.card,
  },
  button: {
    width: '100%',
    height: 50,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 8,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: colors.textLight,
    fontSize: 16,
    fontWeight: 'bold',
  },
  secondaryButton: {
    width: '100%',
    height: 50,
    marginTop: 12,
    backgroundColor: THEME.card,
    justifyContent: 'center',
    alignItems: 'center',
    flexDirection: 'row',
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.primary,
    paddingHorizontal: 16,
  },
  secondaryButtonDisabled: {
    opacity: 0.6,
  },
  secondaryButtonIcon: {
    marginRight: 10,
  },
  secondaryButtonText: {
    color: colors.primary,
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default ForgotPasswordScreen;
