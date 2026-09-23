import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { avatarUrl } from "@/lib/storage";
import type { Database } from "@/types/database";

type ReviewStatus = Database["public"]["Enums"]["review_status"];

export type ExperienceView = {
  id: string;
  title: string;
  organization: string;
  startDate: string;
  endDate: string | null;
  isCurrent: boolean;
  description: string | null;
};

export type ProfileCertificateView = {
  id: string;
  code: string;
  title: string;
  traineeName: string;
  issuer: string | null;
  issuedAt: string;
  hours: number | null;
};

export type ExternalCertificateView = {
  id: string;
  title: string;
  issuer: string;
  issuedOn: string;
  status: ReviewStatus;
  credentialUrl: string | null;
};

/** TRN-PRF-01 · ملفي (owner view, everything the owner can see about their professional profile). */
export type MyProfileView = {
  id: string;
  fullName: string;
  avatarPath: string | null;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  city: string | null;
  phone: string | null;
  isPublic: boolean;
  identityStatus: ReviewStatus | null;
  memberSince: string;
  showCertificates: boolean;
  showLearningRecord: boolean;
  hours: number;
  certificates: ProfileCertificateView[];
  externalCertificates: ExternalCertificateView[];
  skills: string[];
  interests: string[];
  experiences: ExperienceView[];
  completion: { done: number; total: number; missing: string[] };
};

const toExperience = (e: {
  id: string;
  title: string;
  organization: string;
  start_date: string;
  end_date: string | null;
  is_current: boolean;
  description: string | null;
}): ExperienceView => ({
  id: e.id,
  title: e.title,
  organization: e.organization,
  startDate: e.start_date,
  endDate: e.end_date,
  isCurrent: e.is_current,
  description: e.description,
});

export async function getExperiences(userId: string): Promise<ExperienceView[]> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("experiences")
    .select("id, title, organization, start_date, end_date, is_current, description")
    .eq("user_id", userId)
    .order("is_current", { ascending: false })
    .order("start_date", { ascending: false });
  if (error) throw new Error(error.message);
  return (data ?? []).map(toExperience);
}

/** Skills are derived from completed courses only (their categories) — they cannot be typed in by hand. */
async function completedSkills(userId: string): Promise<string[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("courses(programs(categories(name)))")
    .eq("trainee_id", userId)
    .eq("status", "completed");
  const names = new Set<string>();
  for (const row of data ?? []) {
    const name = row.courses?.programs?.categories?.name;
    if (name) names.add(name);
  }
  return [...names];
}

export const getMyProfile = cache(async (userId: string): Promise<MyProfileView> => {
  const supabase = await createClient();
  const [profileRes, settingsRes, certsRes, extRes, prefsRes, experiences, skills] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, avatar_path, headline, bio, city, is_public, identity_status, created_at")
      .eq("id", userId)
      .single(),
    supabase.from("account_settings").select("phone, show_certificates, show_learning_record").eq("user_id", userId).maybeSingle(),
    supabase
      .from("certificates")
      .select("id, code, course_title, trainee_name, issued_at, hours, organizations(name)")
      .eq("trainee_id", userId)
      .eq("status", "issued")
      .order("issued_at", { ascending: false }),
    supabase
      .from("external_certificates")
      .select("id, title, issuer, issued_on, status, credential_url")
      .eq("trainee_id", userId)
      .order("issued_on", { ascending: false }),
    supabase.from("trainee_preferences").select("category_ids").eq("user_id", userId).maybeSingle(),
    getExperiences(userId),
    completedSkills(userId),
  ]);
  if (profileRes.error || !profileRes.data) throw new Error(profileRes.error?.message ?? "profile_missing");
  const p = profileRes.data;

  const categoryIds = prefsRes.data?.category_ids ?? [];
  const { data: categories } = categoryIds.length
    ? await supabase.from("categories").select("id, name, position").in("id", categoryIds).order("position")
    : { data: [] as { id: string; name: string; position: number }[] };

  const certificates: ProfileCertificateView[] = (certsRes.data ?? []).map((c) => ({
    id: c.id,
    code: c.code,
    title: c.course_title,
    traineeName: c.trainee_name,
    issuer: c.organizations?.name ?? null,
    issuedAt: c.issued_at,
    hours: c.hours,
  }));

  const sections = [
    { ok: Boolean(p.headline?.trim()), label: "أضف عنوانك المهني" },
    { ok: Boolean(p.bio?.trim()), label: "اكتب نبذة عنك" },
    { ok: Boolean(p.avatar_path), label: "أضف صورتك الشخصية" },
    { ok: experiences.length > 0, label: "أضف خبرة مهنية" },
    { ok: categoryIds.length > 0, label: "اختر اهتماماتك" },
  ];

  return {
    id: p.id,
    fullName: p.full_name,
    avatarPath: p.avatar_path,
    avatarUrl: avatarUrl(p.avatar_path),
    headline: p.headline,
    bio: p.bio,
    city: p.city,
    phone: settingsRes.data?.phone ?? null,
    isPublic: p.is_public,
    identityStatus: p.identity_status,
    memberSince: p.created_at,
    showCertificates: settingsRes.data?.show_certificates ?? true,
    showLearningRecord: settingsRes.data?.show_learning_record ?? true,
    hours: certificates.reduce((sum, c) => sum + (c.hours ?? 0), 0),
    certificates,
    externalCertificates: (extRes.data ?? []).map((e) => ({
      id: e.id,
      title: e.title,
      issuer: e.issuer,
      issuedOn: e.issued_on,
      status: e.status,
      credentialUrl: e.credential_url,
    })),
    skills,
    interests: (categories ?? []).map((c) => c.name),
    experiences,
    completion: {
      done: sections.filter((s) => s.ok).length,
      total: sections.length,
      missing: sections.filter((s) => !s.ok).map((s) => s.label),
    },
  };
});

/** /u/[id] · الملف العام — built by the public_profile RPC, which applies the owner's privacy choices. */
export type PublicProfileView = {
  id: string;
  fullName: string;
  avatarUrl: string | null;
  headline: string | null;
  bio: string | null;
  city: string | null;
  isPublic: boolean;
  memberSince: string;
  verified: boolean;
  showCertificates: boolean;
  showLearningRecord: boolean;
  experiences: { title: string; organization: string; startDate: string; endDate: string | null; isCurrent: boolean }[];
  certificates: { code: string; title: string; traineeName: string; issuedAt: string; hours: number | null; issuer: string | null }[];
  certificateCount: number | null;
  hours: number | null;
  skills: string[];
};

type PublicProfileJson = {
  id: string;
  full_name: string;
  avatar_path: string | null;
  headline: string | null;
  bio: string | null;
  city: string | null;
  is_public: boolean;
  member_since: string;
  verified: boolean | null;
  show_certificates: boolean;
  show_learning_record: boolean;
  experiences: { title: string; organization: string; start_date: string; end_date: string | null; is_current: boolean }[];
  certificates: { code: string; course_title: string; trainee_name: string; issued_at: string; hours: number | null; issuer: string | null }[];
  certificate_count: number | null;
  hours: number | null;
  skills: string[];
};

export const getPublicProfile = cache(async (id: string): Promise<PublicProfileView | null> => {
  if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("public_profile", { p_user: id });
  if (error) throw new Error(error.message);
  if (!data) return null;
  const j = data as unknown as PublicProfileJson;
  return {
    id: j.id,
    fullName: j.full_name,
    avatarUrl: avatarUrl(j.avatar_path),
    headline: j.headline,
    bio: j.bio,
    city: j.city,
    isPublic: j.is_public,
    memberSince: j.member_since,
    verified: Boolean(j.verified),
    showCertificates: j.show_certificates,
    showLearningRecord: j.show_learning_record,
    experiences: j.experiences.map((e) => ({
      title: e.title,
      organization: e.organization,
      startDate: e.start_date,
      endDate: e.end_date,
      isCurrent: e.is_current,
    })),
    certificates: j.certificates.map((c) => ({
      code: c.code,
      title: c.course_title,
      traineeName: c.trainee_name,
      issuedAt: c.issued_at,
      hours: c.hours,
      issuer: c.issuer,
    })),
    certificateCount: j.certificate_count,
    hours: j.hours,
    skills: j.skills,
  };
});

/** TRN-VER-02 · the latest identity verification request (never exposes the document itself). */
export type VerificationView = {
  id: string;
  reference: string;
  documentType: "national_id" | "iqama" | "passport";
  last4: string | null;
  status: ReviewStatus;
  reviewerNote: string | null;
  submittedAt: string;
  reviewedAt: string | null;
  hasBack: boolean;
};

export async function getLatestVerification(userId: string): Promise<VerificationView | null> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("identity_verifications")
    .select("id, document_type, document_number_last4, status, reviewer_note, submitted_at, reviewed_at, document_back_path")
    .eq("user_id", userId)
    .order("submitted_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(error.message);
  if (!data) return null;
  const year = new Date(data.submitted_at).getUTCFullYear();
  return {
    id: data.id,
    reference: `VER-${year}-${data.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`,
    documentType: data.document_type as VerificationView["documentType"],
    last4: data.document_number_last4,
    status: data.status,
    reviewerNote: data.reviewer_note,
    submittedAt: data.submitted_at,
    reviewedAt: data.reviewed_at,
    hasBack: Boolean(data.document_back_path),
  };
}
