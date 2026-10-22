"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { forgotPasswordSchema, resetPasswordSchema, signInSchema, signUpSchema } from "@/lib/validation/schemas";
import { clientIp, rateLimit } from "@/lib/rate-limit";
import { isServiceRoleConfigured } from "@/lib/config/server";
import { publicEnv, isSupabaseConfigured } from "@/lib/config/public";
import { safeNextPath } from "@/lib/auth/redirects";
import { mergeGuestCart } from "@/features/cart/server";
import { logServerError, type ActionResult } from "@/lib/errors";

const TOO_MANY = "Too many attempts. Please wait a few minutes and try again.";

/** Per-IP limiter. Without a service key the limiter can't run; allow but log once per call. */
async function allowed(key: string, max: number, windowSeconds: number) {
  if (!isServiceRoleConfigured()) {
    console.warn("[auth] rate limiting disabled: SUPABASE_SECRET_KEY not configured");
    return true;
  }
  return rateLimit(`${key}:${await clientIp()}`, max, windowSeconds);
}

function notConfigured(): ActionResult {
  return { ok: false, error: "Accounts are not available yet: the store database is not connected." };
}

export async function signInAction(input: { email: string; password: string; next?: string }): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return notConfigured();
  const parsed = signInSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter your email and password." };
  if (!(await allowed("login", 10, 600))) return { ok: false, error: TOO_MANY };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) {
    // Same message for unknown email and wrong password.
    if (error?.code === "email_not_confirmed") {
      return { ok: false, error: "Please confirm your email first — check your inbox for the link." };
    }
    return { ok: false, error: "Incorrect email or password." };
  }
  try {
    await mergeGuestCart(data.user.id);
  } catch (e) {
    logServerError("auth.merge_cart", e);
  }
  redirect(safeNextPath(input.next));
}

export async function signUpAction(input: { fullName: string; email: string; password: string }): Promise<ActionResult<{ needsConfirmation: boolean }>> {
  if (!isSupabaseConfigured()) return notConfigured() as ActionResult<{ needsConfirmation: boolean }>;
  const parsed = signUpSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  if (!(await allowed("signup", 5, 3600))) return { ok: false, error: TOO_MANY };

  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.fullName },
      emailRedirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/account`,
    },
  });
  if (error) {
    if (error.code === "weak_password") return { ok: false, error: "Choose a stronger password." };
    if (error.code === "over_email_send_rate_limit") return { ok: false, error: TOO_MANY };
    logServerError("auth.signup", error);
    return { ok: false, error: "We couldn't create your account. Please try again." };
  }
  if (data.session && data.user) {
    try {
      await mergeGuestCart(data.user.id);
    } catch (e) {
      logServerError("auth.merge_cart", e);
    }
    redirect("/account");
  }
  return { ok: true, data: { needsConfirmation: true } };
}

const RESET_MESSAGE = "If an account exists for that email, a reset link is on its way.";

export async function forgotPasswordAction(input: { email: string }): Promise<ActionResult> {
  if (!isSupabaseConfigured()) return notConfigured();
  const parsed = forgotPasswordSchema.safeParse(input);
  if (!parsed.success) return { ok: false, error: "Enter a valid email address." };
  if (!(await allowed("forgot", 5, 3600))) return { ok: false, error: TOO_MANY };
  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: `${publicEnv.siteUrl}/auth/confirm?next=/reset-password`,
  });
  if (error) logServerError("auth.forgot", error);
  // Identical response either way: no account enumeration.
  return { ok: true, data: undefined, message: RESET_MESSAGE };
}

export async function resetPasswordAction(input: { password: string; confirm: string }): Promise<ActionResult> {
  const parsed = resetPasswordSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: "Please check the highlighted fields.", fieldErrors: parsed.error.flatten().fieldErrors };
  }
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims?.sub) return { ok: false, error: "Your reset link expired. Please request a new one." };
  const { error } = await supabase.auth.updateUser({ password: parsed.data.password });
  if (error) {
    if (error.code === "same_password") return { ok: false, error: "Choose a password you haven't used before." };
    if (error.code === "weak_password") return { ok: false, error: "Choose a stronger password." };
    logServerError("auth.reset", error);
    return { ok: false, error: "We couldn't update your password. Please request a new link." };
  }
  redirect("/account?password=updated");
}

export async function signOutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  redirect("/");
}
