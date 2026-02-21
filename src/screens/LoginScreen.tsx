import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useDispatch } from 'react-redux';
import { setAuthKind, setToken } from '../auth/authSlice';
import { saveAuthKind, saveToken } from '../auth/tokenStorage';
import { API_URL } from '../config/api';
import THEME from '../styles/theme';
import colors from '../styles/colors';
import { extractBackendErrorMessage, normalizeMessage } from '../utils/backendErrorMessage';
import { fetchWithTimeout } from '../utils/fetchWithTimeout';
import type { NavigationType } from '../navigation/NavigationType';

const LOGIN_REQUEST_TIMEOUT_MS = 15000;

const LoginScreen = () => {
  const navigation = useNavigation<NavigationType>();
  const [loginMode, setLoginMode] = useState<'user' | 'device'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceUid, setDeviceUid] = useState('');
  const [devicePassword, setDevicePassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showDevicePassword, setShowDevicePassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erro", "Por favor, preencha o email e a senha.");
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout(`${API_URL}/auth/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
        timeoutMs: LOGIN_REQUEST_TIMEOUT_MS,
      });
  
      if (!response.ok) {
        const fallback = response.status === 401 || response.status === 403
          ? 'Credenciais inválidas.'
          : 'Erro ao autenticar. Tente novamente mais tarde.';
        const backendMsg = await extractBackendErrorMessage(response.clone(), fallback);
        Alert.alert('Erro no Login', backendMsg);
        return;
      }
  
      const token = await response.text();

      if (!token) {
        throw new Error('Token não recebido do servidor.');
      }
  
      await saveToken(token);
      await saveAuthKind('user');
      dispatch(setToken(token));
      dispatch(setAuthKind('user'));

    } catch (error: any) {
      if (error?.code === 'ETIMEDOUT') {
        Alert.alert('Falha no login, contate o administrador.');
        return;
      }
      Alert.alert('Erro no Login', normalizeMessage(error) ?? 'Ocorreu um erro inesperado.');
    } finally {
      setIsLoading(false);
    }
  };  

  const handleDeviceLogin = async () => {
    if (!deviceUid || !devicePassword) {
      Alert.alert('Erro', 'Por favor, preencha o ID do dispositivo e a senha.');
      return;
    }

    setIsLoading(true);
    try {
      const response = await fetchWithTimeout(`${API_URL}/auth/device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceUid: deviceUid,
          password: devicePassword,
        }),
        timeoutMs: LOGIN_REQUEST_TIMEOUT_MS,
      });

      if (!response.ok) {
        const fallback = response.status === 401 || response.status === 403
          ? 'Credenciais inválidas.'
          : 'Erro ao autenticar dispositivo. Tente novamente mais tarde.';
        const backendMsg = await extractBackendErrorMessage(response.clone(), fallback);
        Alert.alert('Erro no Login', backendMsg);
        return;
      }

      const token = await response.text();

      if (!token) {
        throw new Error('Token não recebido do servidor.');
      }

      await saveToken(token);
      await saveAuthKind('device');
      dispatch(setToken(token));
      dispatch(setAuthKind('device'));
    } catch (error: any) {
      if (error?.code === 'ETIMEDOUT') {
        Alert.alert('Falha no login, contate o administrador.');
        return;
      }
      Alert.alert('Erro no Login', normalizeMessage(error) ?? 'Ocorreu um erro inesperado.');
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
            <Text style={styles.title}>Login</Text>
            {loginMode === 'user' ? (
              <>
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
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Senha"
                    placeholderTextColor={THEME.muted}
                    value={password}
                    onChangeText={setPassword}
                    secureTextEntry={!showPassword}
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

                <TouchableOpacity
                  onPress={() => {
                    setShowPassword(false);
                    navigation.navigate('ForgotPassword');
                  }}
                  style={styles.forgotPasswordButton}
                  disabled={isLoading}
                >
                  <Text style={[styles.forgotPasswordText, isLoading && styles.forgotPasswordTextDisabled]}>
                    Esqueci minha senha
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={handleLogin} style={[styles.button, isLoading && styles.buttonDisabled]} disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Entrar</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowPassword(false);
                    setLoginMode('device');
                  }}
                  style={[styles.secondaryButton, styles.secondaryButtonBlue, isLoading && styles.secondaryButtonDisabled]}
                  disabled={isLoading}
                >
                  <Ionicons name="phone-portrait-outline" size={20} color={THEME.primary} style={styles.secondaryButtonIcon} />
                  <Text style={[styles.secondaryButtonText, styles.secondaryButtonTextBlue]}>Entrar com dispositivo</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowPassword(false);
                    navigation.navigate('CreateAccount');
                  }}
                  style={[styles.secondaryButton, isLoading && styles.secondaryButtonDisabled]}
                  disabled={isLoading}
                >
                  <Ionicons name="person-add-outline" size={20} color={colors.primary} style={styles.secondaryButtonIcon} />
                  <Text style={styles.secondaryButtonText}>Criar conta</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="ID do dispositivo"
                  placeholderTextColor={THEME.muted}
                  value={deviceUid}
                  onChangeText={setDeviceUid}
                  autoCapitalize="none"
                />
                <View style={styles.passwordFieldWrap}>
                  <TextInput
                    style={[styles.input, styles.passwordInput]}
                    placeholder="Senha"
                    placeholderTextColor={THEME.muted}
                    value={devicePassword}
                    onChangeText={setDevicePassword}
                    secureTextEntry={!showDevicePassword}
                  />
                  <TouchableOpacity
                    style={styles.eyeButton}
                    onPress={() => setShowDevicePassword((v) => !v)}
                    accessibilityLabel={showDevicePassword ? 'Ocultar senha do dispositivo' : 'Exibir senha do dispositivo'}
                    hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
                  >
                    <Ionicons name={showDevicePassword ? 'eye-off-outline' : 'eye-outline'} size={20} color={THEME.muted} />
                  </TouchableOpacity>
                </View>
                <TouchableOpacity onPress={handleDeviceLogin} style={[styles.button, isLoading && styles.buttonDisabled]} disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Entrar com Dispositivo</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => {
                    setShowDevicePassword(false);
                    setLoginMode('user');
                  }}
                  style={[styles.secondaryButton, isLoading && styles.secondaryButtonDisabled]}
                  disabled={isLoading}
                >
                  <Ionicons name="arrow-back-outline" size={20} color={colors.primary} style={styles.secondaryButtonIcon} />
                  <Text style={styles.secondaryButtonText}>Voltar para login</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </ScrollView>
      </TouchableWithoutFeedback>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
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
  passwordInput: {
    paddingRight: 44,
  },
  eyeButton: {
    position: 'absolute',
    right: 12,
    top: 0,
    height: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  forgotPasswordButton: {
    width: '100%',
    alignItems: 'center',
    marginTop: -4,
    marginBottom: 12,
    paddingHorizontal: 4,
  },
  forgotPasswordText: {
    color: THEME.primary,
    fontSize: 14,
    fontWeight: '600',
  },
  forgotPasswordTextDisabled: {
    opacity: 0.6,
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
    backgroundColor: '#f9a88c',
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
  secondaryButtonBlue: {
    borderColor: THEME.primary,
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
  secondaryButtonTextBlue: {
    color: THEME.primary,
  },
});

export default LoginScreen;
