export type RootStackParamList = {
  Login: undefined;
  ForgotPassword: undefined;
  ValidateResetCode: { email: string };
  ResetPassword: { email: string; token: string };
  CreateAccount: undefined;
  Home: undefined;
  Orders: undefined;
  Products: undefined;
  Categories: undefined;
  Devices: undefined;
  Profile: undefined;
};