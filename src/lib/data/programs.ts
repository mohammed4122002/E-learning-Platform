import "server-only";
import { createClient } from "@/lib/supabase/server";
import { COURSE_CARD_SELECT, toCatalogCard, type CourseCardRow } from "@/lib/data/courses";
import { avatarUrl, coverUrl } from "@/lib/storage";
import { formatMonthYear, pluralAr } from "@/lib/format";
import type { CourseCardView, CourseLevel, CourseMode, CoverCrop, EnrollmentStatus } from "@/types/views";

/*
 * TRN-DSC-02 صفحة البرنامج · TRN-DSC-03 قائمة دورات البرنامج.
 * A program is the stable offer; its courses are dated runs bound to a frozen program_versions snapshot (BR-L1).
 */

type Snapshot = {
  objectives: string[];
  audience: string[];
  requirements: string[];
  skills: string[];
};

function strings(v: unknown): string[] {
  return Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim().length > 0) : [];
}
function readSnapshot(raw: unknown): Snapshot {
  const o = raw && typeof raw === "object" ? (raw as Record<string, unknown>) : {};
  return { objectives: strings(o.objectives), audience: strings(o.audience), requirements: strings(o.requirements), skills: strings(o.skills) };
}
function isCrop(v: unknown): v is CoverCrop {
  return !!v && typeof v === "object" && ["top", "left", "width", "height"].every((k) => typeof (v as Record<string, unknown>)[k] === "number");
}

/** Display reference shown in the Figma frames (e.g. "PRG-2026-0148"). */
function reference(prefix: "PRG" | "CRS", id: string, createdAt: string): string {
  return `${prefix}-${createdAt.slice(0, 4)}-${id.replace(/-/g, "").slice(0, 4).toUpperCase()}`;
}

/** Refund copy used on the program page and comparison (matches the sale-page policy per mode). */
export function refundPolicy(mode: CourseMode): { short: string; long: string } {
  return mode === "recorded"
    ? { short: "١٤ يومًا", long: "استرداد كامل خلال ١٤ يومًا من الشراء." }
    : { short: "٧ أيام", long: "استرداد كامل حتى ٧ أيام قبل بدء الدورة." };
}

const PROGRAM_SELECT =
  "id, slug, title, summary, level, status, current_version, created_at, owner_id, organization_id, category:categories(id, slug, name), owner:profiles!programs_owner_id_fkey(id, full_name, avatar_path, headline, bio, identity_status), organizations(id, name, logo_path, verification_status)" as const;

type ProgramRow = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: CourseLevel;
  status: string;
  current_version: number;
  created_at: string;
  owner_id: string;
  organization_id: string | null;
  category: { id: string; slug: string; name: string } | null;
  owner: { id: string; full_name: string; avatar_path: string | null; headline: string | null; bio: string | null; identity_status: string | null } | null;
  organizations: { id: string; name: string; logo_path: string | null; verification_status: string } | null;
};

const RUN_SELECT =
  "id, slug, title, mode, level, status, city, venue, starts_at, ends_at, duration_hours, capacity, price, currency, cover_path, cover_crop, rating_avg, rating_count, learners_count, created_at, trainer:profiles!courses_trainer_id_fkey(full_name)" as const;

type RunRow = {
  id: string;
  slug: string;
  title: string;
  mode: CourseMode;
  level: CourseLevel;
  status: string;
  city: string | null;
  venue: string | null;
  starts_at: string | null;
  ends_at: string | null;
  duration_hours: number | null;
  capacity: number | null;
  price: number;
  currency: string;
  cover_path: string | null;
  cover_crop: unknown;
  rating_avg: number;
  rating_count: number;
  learners_count: number;
  created_at: string;
  trainer: { full_name: string } | null;
};

type Supabase = Awaited<ReturnType<typeof createClient>>;

async function loadProgram(supabase: Supabase, slug: string): Promise<ProgramRow | null> {
  if (!/^[a-z0-9-]{2,120}$/.test(slug)) return null;
  const { data, error } = await supabase.from("programs").select(PROGRAM_SELECT).eq("slug", slug).eq("status", "published").maybeSingle();
  if (error) throw new Error(`program: ${error.message}`);
  return data as unknown as ProgramRow | null;
}

export type ProgramRating = {
  count: number;
  average: number;
  content: number;
  trainer: number;
  organization: number | null;
  reviews: { id: string; name: string; avatar: string | null; stars: number; comment: string; createdAt: string }[];
};

export type ProgramView = {
  id: string;
  slug: string;
  title: string;
  summary: string | null;
  level: CourseLevel;
  reference: string;
  category: { slug: string; name: string } | null;
  cover: { src: string | null; crop: CoverCrop | null };
  mode: CourseMode;
  hours: number | null;
  learners: number;
  verifiedProvider: boolean;
  mostEnrolled: boolean;
  provider: { kind: "provider" | "independent"; name: string; avatar: string | null; meta: string };
  trainer: { name: string; avatar: string | null; headline: string | null; bio: string | null; verified: boolean; rating: number | null; courses: number } | null;
  snapshot: Snapshot;
  priceFrom: { amount: number; currency: string } | null;
  nextRun: { courseId: string; slug: string; startsAt: string | null; place: string; mode: CourseMode } | null;
  openRuns: number;
  refund: string;
  rating: ProgramRating;
  outline: { title: string; lessons: number; minutes: number }[];
  favorite: { courseId: string; saved: boolean } | null;
};

function place(run: Pick<RunRow, "mode" | "city" | "venue">): string {
  if (run.mode === "in_person") return [run.city, run.venue].filter(Boolean).join(" · ") || "حضوري";
  return run.mode === "live_remote" ? "عن بُعد · جلسات مباشرة" : "مسجَّلة · وصول دائم";
}

export async function getProgram(slug: string, userId: string): Promise<ProgramView | null> {
  const supabase = await createClient();
  const program = await loadProgram(supabase, slug);
  if (!program) return null;

  const [versionRes, runsRes] = await Promise.all([
    supabase.from("program_versions").select("snapshot").eq("program_id", program.id).eq("version", program.current_version).maybeSingle(),
    supabase.from("courses").select(RUN_SELECT).eq("program_id", program.id).neq("status", "draft").order("starts_at", { ascending: true, nullsFirst: false }),
  ]);
  if (runsRes.error) throw new Error(`program runs: ${runsRes.error.message}`);
  const runs = (runsRes.data ?? []) as unknown as RunRow[];
  const open = runs.filter((r) => r.status === "open");
  const now = Date.now();
  const upcoming = open.filter((r) => !r.starts_at || new Date(r.starts_at).getTime() > now);
  const next = upcoming[0] ?? open[0] ?? null;
  const showcase = next ?? runs[0] ?? null;
  const runIds = runs.map((r) => r.id);

  const [ratingsRes, trainerRunsRes, providerCountRes, favRes, outlineRes, topRes] = await Promise.all([
    runIds.length
      ? supabase
          .from("course_ratings")
          .select("id, content_score, trainer_score, organization_score, comment, created_at, trainee:profiles!course_ratings_trainee_id_fkey(full_name, avatar_path)")
          .in("course_id", runIds)
          .order("created_at", { ascending: false })
          .limit(200)
      : Promise.resolve({ data: [], error: null }),
    program.owner ? supabase.from("courses").select("rating_avg, rating_count").eq("trainer_id", program.owner.id).neq("status", "draft") : Promise.resolve({ data: [], error: null }),
    program.organization_id
      ? supabase.from("programs").select("id", { count: "exact", head: true }).eq("organization_id", program.organization_id).eq("status", "published")
      : supabase.from("programs").select("id", { count: "exact", head: true }).eq("owner_id", program.owner_id).eq("status", "published"),
    open.length ? supabase.from("favorites").select("course_id").eq("user_id", userId).in("course_id", open.map((r) => r.id)) : Promise.resolve({ data: [], error: null }),
    showcase ? supabase.rpc("course_outline", { p_course: showcase.id }) : Promise.resolve({ data: [], error: null }),
    program.category
      ? supabase.from("courses").select("program_id, learners_count, programs!inner(category_id)").eq("programs.category_id", program.category.id).neq("status", "draft").order("learners_count", { ascending: false }).limit(1)
      : Promise.resolve({ data: [], error: null }),
  ]);

  const ratings = (ratingsRes.data ?? []) as unknown as {
    id: string;
    content_score: number;
    trainer_score: number;
    organization_score: number | null;
    comment: string | null;
    created_at: string;
    trainee: { full_name: string; avatar_path: string | null } | null;
  }[];
  const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
  const orgScores = ratings.map((r) => r.organization_score).filter((x): x is number => x !== null);
  const perRating = ratings.map((r) => (r.content_score + r.trainer_score + (r.organization_score ?? r.trainer_score)) / 3);

  const trainerRuns = (trainerRunsRes.data ?? []) as { rating_avg: number; rating_count: number }[];
  const trainerCount = trainerRuns.reduce((a, r) => a + r.rating_count, 0);
  const trainerRating = trainerCount ? trainerRuns.reduce((a, r) => a + Number(r.rating_avg) * r.rating_count, 0) / trainerCount : null;

  const learners = runs.reduce((a, r) => a + r.learners_count, 0);
  const top = (topRes.data ?? []) as unknown as { program_id: string; learners_count: number }[];
  const saved = new Set(((favRes.data ?? []) as { course_id: string }[]).map((f) => f.course_id));
  const outlineRows = (outlineRes.data ?? []) as { module_id: string; module_title: string; lesson_id: string | null; duration_seconds: number | null }[];
  const modules = new Map<string, { title: string; lessons: number; minutes: number }>();
  for (const row of outlineRows) {
    const m = modules.get(row.module_id) ?? { title: row.module_title, lessons: 0, minutes: 0 };
    if (row.lesson_id) {
      m.lessons += 1;
      m.minutes += Math.round((row.duration_seconds ?? 0) / 60);
    }
    modules.set(row.module_id, m);
  }

  const prices = open.map((r) => Number(r.price));
  const cheapest = open.length ? open[prices.indexOf(Math.min(...prices))] : null;
  const verifiedOrg = program.organizations?.verification_status === "verified";
  const providerCount = providerCountRes.count ?? 0;
  const ownerName = program.owner?.full_name || "مدرب مستقل";
  const published = `${pluralAr(providerCount, ["برنامج واحد منشور", "برنامجان منشوران", "برامج منشورة", "برنامجًا منشورًا"])}`;

  return {
    id: program.id,
    slug: program.slug,
    title: program.title,
    summary: program.summary,
    level: program.level,
    reference: reference("PRG", program.id, program.created_at),
    category: program.category ? { slug: program.category.slug, name: program.category.name } : null,
    cover: showcase ? { src: coverUrl(showcase.cover_path), crop: isCrop(showcase.cover_crop) ? showcase.cover_crop : null } : { src: null, crop: null },
    mode: showcase?.mode ?? "in_person",
    hours: showcase?.duration_hours === null || showcase?.duration_hours === undefined ? null : Number(showcase.duration_hours),
    learners,
    verifiedProvider: verifiedOrg,
    mostEnrolled: learners > 0 && top[0]?.program_id === program.id,
    provider: program.organizations
      ? {
          kind: "provider",
          name: program.organizations.name,
          avatar: null,
          meta: `${verifiedOrg ? "جهة تدريبية موثَّقة" : "جهة تدريبية"} · ${published}`,
        }
      : { kind: "independent", name: ownerName, avatar: avatarUrl(program.owner?.avatar_path), meta: `مدرب مستقل · ${published}` },
    trainer: program.owner
      ? {
          name: ownerName,
          avatar: avatarUrl(program.owner.avatar_path),
          headline: program.owner.headline,
          bio: program.owner.bio,
          verified: program.owner.identity_status === "verified",
          rating: trainerRating,
          courses: trainerRuns.length,
        }
      : null,
    snapshot: readSnapshot(versionRes.data?.snapshot),
    priceFrom: cheapest ? { amount: Number(cheapest.price), currency: cheapest.currency } : null,
    nextRun: next ? { courseId: next.id, slug: next.slug, startsAt: next.starts_at, place: place(next), mode: next.mode } : null,
    openRuns: open.length,
    refund: refundPolicy(next?.mode ?? showcase?.mode ?? "in_person").long,
    rating: {
      count: ratings.length,
      average: avg(perRating),
      content: avg(ratings.map((r) => r.content_score)),
      trainer: avg(ratings.map((r) => r.trainer_score)),
      organization: orgScores.length ? avg(orgScores) : null,
      reviews: ratings
        .filter((r) => r.comment && r.comment.trim())
        .slice(0, 3)
        .map((r) => ({
          id: r.id,
          name: r.trainee?.full_name || "متدرب",
          avatar: avatarUrl(r.trainee?.avatar_path),
          stars: (r.content_score + r.trainer_score + (r.organization_score ?? r.trainer_score)) / 3,
          comment: r.comment!.trim(),
          createdAt: r.created_at,
        })),
    },
    outline: [...modules.values()],
    favorite: next ? { courseId: next.id, saved: saved.has(next.id) } : null,
  };
}

// ── TRN-DSC-03 ────────────────────────────────────────────────────────────

export type RunState = "available" | "few" | "full" | "enrolled" | "waitlisted" | "unlimited";

export type RunView = {
  id: string;
  slug: string;
  reference: string;
  mode: CourseMode;
  dates: { start: string | null; end: string | null };
  times: { start: string; end: string } | null;
  place: string;
  city: string | null;
  month: { key: string; label: string } | null;
  trainer: string;
  price: number;
  currency: string;
  capacity: number | null;
  seatsLeft: number | null;
  state: RunState;
  enrollment: { id: string; status: EnrollmentStatus; paid: boolean } | null;
};

export type ProgramRunsView = {
  program: { id: string; slug: string; title: string; meta: string; categoryId: string | null; ownerId: string; organizationId: string | null };
  runs: RunView[];
  following: boolean;
  followTarget: { kind: "organization" | "trainer"; name: string };
  alternatives: CourseCardView[];
};

const ACTIVE_ENROLLMENT: EnrollmentStatus[] = ["pending_payment", "pending_provider", "confirmed", "in_progress", "completed"];

export async function getProgramRuns(slug: string, userId: string): Promise<ProgramRunsView | null> {
  const supabase = await createClient();
  const program = await loadProgram(supabase, slug);
  if (!program) return null;

  const { data, error } = await supabase
    .from("courses")
    .select(RUN_SELECT)
    .eq("program_id", program.id)
    .in("status", ["open", "in_progress"])
    .order("starts_at", { ascending: true, nullsFirst: true });
  if (error) throw new Error(`program runs: ${error.message}`);
  const rows = (data ?? []) as unknown as RunRow[];
  const ids = rows.map((r) => r.id);

  const [factsRes, enrollRes, waitRes, sessionsRes, followRes] = await Promise.all([
    ids.length ? supabase.rpc("course_public_facts", { p_courses: ids }) : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from("enrollments").select("id, course_id, status, price_paid").eq("trainee_id", userId).in("course_id", ids).in("status", ACTIVE_ENROLLMENT)
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from("waitlist_entries").select("course_id").eq("trainee_id", userId).in("course_id", ids).in("status", ["waiting", "invited"])
      : Promise.resolve({ data: [], error: null }),
    ids.length
      ? supabase.from("course_sessions").select("course_id, starts_at, ends_at").in("course_id", ids).neq("status", "cancelled").order("position")
      : Promise.resolve({ data: [], error: null }),
    program.organization_id
      ? supabase.from("follows").select("id").eq("user_id", userId).eq("organization_id", program.organization_id).maybeSingle()
      : supabase.from("follows").select("id").eq("user_id", userId).eq("trainer_id", program.owner_id).maybeSingle(),
  ]);
  if (factsRes.error) throw new Error(`course_public_facts: ${factsRes.error.message}`);

  const facts = new Map((factsRes.data ?? []).map((f) => [f.course_id, f]));
  const enrolled = new Map(((enrollRes.data ?? []) as { id: string; course_id: string; status: EnrollmentStatus; price_paid: number }[]).map((e) => [e.course_id, e]));
  const waiting = new Set(((waitRes.data ?? []) as { course_id: string }[]).map((w) => w.course_id));
  const firstSession = new Map<string, { starts_at: string; ends_at: string }>();
  for (const s of (sessionsRes.data ?? []) as { course_id: string; starts_at: string; ends_at: string }[]) {
    if (!firstSession.has(s.course_id)) firstSession.set(s.course_id, s);
  }

  const runs: RunView[] = rows
    .filter((r) => r.status === "open" || enrolled.has(r.id))
    .map((r) => {
      const seatsLeft = facts.get(r.id)?.seats_left ?? null;
      const enrollment = enrolled.get(r.id) ?? null;
      const state: RunState = enrollment
        ? "enrolled"
        : waiting.has(r.id)
          ? "waitlisted"
          : seatsLeft === null
            ? "unlimited"
            : seatsLeft <= 0
              ? "full"
              : seatsLeft <= 3
                ? "few"
                : "available";
      const session = firstSession.get(r.id);
      return {
        id: r.id,
        slug: r.slug,
        reference: reference("CRS", r.id, r.created_at),
        mode: r.mode,
        dates: { start: r.starts_at, end: r.ends_at },
        times: session ? { start: session.starts_at, end: session.ends_at } : null,
        place: place(r),
        city: r.mode === "in_person" ? r.city : null,
        month: r.starts_at ? formatMonthYear(r.starts_at) : null,
        trainer: r.trainer?.full_name ?? "",
        price: Number(r.price),
        currency: r.currency,
        capacity: r.capacity,
        seatsLeft,
        state,
        enrollment: enrollment ? { id: enrollment.id, status: enrollment.status, paid: Number(enrollment.price_paid) > 0 } : null,
      };
    });

  let alternatives: CourseCardView[] = [];
  if (runs.length === 0) {
    const alt = program.category
      ? await supabase
          .from("courses")
          .select(`${COURSE_CARD_SELECT}, same:programs!inner(category_id)`)
          .eq("status", "open")
          .neq("program_id", program.id)
          .eq("same.category_id", program.category.id)
          .order("rating_avg", { ascending: false })
          .limit(3)
      : await supabase.from("courses").select(COURSE_CARD_SELECT).eq("status", "open").neq("program_id", program.id).order("rating_avg", { ascending: false }).limit(3);
    if (alt.error) throw new Error(`alternatives: ${alt.error.message}`);
    alternatives = ((alt.data ?? []) as unknown as CourseCardRow[]).map((row) => toCatalogCard(row));
  }

  const hours = rows[0]?.duration_hours ?? null;
  const metaParts = [
    program.organizations?.name ?? program.owner?.full_name ?? null,
    hours ? `${new Intl.NumberFormat("ar-SA-u-nu-arab").format(Number(hours))} ساعة` : null,
    `مستوى ${{ beginner: "مبتدئ", intermediate: "متوسط", advanced: "متقدم" }[program.level]}`,
  ].filter(Boolean);

  return {
    program: {
      id: program.id,
      slug: program.slug,
      title: program.title,
      meta: metaParts.join(" · "),
      categoryId: program.category?.id ?? null,
      ownerId: program.owner_id,
      organizationId: program.organization_id,
    },
    runs,
    following: !!followRes.data,
    followTarget: program.organizations
      ? { kind: "organization", name: program.organizations.name }
      : { kind: "trainer", name: program.owner?.full_name || "المدرب" },
    alternatives,
  };
}

/** Program title for page metadata. */
export async function getProgramTitle(slug: string): Promise<string | null> {
  const supabase = await createClient();
  const program = await loadProgram(supabase, slug);
  return program?.title ?? null;
}
