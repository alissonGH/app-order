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
import { RouteProp, useNavigation, useRoute } from '@react-navigation/native';

import { API_URL } from '../config/api';
import THEME from '../styles/theme';
import colors from '../styles/colors';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import { extractBackendErrorMessage, normalizeMessage } from '../utils/backendErrorMessage';
import type { RootStackParamList } from '../navigation/NavigationType';
import type { NavigationType } from '../navigation/NavigationType';

const REQUEST_TIMEOUT_MS = 15000;

type ResetTokenResponse = {
  token?: string;
};

const ValidateResetCodeScreen: React.FC = () => {
  const navigation = useNavigation<NavigationType>();
  const route = useRoute<RouteProp<RootStackParamList, 'ValidateResetCode'>>();

  const email = route.params.email;

  const [code, setCode] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const trimmedCode = useMemo(() => code.trim(), [code]);
  const isCodeValid = trimmedCode.length === 8;

  const handleValidate = async () => {
    if (!isCodeValid) {
      Alert.alert('Erro', 'Por favor, digite o codigo com 8 caracteres.');
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_URL}/auth/validate-reset-code`;
      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email, code: trimmedCode }),
        timeoutMs: REQUEST_TIMEOUT_MS,
      });

      if (!res.ok) {
        const backendMsg = await extractBackendErrorMessage(res.clone());
        Alert.alert('Falha', backendMsg ?? 'Falha ao validar codigo.');
        return;
      }

      let token: string | null = null;
      try {
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/json')) {
          const json = (await res.json()) as ResetTokenResponse;
          token = normalizeMessage(json?.token);
        } else {
          const text = await res.text();
          try {
            const parsed = JSON.parse(text) as ResetTokenResponse;
            token = normalizeMessage(parsed?.token);
          } catch {
            token = normalizeMessage(text);
          }
        }
      } catch {
        token = null;
      }

      if (!token) {
        Alert.alert('Falha', 'Token de recuperação não recebido.');
        return;
      }

      navigation.navigate('ResetPassword', { email, token });
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
            <Text style={styles.title}>Verificar codigo</Text>

            <Text style={styles.description}>Digite o codigo de recuperação enviado para o {email}</Text>

            <TextInput
              style={styles.input}
              placeholder="Codigo de verificação"
              placeholderTextColor={THEME.muted}
              value={code}
              onChangeText={setCode}
              autoCapitalize="none"
              maxLength={8}
              editable={!isLoading}
            />

            <TouchableOpacity
              onPress={handleValidate}
              style={[styles.button, (!isCodeValid || isLoading) && styles.buttonDisabled]}
              disabled={!isCodeValid || isLoading}
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

export default ValidateResetCodeScreen;
