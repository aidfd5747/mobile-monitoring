export type RootStackParamList = {
  Login: undefined;
  MainTabs: undefined;
  CreateUser: undefined;
  CreateReport: { autoCamera?: boolean; report?: any; isEdit?: boolean } | undefined;
  ReportDetail: { report?: any; reportId?: string } | undefined;
};

export type MainTabParamList = {
  Dashboard: undefined;
  ReportHistory: undefined;
  Profile: undefined;
  Workers: undefined;
  PrintReports: undefined;
  ReportDetail: { report?: any; reportId?: string } | undefined;
};