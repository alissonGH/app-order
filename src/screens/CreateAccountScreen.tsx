import React, { useEffect, useState } from 'react';
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

const CreateAccountScreen: React.FC = () => {
  const navigation = useNavigation<NavigationType>();

  useEffect(() => {
    console.warn('[CreateAccount] screen mounted', { API_URL });
  }, []);

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleCreateAccount = async () => {
    const trimmedEmail = email.trim();

    if (!trimmedEmail) {
      Alert.alert('Erro', 'Por favor, preencha o email.');
      return;
    }

    if (!password) {
      Alert.alert('Erro', 'Por favor, preencha a senha.');
      return;
    }

    if ((password || '').length < 6) {
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

    if (password !== confirmPassword) {
      Alert.alert('Erro', 'Confirmação de senha diferente da senha.');
      return;
    }

    setIsLoading(true);
    try {
      const url = `${API_URL}/users/create`;
      const payload = {
        email: trimmedEmail,
        password,
      };

      console.warn('[CreateAccount] request', {
        url,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: { ...payload, password: '***', passwordLength: password.length },
      });

      const res = await fetchWithTimeout(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(payload),
        timeoutMs: 15000,
      });

      console.warn('[CreateAccount] response', { status: res.status, ok: res.ok });

      if (!res.ok) {
        const backendMsg = await extractBackendErrorMessage(res.clone());
        Alert.alert('Erro', backendMsg ?? 'Falha ao criar conta.');
        return;
      }

      Alert.alert('Sucesso', 'Conta criada com sucesso.', [
        {
          text: 'OK',
          onPress: () => navigation.navigate('Login'),
        },
      ]);
    } catch (e: any) {
      console.error('[CreateAccount] error', e);
      const msg = normalizeMessage(e);
      Alert.alert(
        'Erro',
        msg ?? `Falha ao criar conta. Não foi possível conectar ao servidor em ${API_URL}.`
      );
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
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
          <View style={styles.inner}>
            <Text style={styles.title}>Criar conta</Text>

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
            />

            <View style={styles.passwordFieldWrap}>
              <TextInput
                style={[styles.input, styles.passwordInput, styles.passwordInputBase]}
                placeholder="Senha"
                placeholderTextColor={THEME.muted}
                value={password}
                onChangeText={setPassword}
                secureTextEntry={!showPassword}
                textContentType="newPassword"
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowPassword((v) => !v)}
                accessibilityLabel={showPassword ? 'Ocultar senha' : 'Exibir senha'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={THEME.muted} />
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
              />
              <TouchableOpacity
                style={styles.eyeButton}
                onPress={() => setShowConfirmPassword((v) => !v)}
                accessibilityLabel={showConfirmPassword ? 'Ocultar confirmação de senha' : 'Exibir confirmação de senha'}
                hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
              >
                <Ionicons name={showConfirmPassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              onPress={handleCreateAccount}
              style={[styles.button, isLoading && styles.buttonDisabled]}
              disabled={isLoading}
            >
              {isLoading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Criar conta</Text>}
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
    marginBottom: 20,
    color: colors.primary,
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
    opacity: 0.6,
  },
  buttonText: {
    color: '#fff',
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

export default CreateAccountScreen;
