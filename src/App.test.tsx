import type { ReactNode } from "react";
import { renderToString } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";
import { App } from "./App";

const { useAuth, location } = vi.hoisted(() => ({
  useAuth: vi.fn(),
  location: { path: "/reset-password" },
}));

vi.mock("./context/AuthContext", () => ({
  AuthProvider: ({ children }: { children: ReactNode }) => children,
  useAuth,
}));

vi.mock("react-router-dom", async (importOriginal) => {
  const router = await importOriginal<typeof import("react-router-dom")>();
  return {
    ...router,
    BrowserRouter: ({ children }: { children: ReactNode }) => (
      <router.MemoryRouter initialEntries={[location.path]}>{children}</router.MemoryRouter>
    ),
    Navigate: ({ to }: { to: string }) => <span data-redirect={to} />,
  };
});

describe("password recovery route", () => {
  it.each(["admin", "client"])("shows the new password form for a %s recovery session", (role) => {
    useAuth.mockReturnValue({
      user: { id: "recovering-user" },
      profile: { role },
      loading: false,
      authLoading: false,
      isPasswordRecovery: true,
    });

    expect(renderToString(<App />)).toContain("New password");
  });

  it("prompts for a fresh link when there is no recovery session", () => {
    useAuth.mockReturnValue({ user: null, loading: false, authLoading: false, isPasswordRecovery: false });

    expect(renderToString(<App />)).toContain("Request a new reset link");
  });

  it.each([
    ["/", true],
    ["/#error_code=otp_expired", false],
  ])("redirects %s to the recovery screen", (path, isPasswordRecovery) => {
    location.path = path;
    useAuth.mockReturnValue({ authLoading: false, isPasswordRecovery });

    expect(renderToString(<App />)).toContain('data-redirect="/reset-password"');
  });
});

describe("borrower registration", () => {
  it("offers account creation on the sign-in screen", () => {
    location.path = "/login";
    useAuth.mockReturnValue({ user: null, loading: false, isPasswordRecovery: false });

    const html = renderToString(<App />);
    expect(html).toContain('href="/signup"');
    expect(html).toContain("Email or phone number");
  });

  it("shows the borrower registration form without a role selector", () => {
    location.path = "/signup";
    useAuth.mockReturnValue({ user: null, loading: false, isPasswordRecovery: false });

    const html = renderToString(<App />);
    expect(html).toContain("Create a borrower account");
    expect(html).toContain("Full name");
    expect(html).toContain("Phone number");
    expect(html).toContain('autoComplete="tel"');
    expect(html).toContain('autoComplete="new-password"');
    expect(html).not.toContain("<select");
  });

  it("keeps password reset requests email-only", () => {
    location.path = "/login?reset=1";
    useAuth.mockReturnValue({ user: null, loading: false, isPasswordRecovery: false });

    const html = renderToString(<App />);
    expect(html).toContain("Email address");
    expect(html).toContain('type="email"');
    expect(html).not.toContain("Email or phone number");
  });
});
