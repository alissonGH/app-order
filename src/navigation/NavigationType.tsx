import { StackNavigationProp } from '@react-navigation/stack';

export type RootStackParamList = {
  Login: undefined;
  Home: undefined;
};

export type NavigationType = StackNavigationProp<RootStackParamList>;
