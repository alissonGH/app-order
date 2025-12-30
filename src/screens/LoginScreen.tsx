import React, { useState } from 'react';
import { KeyboardAvoidingView, Platform, ScrollView, TouchableWithoutFeedback, Keyboard, View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useDispatch } from 'react-redux';
import { setToken } from '../auth/authSlice';
import { saveToken } from '../auth/tokenStorage';
import { API_URL } from '../config/api';
import THEME from '../styles/theme';
import colors from '../styles/colors';

const LoginScreen = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const dispatch = useDispatch();

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert("Erro", "Por favor, preencha o usuário e a senha.");
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
          username: username,
          password: password,
        }),
      });
  
      if (!response.ok) {
        if (response.status === 401 || response.status === 403) {
          throw new Error('Credenciais inválidas.');
        }
        throw new Error('Erro ao autenticar. Tente novamente mais tarde.');
      }
  
      const token = await response.text();

      if (!token) {
        throw new Error('Token não recebido do servidor.');
      }
  
      await saveToken(token);
      dispatch(setToken(token));

    } catch (error: any) {
      Alert.alert('Erro no Login', error.message || 'Ocorreu um erro inesperado.');
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
            <TextInput
              style={styles.input}
              placeholder="Username"
              placeholderTextColor={THEME.muted}
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
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
});

export default LoginScreen;
