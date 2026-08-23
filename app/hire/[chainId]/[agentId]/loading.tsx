import { Skeleton } from "@/components/ui/skeleton";

export default function HireLoading() {
  return (
    <main className="flex-1 px-4 py-10 sm:px-6 lg:px-8">
      <div className="mx-auto grid w-full max-w-7xl gap-6 lg:grid-cols-[17rem_minmax(0,1fr)]">
        <Skeleton className="h-64 rounded-2xl" />
        <Skeleton className="h-[38rem] rounded-2xl" />
      </div>
    </main>
  );
}
