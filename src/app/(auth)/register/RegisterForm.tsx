"use client";

import { useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2, Lock, Mail, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { InputOTP, InputOTPGroup, InputOTPSlot } from "@/components/ui/input-otp";
import AuthLayout from "@/components/auth/AuthLayout";
import GoogleIcon from "@/components/auth/GoogleIcon";
import { safeReturnTo } from "@/lib/return-to";
import {
  loginWithPassword,
  registerUser,
  resendVerificationCode,
  startGoogleSignIn,
  verifyEmailCode,
} from "@/server/auth-actions";

export default function RegisterForm() {
  const router = useRouter();
  const params = useSearchParams();
  const returnTo = safeReturnTo(params.get("returnTo"));
  const qs = returnTo !== "/" ? "?returnTo=" + encodeURIComponent(returnTo) : "";
  // /register?verify=you@x.com opens straight on the code step. The login page
  // sends people here when they sign up but never entered their code.
  const verifyEmail = params.get("verify") ?? "";

  const [email, setEmail] = useState(verifyEmail);
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(Boolean(verifyEmail));
  const [otpCode, setOtpCode] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }
    setLoading(true);
    try {
      const res = await registerUser({ email, password, confirmPassword });
      if (res.ok) setShowOtp(true);
      else setError(res.error);
    } catch {
      setError("Registration failed. Please try again.");
    }
    setLoading(false);
  };

  const handleVerify = async () => {
    setError("");
    setNotice("");
    setLoading(true);
    try {
      const res = await verifyEmailCode({ email, code: otpCode });
      if (!res.ok) {
        setError(res.error);
        setLoading(false);
        return;
      }
      // Verified. If they just typed a password, log them straight in.
      if (password) {
        const login = await loginWithPassword({ email, password, returnTo });
        if (login.ok) {
          router.replace(login.redirectTo);
          router.refresh();
          return;
        }
      }
      router.replace("/login?verified=1" + (returnTo !== "/" ? "&returnTo=" + encodeURIComponent(returnTo) : ""));
    } catch {
      setError("Verification failed. Please try again.");
      setLoading(false);
    }
  };

  const handleResend = async () => {
    setError("");
    setNotice("");
    try {
      const res = await resendVerificationCode({ email });
      if (res.ok) setNotice("A new code is on its way. Check your email.");
      else setError(res.error);
    } catch {
      setError("Failed to resend code");
    }
  };

  if (showOtp) {
    return (
      <AuthLayout icon={Mail} title="Verify your email" subtitle={`We sent a code to ${email}`}>
        {notice && <div className="mb-4 p-3 rounded-lg bg-secondary text-foreground text-sm">{notice}</div>}
        {error && <div role="alert" className="mb-4 p-3 rounded-lg bg-destructive/10 text-destructive text-sm">{error}</div>}
        <div className="flex justify-center mb-6">
          <InputOTP maxLength={6} value={otpCode} onChange={setOtpCode} autoFocus autoComplete="one-time-code">
            <InputOTPGroup>
              <InputOTPSlot index={0} />
              <InputOTPSlot index={1} />
              <InputOTPSlot index={2} />
              <InputOTPSlot index={3} />
              <InputOTPSlot index={4} />
              <InputOTPSlot index={5} />
            </InputOTPGroup>
          </InputOTP>
        </div>
        <Button className="w-full h-12 font-medium" onClick={handleVerify} disabled={loading || otpCode.length < 6}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Verifying...
            </>
          ) : (
            "Verify"
          )}
        </Button>
        <p className="text-center text-sm text-muted-foreground mt-4">
          Didn&apos;t receive the code?{" "}
          <button type="button" onClick={handleResend} className="text-primary font-medium hover:underline">
            Resend
          </button>
        </p>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout
      icon={UserPlus}
      title="Create your account"
      subtitle="Sign up to get started"
      footer={
        <>
          Already have an account?{" "}
          <Link href={"/login" + qs} className="text-primary font-medium hover:underline">
            Log in
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
          <Label htmlFor="password">Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="password"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="pl-10 h-12"
              minLength={8}
              required
            />
          </div>
          <p className="text-xs text-muted-foreground">At least 8 characters.</p>
        </div>
        <div className="space-y-2">
          <Label htmlFor="confirm">Confirm Password</Label>
          <div className="relative">
            <Lock className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" aria-hidden="true" />
            <Input
              id="confirm"
              type="password"
              autoComplete="new-password"
              placeholder="••••••••"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="pl-10 h-12"
              required
            />
          </div>
        </div>
        <Button type="submit" className="w-full h-12 font-medium" disabled={loading}>
          {loading ? (
            <>
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
              Creating account...
            </>
          ) : (
            "Create account"
          )}
        </Button>
      </form>
    </AuthLayout>
  );
}
