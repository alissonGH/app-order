import React, { useEffect, useState } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useDispatch, useSelector } from "react-redux";
import { ActivityIndicator, View } from "react-native";
import LoginScreen from "../screens/LoginScreen";
import CreateAccountScreen from "../screens/CreateAccountScreen";
import HomeScreen from "../screens/HomeScreen";
import OrderScreen from "../screens/OrderScreen";
import ProductScreen from "../screens/ProductScreen";
import CategoryScreen from "../screens/CategoryScreen";
import DeviceScreen from "../screens/DeviceScreen";
import ProfileScreen from "../screens/ProfileScreen";
import Header from "../components/Header";
import { getAuthKind, getToken, removeAuthKind, removeToken } from "../auth/tokenStorage";
import { clearToken, setAuthKind, setToken, selectAuthKind, selectToken } from "../auth/authSlice";
import { RootStackParamList } from "../types/navigation";
import { NavigationContainer } from "@react-navigation/native";
import { API_URL } from "../config/api";
import { handleAuthErrorResponse } from "../utils/authErrorHandler";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const token = useSelector(selectToken);
  const authKind = useSelector(selectAuthKind);
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const userToken = await getToken();
        const kind = await getAuthKind();
        if (userToken) {
          const effectiveKind = kind === 'device' ? 'device' : 'user';
          const validateUrl =
            effectiveKind === 'device' ? `${API_URL}/auth/token/device/valid` : `${API_URL}/auth/token/user/valid`;

          const response = await fetchWithTimeout(validateUrl, {
            method: 'POST',
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
            timeoutMs: 8000,
          });

          if (!response.ok) {
            const handled = await handleAuthErrorResponse(response, dispatch);
            if (!handled) {
              await removeToken();
              await removeAuthKind();
              dispatch(clearToken());
            }
            return;
          }

          let isValid = false;
          try {
            const contentType = response.headers.get('content-type') || '';
            if (contentType.toLowerCase().includes('application/json')) {
              isValid = Boolean(await response.json());
            } else {
              const text = (await response.text()).trim().toLowerCase();
              isValid = text === 'true';
            }
          } catch {
            isValid = false;
          }

          if (isValid) {
            dispatch(setToken(userToken));
            dispatch(setAuthKind(effectiveKind));
          } else {
            await removeToken();
            await removeAuthKind();
            dispatch(clearToken());
          }
        } else {
          dispatch(clearToken());
        }
      } catch (e) {
        const userToken = await getToken();
        const kind = await getAuthKind();
        if (userToken) {
          dispatch(setToken(userToken));
          if (kind) dispatch(setAuthKind(kind));
        } else {
          dispatch(clearToken());
        }
      } finally {
        setIsLoading(false);
      }
    };

    bootstrapAsync();
  }, [dispatch]);

  if (isLoading) {
    return (
      <View style={{ flex: 1, justifyContent: "center", alignItems: "center" }}>
        <ActivityIndicator size="large" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <Stack.Navigator
        initialRouteName={token ? (authKind === 'device' ? 'Orders' : 'Home') : 'Login'}
        screenOptions={({ navigation, route }) => ({
          header: () => <Header navigation={navigation} route={route} />,
        })}
      >
        {token ? (
          <>
            {authKind === 'device' ? (
              <Stack.Screen name="Orders" component={OrderScreen} />
            ) : (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="Orders" component={OrderScreen} />
                <Stack.Screen name="Profile" component={ProfileScreen} />
                <Stack.Screen name="Products" component={ProductScreen} />
                <Stack.Screen name="Categories" component={CategoryScreen} />
                <Stack.Screen name="Devices" component={DeviceScreen} />
              </>
            )}
          </>
        ) : (
          <>
            <Stack.Screen name="Login" component={LoginScreen} options={{ headerShown: false }} />
            <Stack.Screen name="CreateAccount" component={CreateAccountScreen} options={{ headerShown: false }} />
          </>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
