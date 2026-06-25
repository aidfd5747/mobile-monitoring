import {
  createContext,
  ReactNode,
  useEffect,
  useState,
} from "react";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { User } from "../types/user";

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

  const [user, setUser] =
    useState<User | null>(null);

  const [token, setToken] =
    useState<string | null>(null);

  const [loading, setLoading] =
    useState(true);

  useEffect(() => {
    restoreSession();
  }, []);

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