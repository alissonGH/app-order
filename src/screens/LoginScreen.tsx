import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useDispatch } from 'react-redux';
import { setAuthKind, setToken } from '../auth/authSlice';
import { saveAuthKind, saveToken } from '../auth/tokenStorage';
import { API_URL } from '../config/api';
import THEME from '../styles/theme';
import colors from '../styles/colors';
import { extractBackendErrorMessage, normalizeMessage } from '../utils/backendErrorMessage';

const LoginScreen = () => {
  const [loginMode, setLoginMode] = useState<'user' | 'device'>('user');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [deviceUid, setDeviceUid] = useState('');
  const [devicePassword, setDevicePassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!email || !password) {
      Alert.alert("Erro", "Por favor, preencha o email e a senha.");
      return;
    }
    setIsLoading(true);
    try {
      const response = await fetch(`${API_URL}/auth/authenticate`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email: email,
          password: password,
        }),
      });
  
      if (!response.ok) {
        const backendMsg = await extractBackendErrorMessage(response.clone());
        if (response.status === 401 || response.status === 403) {
          throw new Error(backendMsg ?? 'Credenciais inválidas.');
        }
        throw new Error(backendMsg ?? 'Erro ao autenticar. Tente novamente mais tarde.');
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
      const response = await fetch(`${API_URL}/auth/device`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          deviceUid: deviceUid,
          password: devicePassword,
        }),
      });

      if (!response.ok) {
        const backendMsg = await extractBackendErrorMessage(response.clone());
        if (response.status === 401 || response.status === 403) {
          throw new Error(backendMsg ?? 'Credenciais inválidas.');
        }
        throw new Error(backendMsg ?? 'Erro ao autenticar dispositivo. Tente novamente mais tarde.');
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
        <ScrollView contentContainerStyle={{ flexGrow: 1, justifyContent: 'center', padding: 20 }} keyboardShouldPersistTaps="handled">
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
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={THEME.muted}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                />
                <TouchableOpacity onPress={handleLogin} style={[styles.button, isLoading && styles.buttonDisabled]} disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Entrar</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setLoginMode('device')}
                  style={[styles.secondaryButton, isLoading && styles.secondaryButtonDisabled]}
                  disabled={isLoading}
                >
                  <Ionicons name="phone-portrait-outline" size={20} color={colors.primary} style={styles.secondaryButtonIcon} />
                  <Text style={styles.secondaryButtonText}>Logar com Dispositivo</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <TextInput
                  style={styles.input}
                  placeholder="Device UID"
                  placeholderTextColor={THEME.muted}
                  value={deviceUid}
                  onChangeText={setDeviceUid}
                  autoCapitalize="none"
                />
                <TextInput
                  style={styles.input}
                  placeholder="Password"
                  placeholderTextColor={THEME.muted}
                  value={devicePassword}
                  onChangeText={setDevicePassword}
                  secureTextEntry
                />
                <TouchableOpacity onPress={handleDeviceLogin} style={[styles.button, isLoading && styles.buttonDisabled]} disabled={isLoading}>
                  {isLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.buttonText}>Entrar com Dispositivo</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={() => setLoginMode('user')}
                  style={[styles.secondaryButton, isLoading && styles.secondaryButtonDisabled]}
                  disabled={isLoading}
                >
                  <Ionicons name="arrow-back-outline" size={20} color={colors.primary} style={styles.secondaryButtonIcon} />
                  <Text style={styles.secondaryButtonText}>Voltar para Login</Text>
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

export default LoginScreen;
