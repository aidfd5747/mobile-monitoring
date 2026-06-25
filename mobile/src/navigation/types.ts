export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  CreateReport: undefined;
  ReportHistory: undefined;
  Profile: undefined;
  CreateUser: undefined;
  ReportDetail: { report?: any; reportId?: string } | undefined;
};