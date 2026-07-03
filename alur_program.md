# Alur Program Mobile Monitoring

## Backend

### `backend/src/server.ts`
- Modul utama backend.
- Menginisialisasi Express, CORS, JSON parser, dan mendaftarkan route API.
- Route base: `/api/auth`, `/api/reports`, `/api/reports/summary`.

### `backend/src/config/firebase.ts`
- Konfigurasi Firebase Admin SDK.
- Menggunakan `GOOGLE_APPLICATION_CREDENTIALS`, `FIREBASE_SERVICE_ACCOUNT`, atau `applicationDefault()`.
- Mengekspor `firestore` untuk akses database.

### `backend/src/middleware/authMiddleware.ts`
- Middleware autentikasi JWT.
- `authMiddleware`: verifikasi token Bearer dan menambahkan data user ke `req.user`.
- `adminOnly`: membatasi route hanya untuk peran `admin`.

### `backend/src/routes/authRoutes.ts`
- Route autentikasi dan manajemen user.
- `POST /login`: login user.
- `POST /users`: buat user worker (admin saja).
- `GET /users`: daftar worker (admin saja).
- `GET /profile`: ambil profil user.
- `PATCH /profile`: perbarui profil user.
- `DELETE /users/:id`: hapus worker (admin saja).

### `backend/src/routes/reportRoutes.ts`
- Route laporan lapangan.
- `POST /`: buat laporan.
- `GET /`: ambil daftar laporan.
- `DELETE /:id`: hapus laporan (admin saja).
- `PATCH /:id/status`: perbarui status laporan (admin saja).

### `backend/src/routes/summaryRoutes.ts`
- Route ringkasan laporan.
- `GET /`: ambil ringkasan dashboard laporan.

### `backend/src/controllers/authController.ts`
- Logika controller untuk autentikasi dan user.
- `createUser`: buat akun worker baru.
- `listUsers`: ambil daftar worker.
- `deleteUser`: hapus akun worker.
- `getProfile`: ambil profil user aktif.
- `updateProfile`: perbarui username/password user aktif.
- `login`: verifikasi kredensial dan kembalikan JWT.

### `backend/src/controllers/reportController.ts`
- Logika controller laporan.
- `create`: menyimpan laporan baru ke Firestore.
- `list`: mengambil laporan, dengan filter role untuk admin vs worker.
- `delete`: menghapus laporan.
- `updateStatus`: memperbarui status laporan.

### `backend/src/controllers/summaryController.ts`
- Logika ringkasan laporan.
- `getSummary`: membuat statistik `totalReports`, `submitted`, `completed`, dan `recentReports`.

### `backend/src/services/authService.ts`
- Layanan user.
- `createUser`: buat user baru dan hash password.
- `listUsers`: ambil semua user.
- `findUserById`: cari user berdasarkan ID.
- `deleteUser`: hapus user.
- `updateUser`: perbarui username/password.
- `findUserByUsername`: cari user berdasarkan username.
- `verifyPassword`: verifikasi password dengan bcrypt.

### `backend/src/services/reportService.ts`
- Layanan laporan.
- `createReport`: unggah foto ke Supabase Storage dan simpan laporan ke Firestore.
- `getReports`: ambil laporan, optional filter per `petugasId`.
- `getCategories`: ambil daftar kategori laporan.
- `deleteReport`: hapus laporan.
- `updateReportStatus`: perbarui status laporan.

### `backend/src/types/user.ts`
- Interface tipe data `User`.

### `backend/src/scripts/createAdmin.ts` dan `backend/src/scripts/seedAdmin.ts`
- Skrip untuk membuat atau menanamkan akun admin di Firestore.

### `backend/src/routes/testRoutes.ts`
- Route pengecekan koneksi Firestore.

## Mobile (Frontend)

### `mobile/App.tsx`
- Root aplikasi React Native.
- Menyediakan `AuthProvider` dan `AppNavigator`.

### `mobile/index.ts`
- Entry point Expo untuk mendaftarkan root component.

### `mobile/src/services/api.ts`
- Konfigurasi Axios untuk panggilan API.
- Menambahkan token Authorization dari `AsyncStorage`.
- Interceptor untuk logging request/response.

### `mobile/src/context/authContext.tsx`
- State global autentikasi.
- `AuthProvider`: menyimpan `user`, `token`, `loading`.
- `login`: menyimpan user dan token ke `AsyncStorage`.
- `logout`: membersihkan session.
- `restoreSession`: memulihkan session dari storage saat app dimulai.

### `mobile/src/hooks/useLocation.ts`
- Hook custom untuk membaca lokasi GPS.
- Meminta izin lokasi dan mengembalikan `location`, `error`, dan `loading`.

### `mobile/src/navigation/appNavigator.tsx`
- Menentukan navigasi stack utama.
- Menampilkan `LoginScreen` jika belum login.
- Setelah login, menampilkan `MainTabs` dan `ReportDetail`.

### `mobile/src/navigation/mainTabs.tsx`
- Navigasi tab utama.
- Tab default: `Dashboard`, `ReportHistory`, `Profile`.
- Tab admin: `CreateUser`, `Workers`, `PrintReports`.
- Tab worker: `CreateReport`.

### `mobile/src/navigation/types.ts`
- Tipe parameter navigasi.

### `mobile/src/types/user.ts`
- Interface `User` pengguna.

### `mobile/src/types/report.ts`
- Interface `Report` laporan.

### `mobile/src/components/AppCard.tsx`
- Komponen kartu sederhana untuk menampilkan ringkasan data.

### `mobile/src/screens/auth/loginScreen.tsx`
- Layar login.
- Mengirim data login ke `/auth/login`.
- Menyimpan session user setelah berhasil login.

### `mobile/src/screens/loadingScreen.tsx`
- Layar loading sederhana saat aplikasi memulihkan session atau data.

### `mobile/src/screens/dashboard/dashboardScreen.tsx`
- Tampilan dashboard untuk worker dan admin.
- Menampilkan greeting dan ringkasan singkat.

### `mobile/src/screens/dashboard/adminDashboardScreen.tsx`
- Dashboard khusus admin.
- Menampilkan statistik laporan dan daftar laporan terbaru.
- Mengambil data dari `/reports/summary`.

### `mobile/src/screens/report/createReportScreen.tsx`
- Form laporan kegiatan.
- Mengambil foto dari kamera atau galeri.
- Mengambil lokasi GPS.
- Mengirim laporan ke `/reports`.

### `mobile/src/screens/report/reportHistoryScreen.tsx`
- Menampilkan daftar laporan.
- Admin dapat menghapus laporan.
- Menampilkan loading animasi dan daftar laporan terfilter.

### `mobile/src/screens/report/reportDetailScreen.tsx`
- Menampilkan detail laporan.
- Admin dapat menandai laporan sebagai selesai.

### `mobile/src/screens/report/printReportsScreen.tsx`
- Menampilkan daftar laporan untuk dicetak.
- Memilih laporan dan membuat PDF dengan `expo-print`.

### `mobile/src/screens/admin/createUserScreen.tsx`
- Form admin untuk membuat akun worker baru.
- Mengirim data ke `/auth/users`.

### `mobile/src/screens/admin/workerListScreen.tsx`
- Menampilkan daftar worker.
- Admin dapat menghapus akun worker.

### `mobile/src/screens/profile/profileScreen.tsx`
- Menampilkan profil user.
- Worker dapat memperbarui username/password.

## Alur Umum

1. Frontend login via `mobile/src/screens/auth/loginScreen.tsx`.
2. Backend `/api/auth/login` memverifikasi kredensial dan mengembalikan JWT.
3. Frontend menyimpan `user` dan `token` di `AuthContext` dan `AsyncStorage`.
4. Akses halaman worker/admin diatur oleh `mobile/src/navigation/appNavigator.tsx` dan `mobile/src/navigation/mainTabs.tsx`.
5. Worker dapat kirim laporan di `mobile/src/screens/report/createReportScreen.tsx`.
6. Backend `ReportService` unggah foto ke Supabase Storage lalu simpan data ke Firestore.
7. Admin melihat ringkasan di `mobile/src/screens/dashboard/adminDashboardScreen.tsx`.
8. Worker/admin lihat riwayat dan detail laporan di `mobile/src/screens/report/reportHistoryScreen.tsx` dan `mobile/src/screens/report/reportDetailScreen.tsx`.
9. Admin dapat membuat akun worker di `mobile/src/screens/admin/createUserScreen.tsx` dan menghapus worker di `mobile/src/screens/admin/workerListScreen.tsx`.
10. Admin dapat mencetak laporan di `mobile/src/screens/report/printReportsScreen.tsx`.
