export interface User {
  id?: string;
  nama: string;
  username: string;
  password: string;
  role: "admin" | "petugas";
  createdAt: Date;
}