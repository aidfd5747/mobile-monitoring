import {
  createContext,
  ReactNode,
  useEffect,
  useState,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { User } from "../types/user";

// authContext.tsx
// Context global untuk menyimpan session autentikasi di aplikasi.
interface AuthContextType {
  user: User | null;
  token: string | null;
  loading: boolean;

  login: (
    user: User,
    token: string
  ) => Promise<void>;

  logout: () => Promise<void>;
}

// Context default yang dipakai oleh komponen lain.
export const AuthContext =
  createContext<AuthContextType>(
    {} as AuthContextType
  );

interface Props {
  children: ReactNode;
}

export function AuthProvider({
  children,
}: Props) {

  // State user yang sedang login.
  const [user, setUser] =
    useState<User | null>(null);

  // State token JWT untuk API.
  const [token, setToken] =
    useState<string | null>(null);

  // State loading saat session dipulihkan.
  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

  // Memulihkan session dari AsyncStorage saat aplikasi dimulai.
  const restoreSession =
    async () => {

      try {

        const savedUser =
          await AsyncStorage.getItem(
            "user"
          );

        const savedToken =
          await AsyncStorage.getItem(
            "token"
          );

        if (
          savedUser &&
          savedToken
        ) {

          setUser(
            JSON.parse(savedUser)
          );

          setToken(savedToken);

        }

      } catch (error) {

        console.log(error);

      } finally {

        setLoading(false);

      }
    };

  // Simpan data user dan token ke storage saat login.
  const login =
    async (
      userData: User,
      tokenData: string
    ) => {

      await AsyncStorage.setItem(
        "user",
        JSON.stringify(userData)
      );

      await AsyncStorage.setItem(
        "token",
        tokenData
      );

      setUser(userData);
      setToken(tokenData);
    };

  // Hapus session dari storage saat logout.
  const logout =
    async () => {

      await AsyncStorage.clear();

      setUser(null);
      setToken(null);
    };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        loading,
        login,
        logout,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}