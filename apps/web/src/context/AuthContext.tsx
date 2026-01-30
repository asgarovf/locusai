"use client";

import { type User, type Workspace } from "@locusai/shared";
import { useRouter } from "next/navigation";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";
import { locusClient, setClientToken } from "@/lib/api-client";

interface AuthContextType {
  user: User | null;
  workspaces: Workspace[];
  isLoading: boolean;
  isAuthenticated: boolean;
  login: (token: string, user: User) => Promise<void>;
  logout: () => void;
  refreshUser: () => Promise<void>;
  switchWorkspace: (workspaceId: string) => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const router = useRouter();

  const switchWorkspace = useCallback((workspaceId: string) => {
    localStorage.setItem("lastWorkspaceId", workspaceId);
    setUser((prev) => (prev ? { ...prev, workspaceId } : null));
  }, []);

  const refreshUser = useCallback(async () => {
    try {
      // Check if token exists first - skip API call if not
      const token =
        typeof window !== "undefined"
          ? localStorage.getItem("locus_token")
          : null;

      if (!token) {
        // No token stored, immediately set loading to false
        // Layout will redirect to login
        setIsLoading(false);
        return;
      }

      const userData = await locusClient.auth.getProfile();
      const workspacesData = await locusClient.workspaces.listAll();

      const storedWorkspaceId = localStorage.getItem("lastWorkspaceId");
      let effectiveWorkspaceId = storedWorkspaceId || userData.workspaceId;

      // Validation: Ensure current workspaceId is valid
      if (workspacesData.length > 0) {
        const isValid = workspacesData.some(
          (w) => w.id === effectiveWorkspaceId
        );
        if (!isValid) {
          effectiveWorkspaceId = workspacesData[0].id;
        }
      }

      // Update localStorage with the verified effective ID
      if (effectiveWorkspaceId) {
        localStorage.setItem("lastWorkspaceId", String(effectiveWorkspaceId));
      }

      setUser({
        ...userData,
        workspaceId: effectiveWorkspaceId
          ? String(effectiveWorkspaceId)
          : undefined,
      });
      setWorkspaces(workspacesData);
    } catch (error) {
      console.error("Failed to fetch user:", error);
      setClientToken(null);
      setUser(null);
      setWorkspaces([]);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    refreshUser();
  }, [refreshUser]);

  const login = async (token: string, userData: User) => {
    setClientToken(token);
    setUser(userData);

    if (userData.workspaceId) {
      localStorage.setItem("lastWorkspaceId", userData.workspaceId);
    }

    // Fetch workspaces to ensure they're loaded before navigation
    await refreshUser();

    // If user doesn't have a workspace, redirect to create one
    if (!userData.workspaceId) {
      router.push("/onboarding/workspace");
    } else {
      router.push("/");
    }
  };

  const logout = () => {
    setClientToken(null);
    setUser(null);
    router.push("/login");
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        workspaces,
        isLoading,
        isAuthenticated: !!user,
        login,
        logout,
        refreshUser,
        switchWorkspace,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context;
}

export function useSafeAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider");
  }
  return context as AuthContextType & {
    user: User;
  };
}
