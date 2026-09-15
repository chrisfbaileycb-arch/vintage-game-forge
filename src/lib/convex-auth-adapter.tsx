import React from "react";

const AUTH_EVENT = "foundry:convex-auth-change";

export function ConvexAuthProvider({ children }: { children: React.ReactNode; client?: any }) {
  return <>{children}</>;
}

export function useAuthActions() {
  return {
    signIn: async (provider: string, formData?: any) => {
      let email = "maker@cartridge.foundry";
      let name = "Foundry Master";

      if (formData instanceof FormData) {
        const inputEmail = formData.get("email");
        if (typeof inputEmail === "string" && inputEmail.trim()) {
          email = inputEmail.trim();
          name = email.split("@")[0] || "Foundry Master";
        }
      }

      const user = {
        _id: "user-" + (provider === "anonymous" ? "guest" : "maker"),
        _creationTime: Date.now(),
        name: provider === "anonymous" ? "Guest Maker" : name,
        email: provider === "anonymous" ? "guest@cartridge.foundry" : email,
        role: "admin" as const,
        isAnonymous: provider === "anonymous",
      };

      try {
        localStorage.setItem("foundry.user", JSON.stringify(user));
        window.dispatchEvent(new CustomEvent(AUTH_EVENT));
      } catch {
        // Ignore
      }

      return { signingIn: false };
    },

    signOut: async () => {
      try {
        localStorage.setItem("foundry.user", "guest");
        window.dispatchEvent(new CustomEvent(AUTH_EVENT));
      } catch {
        // Ignore
      }
    },
  };
}
