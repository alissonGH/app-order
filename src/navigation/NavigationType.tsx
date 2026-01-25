import { StackNavigationProp } from '@react-navigation/stack';

export type RootStackParamList = {
  Login: undefined;
  CreateAccount: undefined;
  Home: undefined;
  Orders: undefined;
  Products: undefined;
  Categories: undefined;
  Devices: undefined;
  Profile: undefined;
};

export type NavigationType = StackNavigationProp<RootStackParamList>;
