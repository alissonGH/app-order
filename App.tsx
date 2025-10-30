import React from "react";
import { NavigationContainer } from "@react-navigation/native";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { createStackNavigator } from "@react-navigation/stack";
import LoginScreen from "./src/screens/LoginScreen";
import HomeScreen from "./src/screens/HomeScreen";
import Header from "./src/components/Header";
import OrderScreen from "./src/screens/OrderScreen";
import ProductScreen from "./src/screens/ProductScreen";
import { Provider } from "react-redux";
import store from "./src/auth/store";
import type { RootStackParamList } from "./src/types/navigation";

const Stack = createStackNavigator<RootStackParamList>();

export default function App() {
  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <NavigationContainer>
        <Stack.Navigator
          screenOptions={{
            header: () => <Header />,
          }}
          initialRouteName="Login"
        >
          <Stack.Screen name="Login" component={LoginScreen} />
          <Stack.Screen name="Home" component={HomeScreen} />
          <Stack.Screen name="Orders" component={OrderScreen} />
          <Stack.Screen name="Products" component={ProductScreen} />
        </Stack.Navigator>
        </NavigationContainer>
      </SafeAreaProvider>
    </Provider>
  );
}
