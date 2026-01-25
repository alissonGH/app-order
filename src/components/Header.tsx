import React, { useMemo, useRef, useState } from 'react';
import { Animated, Modal, PanResponder, Pressable, StyleSheet, Text, TouchableOpacity, View, useWindowDimensions } from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import colors from '../styles/colors';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { clearToken, selectAuthKind } from '../auth/authSlice';
import { deleteToken, getToken, removeAuthKind } from '../auth/tokenStorage';
import { API_URL } from '../config/api';
import THEME from '../styles/theme';

const Header = ({ navigation, route }: { navigation: any; route: any }) => {
  const { width } = useWindowDimensions();
  const drawerWidth = Math.min(320, Math.floor(width * 0.82));

  const [drawerVisible, setDrawerVisible] = useState(false);
  const translateX = useRef(new Animated.Value(-drawerWidth)).current;

  const dispatch = useDispatch();
  const authKind = useSelector(selectAuthKind);

  const menuItems = useMemo(() => {
    if (authKind === 'device') {
      return [
        { key: 'Orders', label: 'Pedidos', icon: 'clipboard-list' },
      ];
    }

    return [
      { key: 'Profile', label: 'Perfil', icon: 'account-circle-outline' },
      { key: 'Orders', label: 'Pedidos', icon: 'clipboard-list' },
      { key: 'Products', label: 'Produtos', icon: 'package-variant' },
      { key: 'Categories', label: 'Categorias', icon: 'shape' },
      { key: 'Devices', label: 'Dispositivos', icon: 'cellphone-link' },
    ];
  }, [authKind]);

  const openDrawer = () => {
    translateX.setValue(-drawerWidth);
    setDrawerVisible(true);
    Animated.timing(translateX, {
      toValue: 0,
      duration: 220,
      useNativeDriver: true,
    }).start();
  };

  const closeDrawer = () => {
    Animated.timing(translateX, {
      toValue: -drawerWidth,
      duration: 180,
      useNativeDriver: true,
    }).start(({ finished }) => {
      if (finished) setDrawerVisible(false);
    });
  };

  const panResponder = useRef(
    PanResponder.create({
      onMoveShouldSetPanResponder: (_evt, gesture) => {
        // Captura apenas gesto horizontal consistente
        const dx = Math.abs(gesture.dx);
        const dy = Math.abs(gesture.dy);
        return dx > 12 && dx > dy;
      },
      onPanResponderMove: (_evt, gesture) => {
        // Drawer abre da esquerda, então fechamos arrastando para a esquerda (dx negativo)
        const next = Math.min(0, Math.max(-drawerWidth, gesture.dx));
        translateX.setValue(next);
      },
      onPanResponderRelease: (_evt, gesture) => {
        const shouldClose = gesture.dx < -drawerWidth * 0.35 || gesture.vx < -0.6;
        if (shouldClose) {
          closeDrawer();
          return;
        }

        Animated.timing(translateX, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start();
      },
      onPanResponderTerminate: () => {
        Animated.timing(translateX, {
          toValue: 0,
          duration: 160,
          useNativeDriver: true,
        }).start();
      },
    })
  ).current;

  const handleLogout = async () => {
    try {
      const token = await getToken();
      if (token) {
        const url = authKind === 'device' ? `${API_URL}/auth/device/logout` : `${API_URL}/auth/logout`;
        await fetch(url, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${token}`,
          },
          body: '',
        });
      }
    } catch (error) {
    } finally {
      await deleteToken();
      await removeAuthKind();
      dispatch(clearToken());
    }
  };

  const isLoginScreen = route.name === 'Login';

  const handleNavigateHome = () => {
    navigation.navigate(authKind === 'device' ? 'Orders' : 'Home');
  };
  
  if (isLoginScreen) return null;

  return (
    <View>
      <View style={[styles.header, { backgroundColor: colors.primary }]}>
        <TouchableOpacity onPress={openDrawer} style={styles.menuButton}>
          <Icon name="menu" size={28} color="#fff" />
        </TouchableOpacity>

        <TouchableOpacity onPress={handleNavigateHome} style={styles.titleWrap}>
          <Text style={styles.title}>Serviço de Pedidos</Text>
        </TouchableOpacity>

        <View style={styles.rightSpacer} />
      </View>

      <Modal
        visible={drawerVisible}
        transparent
        animationType="none"
        onRequestClose={closeDrawer}
      >
        <View style={styles.modalRoot}>
          <Pressable style={styles.scrim} onPress={closeDrawer} />

          <Animated.View
            style={[
              styles.drawer,
              {
                width: drawerWidth,
                transform: [{ translateX }],
              },
            ]}
            {...panResponder.panHandlers}
          >
            <View style={styles.drawerHeader}>
              <Text style={styles.drawerTitle}>Menu</Text>
              <TouchableOpacity onPress={closeDrawer} hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}>
                <Icon name="close" size={22} color={THEME.muted} />
              </TouchableOpacity>
            </View>

            <View style={styles.drawerBody}>
              {menuItems.map((item) => {
                const isActive = route?.name === item.key;
                return (
                  <TouchableOpacity
                    key={item.key}
                    style={[styles.drawerItem, isActive && styles.drawerItemActive]}
                    onPress={() => {
                      closeDrawer();
                      navigation.navigate(item.key);
                    }}
                  >
                    <Icon name={item.icon} size={20} color={isActive ? colors.primary : THEME.muted} />
                    <Text style={[styles.drawerItemText, isActive && styles.drawerItemTextActive]}>{item.label}</Text>
                  </TouchableOpacity>
                );
              })}
            </View>

            <View style={styles.drawerFooter}>
              <TouchableOpacity
                style={styles.drawerLogout}
                onPress={async () => {
                  closeDrawer();
                  await handleLogout();
                }}
              >
                <Icon name="logout" size={20} color={colors.danger} />
                <Text style={styles.drawerLogoutText}>Sair</Text>
              </TouchableOpacity>
            </View>
          </Animated.View>
        </View>
      </Modal>
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
    marginTop: 4,
  },
  rightSpacer: {
    width: 34,
  },
  titleWrap: {
    flex: 1,
    alignItems: 'center',
    marginTop: 4,
  },

  modalRoot: {
    flex: 1,
    flexDirection: 'row',
  },
  scrim: {
    flex: 1,
    backgroundColor: 'rgba(17, 24, 39, 0.55)',
  },
  drawer: {
    position: 'absolute',
    left: 0,
    top: 0,
    bottom: 0,
    backgroundColor: THEME.card,
    borderRightWidth: 1,
    borderRightColor: THEME.border,
  },
  drawerHeader: {
    height: 64,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: THEME.border,
  },
  drawerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: THEME.text,
  },
  drawerBody: {
    flex: 1,
    paddingTop: 10,
    paddingHorizontal: 10,
  },
  drawerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
    marginBottom: 6,
  },
  drawerItemActive: {
    backgroundColor: THEME.border,
  },
  drawerItemText: {
    marginLeft: 12,
    fontSize: 16,
    color: THEME.text,
    fontWeight: '600',
  },
  drawerItemTextActive: {
    color: colors.primary,
  },
  drawerFooter: {
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: THEME.border,
  },
  drawerLogout: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 12,
    paddingHorizontal: 12,
    borderRadius: 999,
  },
  drawerLogoutText: {
    marginLeft: 12,
    fontSize: 16,
    fontWeight: '700',
    color: colors.danger,
  },
});

export default Header;
