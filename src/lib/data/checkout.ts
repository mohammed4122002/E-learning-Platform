import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { CourseMode, EnrollmentStatus } from "@/types/views";

export type CheckoutCourse = {
  id: string;
  slug: string;
  code: string;
  title: string;
  programTitle: string;
  mode: CourseMode;
  status: string;
  startsAt: string | null;
  endsAt: string | null;
  firstSession: { startsAt: string; endsAt: string } | null;
  city: string | null;
  venue: string | null;
  trainerName: string;
  organizationName: string | null;
  requiresProviderApproval: boolean;
  requirements: string[];
  capacity: number | null;
  seatsLeft: number | null;
  price: number;
  currency: string;
};

export type Quote = { listPrice: number; discount: number; subtotal: number; vat: number; total: number; currency: string; codeStatus: "none" | "applied" | "invalid" };

export type Buyer = { fullName: string; email: string; phone: string | null; verified: boolean };

type Snapshot = { requirements?: string[] };

const COURSE_SELECT =
  "id, slug, title, mode, status, starts_at, ends_at, city, venue, capacity, price, currency, requires_provider_approval, created_at, programs(title), program_versions(snapshot), trainer:profiles!courses_trainer_id_fkey(full_name), organizations(name)" as const;

type CourseRow = {
  id: string;
  slug: string;
  title: string;
  mode: CourseMode;
  status: string;
  starts_at: string | null;
  ends_at: string | null;
  city: string | null;
  venue: string | null;
  capacity: number | null;
  price: number;
  currency: string;
  requires_provider_approval: boolean;
  created_at: string;
  programs: { title: string } | null;
  program_versions: { snapshot: Snapshot } | null;
  trainer: { full_name: string } | null;
  organizations: { name: string } | null;
};

/** Human course reference shown in the details card ("معرّف الدورة"): CRS-<year>-<first 4 hex of id>. */
function courseCode(row: { id: string; created_at: string }) {
  return `CRS-${new Date(row.created_at).getUTCFullYear()}-${row.id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

async function mapCourse(row: CourseRow): Promise<CheckoutCourse> {
  const supabase = await createClient();
  const [sessions, seats] = await Promise.all([
    supabase.from("course_sessions").select("starts_at, ends_at").eq("course_id", row.id).neq("status", "cancelled").order("starts_at").limit(1),
    supabase.rpc("course_seats_left", { p_course: row.id }),
  ]);
  const first = sessions.data?.[0];
  return {
    id: row.id,
    slug: row.slug,
    code: courseCode(row),
    title: row.title,
    programTitle: row.programs?.title ?? row.title,
    mode: row.mode,
    status: row.status,
    startsAt: row.starts_at,
    endsAt: row.ends_at,
    firstSession: first ? { startsAt: first.starts_at, endsAt: first.ends_at } : null,
    city: row.city,
    venue: row.venue,
    trainerName: row.trainer?.full_name ?? "",
    organizationName: row.organizations?.name ?? null,
    requiresProviderApproval: row.requires_provider_approval,
    requirements: row.program_versions?.snapshot?.requirements ?? [],
    capacity: row.capacity,
    seatsLeft: typeof seats.data === "number" ? seats.data : null,
    price: Number(row.price),
    currency: row.currency,
  };
}

export async function getCheckoutCourse(slug: string): Promise<CheckoutCourse | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("courses").select(COURSE_SELECT).eq("slug", slug).neq("status", "draft").maybeSingle();
  return data ? mapCourse(data as unknown as CourseRow) : null;
}

export async function getQuote(courseId: string, code: string | null): Promise<Quote | null> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("quote_enrollment", { p_course: courseId, p_code: code ?? undefined });
  const q = data?.[0];
  if (error || !q) return null;
  return {
    listPrice: Number(q.list_price),
    discount: Number(q.discount),
    subtotal: Number(q.subtotal),
    vat: Number(q.vat),
    total: Number(q.total),
    currency: q.currency,
    codeStatus: q.code_status as Quote["codeStatus"],
  };
}

export async function getBuyer(userId: string, email: string): Promise<Buyer> {
  const supabase = await createClient();
  const [{ data: profile }, { data: settings }] = await Promise.all([
    supabase.from("profiles").select("full_name, identity_status").eq("id", userId).maybeSingle(),
    supabase.from("account_settings").select("phone").eq("user_id", userId).maybeSingle(),
  ]);
  return { fullName: profile?.full_name ?? "", email, phone: settings?.phone ?? null, verified: profile?.identity_status === "verified" };
}

export async function getActiveEnrollment(courseId: string, userId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("enrollments")
    .select("id, status")
    .eq("course_id", courseId)
    .eq("trainee_id", userId)
    .not("status", "in", "(withdrawn,cancelled,access_revoked)")
    .maybeSingle();
  return data as { id: string; status: EnrollmentStatus } | null;
}

export type Order = {
  id: string;
  status: EnrollmentStatus;
  holdExpiresAt: string | null;
  listPrice: number;
  pricePaid: number;
  vat: number;
  currency: string;
  discountCode: string | null;
  course: CheckoutCourse;
  payment: { id: string; status: string; method: string; failureReason: string | null; createdAt: string } | null;
  receipt: { id: string; number: string } | null;
};

/** An enrollment of the signed-in user with its latest payment (RLS: own rows only). */
export async function getOrder(enrollmentId: string): Promise<Order | null> {
  const supabase = await createClient();
  const { data: e } = await supabase
    .from("enrollments")
    .select(`id, status, hold_expires_at, list_price, price_paid, vat_amount, currency, discount_codes(code), courses(${COURSE_SELECT})`)
    .eq("id", enrollmentId)
    .maybeSingle();
  if (!e || !e.courses) return null;
  const { data: payments } = await supabase
    .from("payments")
    .select("id, status, method, failure_reason, created_at, receipts(id, number)")
    .eq("enrollment_id", e.id)
    .order("created_at", { ascending: false })
    .limit(1);
  const p = payments?.[0];
  const receipt = p?.receipts ? (Array.isArray(p.receipts) ? p.receipts[0] : p.receipts) : null;
  return {
    id: e.id,
    status: e.status,
    holdExpiresAt: e.hold_expires_at,
    listPrice: Number(e.list_price),
    pricePaid: Number(e.price_paid),
    vat: Number(e.vat_amount),
    currency: e.currency,
    discountCode: (e.discount_codes as { code: string } | null)?.code ?? null,
    course: await mapCourse(e.courses as unknown as CourseRow),
    payment: p ? { id: p.id, status: p.status, method: p.method, failureReason: p.failure_reason, createdAt: p.created_at } : null,
    receipt: receipt ? { id: receipt.id, number: receipt.number } : null,
  };
}
