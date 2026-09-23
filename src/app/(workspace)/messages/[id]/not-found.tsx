import { NotFoundState } from "@/components/profile/NotFoundState";

export default function NotFound() {
  return <NotFoundState title="المحادثة غير متاحة" description="ربما حُذفت أو لست طرفًا فيها." href="/messages" label="كل المحادثات" />;
}
