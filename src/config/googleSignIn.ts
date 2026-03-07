import { GoogleSignin } from '@react-native-google-signin/google-signin';
import Constants from 'expo-constants';

const GOOGLE_CLIENT_ID = Constants.expoConfig?.extra?.googleClientId as string;

export function configureGoogleSignIn() {
  GoogleSignin.configure({
    webClientId: `${GOOGLE_CLIENT_ID}.apps.googleusercontent.com`,
    offlineAccess: false,
  });
}
