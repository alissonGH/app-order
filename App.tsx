import React, { useEffect } from "react";
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { Provider } from "react-redux";
import store from "./src/auth/store";
import RootNavigator from "./src/navigation/RootNavigator";
import { configureGoogleSignIn } from "./src/config/googleSignIn";

export default function App() {
  useEffect(() => {
    configureGoogleSignIn();
  }, []);

  return (
    <Provider store={store}>
      <SafeAreaProvider>
        <RootNavigator />
      </SafeAreaProvider>
    </Provider>
  );
}
