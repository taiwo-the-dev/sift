import { DashboardLoadingState } from "@/components/dashboard/dashboard-page-client";

export default function DashboardLoading() {
  return (
    <div className="mx-auto w-full max-w-7xl flex-1 px-4 py-12 sm:px-6 lg:px-8">
      <DashboardLoadingState />
    </div>
  );
}

