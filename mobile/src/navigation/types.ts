export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  ReportDetail: { report?: any; reportId?: string } | undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  CreateReport: undefined;
  ReportHistory: undefined;
  Profile: undefined;
  CreateUser: undefined;
  PrintReports: undefined;
  ReportDetail: { report?: any; reportId?: string } | undefined;
};