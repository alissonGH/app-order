import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import colors from '../styles/colors'; // Importa as cores globais
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';  // Usando MaterialCommunityIcons

const Header = () => {
  const navigation = useNavigation();
  const route = useRoute();

  const handleLogout = () => {
    console.log('Logout realizado');
    navigation.reset({
      index: 0,
      routes: [{ name: 'Login' }],
    });
  };

  const isLoginScreen = route.name === 'Login';

  const handleNavigateHome = () => {
    navigation.navigate('Home'); // Redireciona para a tela "Home"
  };
  
  return (
    !isLoginScreen && 
    <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={handleNavigateHome}>
            <Text style={styles.title}>Serviço de Pedidos</Text>
        </TouchableOpacity>
        <TouchableOpacity onPress={handleLogout}>
            <Icon name="logout" size={30} color="#fff" /> {/* Usando o ícone logout */}
        </TouchableOpacity>    
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 60,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 15,
  },
  title: {
    color: colors.textLight,
    fontSize: 18,
    fontWeight: 'bold',
  },
  logoutButton: {
    padding: 10,
    backgroundColor: colors.danger,
    borderRadius: 5,
  },
  logoutText: {
    color: colors.textLight,
    fontWeight: 'bold',
  },
});

export default Header;
