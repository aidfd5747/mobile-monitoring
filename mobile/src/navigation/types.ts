export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  CreateUser: undefined;
  ReportDetail: { report?: any; reportId?: string } | undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  CreateReport: undefined;
  ReportHistory: undefined;
  Profile: undefined;
  Workers: undefined;
  PrintReports: undefined;
  ReportDetail: { report?: any; reportId?: string } | undefined;
};