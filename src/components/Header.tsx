import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useDispatch } from 'react-redux';
import colors from '../styles/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { clearToken } from '../auth/authSlice';
import { deleteToken, getToken } from '../auth/tokenStorage';
import { API_URL } from '../config/api';

const Header = ({ navigation, route }: { navigation: any; route: any }) => {
  const [expanded, setExpanded] = useState(false);
  const dispatch = useDispatch();

  const handleLogout = async () => {
    try {
      const token = await getToken();
      if (token) {
        await fetch(`${API_URL}/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`,
          },
          body: '',
        });
      }
    } catch (error) {
    } finally {
      await deleteToken();
      dispatch(clearToken());
    }
  };

  const isLoginScreen = route.name === 'Login';

  const handleNavigateHome = () => {
    navigation.navigate('Home');
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

          <TouchableOpacity style={styles.menuItem} onPress={() => { setExpanded(false); navigation.navigate('Categories'); }}>
            <Icon name="shape" size={20} color={colors.textLight} />
            <Text style={styles.menuItemText}>Categorias</Text>
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
