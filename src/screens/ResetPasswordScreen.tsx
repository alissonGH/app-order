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

type MessageResponse = {
  message?: string;
};

const ResetPasswordScreen: React.FC = () => {
  const navigation = useNavigation<NavigationType>();
  const route = useRoute<RouteProp<RootStackParamList, 'ResetPassword'>>();

  const email = route.params.email;
  const token = route.params.token;

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const canSubmit = useMemo(() => {
    if (!newPassword) return false;
    if ((newPassword || '').length < 6) return false;
    if (!confirmPassword) return false;
    if ((confirmPassword || '').length < 6) return false;
    if (newPassword !== confirmPassword) return false;
    return true;
  }, [newPassword, confirmPassword]);

  const handleReset = async () => {
    if (!newPassword) {
      Alert.alert('Erro', 'Por favor, preencha a senha.');
      return;
    }

    if ((newPassword || '').length < 6) {
      Alert.alert('Erro', 'Senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (!confirmPassword) {
      Alert.alert('Erro', 'Por favor, confirme a senha.');
      return;
    }

    if ((confirmPassword || '').length < 6) {
      Alert.alert('Erro', 'A confirmação de senha deve ter no mínimo 6 caracteres.');
      return;
    }

    if (newPassword !== confirmPassword) {
      Alert.alert('Erro', 'Confirmação de senha diferente da senha.');
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_URL}/auth/reset-password`;

      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
        timeoutMs: REQUEST_TIMEOUT_MS,
      });

      if (!res.ok) {
        const backendMsg = await extractBackendErrorMessage(res.clone());
        Alert.alert('Falha', backendMsg ?? 'Falha ao atualizar senha.');
        return;
      }

      let message: string | null = null;
      try {
        const contentType = (res.headers.get('content-type') || '').toLowerCase();
        if (contentType.includes('application/json')) {
          const json = (await res.json()) as MessageResponse;
          message = normalizeMessage(json?.message);
        } else {
          const text = await res.text();
          try {
            const parsed = JSON.parse(text) as MessageResponse;
            message = normalizeMessage(parsed?.message);
          } catch {
            message = normalizeMessage(text);
          }
        }
      } catch {
        message = null;
      }

      Alert.alert('Sucesso', message ?? 'Senha atualizada.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
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
            <Text style={styles.title}>Alterar senha</Text>

            <Text style={styles.description}>Digite e confirme a nova senha para {email}</Text>

            <View style={styles.passwordFieldWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput, styles.passwordInputBase]}
                placeholder="Nova senha"
                placeholderTextColor={THEME.muted}
                value={newPassword}
                onChangeText={setNewPassword}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={THEME.muted}
                />
              </TouchableOpacity>
            </View>
            <Text style={styles.helperText}>Mínimo 6 caracteres.</Text>

            <View style={styles.passwordFieldWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput]}
                placeholder="Confirme a senha"
                placeholderTextColor={THEME.muted}
                value={confirmPassword}
                onChangeText={setConfirmPassword}
                secureTextEntry={!showConfirmPassword}
                textContentType="newPassword"
                editable={!isLoading}
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword((v) => !v)}
                accessibilityLabel={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Exibir confirmação de senha'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons
                  name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'}
                  size={20}
                  color={THEME.muted}
                />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleReset}
              style={[styles.button, (!canSubmit || isLoading) && styles.buttonDisabled]}
              disabled={!canSubmit || isLoading}
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
  passwordFieldWrap: {
    width: '100%',
    position: 'relative',
  },
  passwordInputBase: {
    marginBottom: 4,
  },
  passwordInput: {
    paddingRight: 44,
  },
  helperText: {
    width: '100%',
    color: THEME.muted,
    fontSize: 12,
    paddingHorizontal: 10,
    marginBottom: 15,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
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

export default ResetPasswordScreen;
