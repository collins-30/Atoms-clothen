"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, LogIn, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { safeReturnTo } from "@/lib/return-to";
import { loginWithPassword, startGoogleSignIn } from "@/server/auth-actions";

export default function LoginForm() {
  const router = useRouter();
  const params = useSearchParams();
  // Post-login destination (set by /checkout, /account, /admin redirects).
  const returnTo = safeReturnTo(params.get("returnTo"));
  const qs = returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(
    // Auth.js sends people back here with ?error=... when Google sign-in fails.
    params.get("error") ? "Sign-in didn't work. Please try again, or use your email and password." : "",
  );
  const [loading, setLoading] = useState(false);

  const notice = params.get("reset")
    ? "Your password was updated. Log in with the new one."
    : params.get("verified")
      ? "Your email is verified. Log in to continue."
      : "";

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      const res = await loginWithPassword({ email, password, returnTo });
      if (res.ok) {
        router.replace(res.redirectTo);
        router.refresh(); // so the header and every server component see the new session
        return;
      }
      if (res.unverified) {
        const q = new URLSearchParams({ verify: email });
        if (returnTo !== "/") q.set("returnTo", returnTo);
        router.push(`/register?${q.toString()}`);
        return;
      }
      setError(res.error);
    } catch {
      setError("Something went wrong. Please try again.");
    }
    setLoading(false);
  };

  return (
    <AuthLayout
      icon={LogIn}
      title="Welcome back"
      subtitle="Log in to your account"
      footer={
        <>
          Don&apos;t have an account?{" "}
          <Link href={"/register" + qs} className="text-primary font-medium hover:underline">
            Create one
          </Link>
        </>
      }
    >
      <form action={startGoogleSignIn.bind(null, returnTo)}>
        <Button type="submit" variant="outline" className="w-full h-12 text-sm font-medium mb-6">
          <GoogleIcon className="w-5 h-5 mr-2" />
          Continue with Google
        </Button>
      </form>

      <div className="relative mb-6">
        <div className="absolute inset-0 flex items-center">
          <div className="w-full border-t border-border" />
        </div>
        <div className="relative flex justify-center text-xs uppercase">
          <span className="bg-card px-3 text-muted-foreground">or</span>
        </div>
      </div>

      {notice && <div className="mb-4 p-3 rounded-lg bg-secondary text-foreground text-sm">{notice}</div>}
      {error && <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="email">Email</Label>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="email"
              type="email"
              autoComplete="email"
              autoFocus
              placeholder="you@example.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <Label htmlFor="password">Password</Label>
            <Link href="/forgot-password" className="text-xs text-primary hover:underline">
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Logging in...
            </>
          ) : (
            "Log in"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
