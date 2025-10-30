import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import colors from '../styles/colors'; // Importa as cores globais
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';  // Usando MaterialCommunityIcons
import type { NativeStackNavigationProp } from '@react-navigation/native-stack';
import type { RootStackParamList } from '../types/navigation';

type NavigationProp = NativeStackNavigationProp<RootStackParamList, 'Home'>;

const Header = () => {
  const navigation = useNavigation<NavigationProp>();
  const route = useRoute();
  const [expanded, setExpanded] = useState(false);

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
  
  if (isLoginScreen) return null;

  return (
    <View>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={() => setExpanded((s) => !s)} style={styles.menuButton}>
          <Icon name={expanded ? 'menu-open' : 'menu'} size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNavigateHome} style={styles.titleWrap}>
          <Text style={styles.title}>Serviço de Pedidos</Text>
        </TouchableOpacity>

        <TouchableOpacity onPress={handleLogout}>
          <Icon name="logout" size={26} color="#fff" />
        </TouchableOpacity>
      </View>

      {expanded && (
        <View style={styles.expandedMenu}>
          <TouchableOpacity style={styles.menuItem} onPress={() => { setExpanded(false); navigation.navigate('Orders'); }}>
            <Icon name="clipboard-list" size={20} color={colors.textLight} />
            <Text style={styles.menuItemText}>Pedidos</Text>
          </TouchableOpacity>

          <TouchableOpacity style={styles.menuItem} onPress={() => { setExpanded(false); navigation.navigate('Products'); }}>
            <Icon name="package-variant" size={20} color={colors.textLight} />
            <Text style={styles.menuItemText}>Produtos</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  header: {
    width: '100%',
    height: 60,
    paddingTop: 5,
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
  menuButton: {
    padding: 5,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
  },
  expandedMenu: {
    backgroundColor: colors.primary,
    paddingVertical: 8,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 10,
    paddingHorizontal: 16,
  },
  menuItemText: {
    color: colors.textLight,
    fontSize: 16,
    marginLeft: 12,
  },
});

export default Header;
