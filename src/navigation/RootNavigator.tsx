import React, { useEffect, useState } from "react";
import { createStackNavigator } from "@react-navigation/stack";
import { useDispatch, useSelector } from "react-redux";
import { ActivityIndicator, View } from "react-native";
import LoginScreen from "../screens/LoginScreen";
import HomeScreen from "../screens/HomeScreen";
import OrderScreen from "../screens/OrderScreen";
import ProductScreen from "../screens/ProductScreen";
import CategoryScreen from "../screens/CategoryScreen";
import Header from "../components/Header";
import { getToken, removeToken } from "../auth/tokenStorage";
import { clearToken, setToken, selectToken } from "../auth/authSlice";
import { RootStackParamList } from "../types/navigation";
import { NavigationContainer } from "@react-navigation/native";
import { API_URL } from "../config/api";
import { handleAuthErrorResponse } from "../utils/authErrorHandler";
import { fetchWithTimeout } from "../utils/fetchWithTimeout";

const Stack = createStackNavigator<RootStackParamList>();

const RootNavigator = () => {
  const token = useSelector(selectToken);
  const dispatch = useDispatch();
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const bootstrapAsync = async () => {
      try {
        const userToken = await getToken();
        if (userToken) {
          const response = await fetchWithTimeout(`${API_URL}/auth/me`, {
            headers: {
              Authorization: `Bearer ${userToken}`,
            },
            timeoutMs: 8000,
          });

          if (response.ok) {
            dispatch(setToken(userToken));
          } else {
            const handled = await handleAuthErrorResponse(response, dispatch);
            if (!handled) {
              await removeToken();
              dispatch(clearToken());
            }
          }
        } else {
          dispatch(clearToken());
        }
      } catch (e) {
        // Se o backend estiver fora / sem resposta, não podemos validar.
        // O importante aqui é não ficar em loading infinito.
        console.error("Token validation failed:", e);

        // Se existir token salvo mas a validação falhou por rede/timeout,
        // permite seguir logado (as próximas chamadas vão tratar 401 normalmente).
        const userToken = await getToken();
        if (userToken) {
          dispatch(setToken(userToken));
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
        screenOptions={({ navigation, route }) => ({
          header: () => <Header navigation={navigation} route={route} />,
        })}
      >
        {token ? (
          <>
            <Stack.Screen name="Home" component={HomeScreen} />
            <Stack.Screen name="Orders" component={OrderScreen} />
            <Stack.Screen name="Products" component={ProductScreen} />
            <Stack.Screen name="Categories" component={CategoryScreen} />
          </>
        ) : (
          <Stack.Screen
            name="Login"
            component={LoginScreen}
            options={{ headerShown: false }}
          />
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
};

export default RootNavigator;
