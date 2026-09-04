import { buildCategoryCoverageReport } from "@/features/categories/coverage";
import { createCategoryRepository } from "@/lib/db/category-repository";

export async function GET() {
  try {
    const observedAt = new Date().toISOString();
    const coverage = await createCategoryRepository().listCoverage(56);
    return Response.json(buildCategoryCoverageReport(coverage, observedAt), {
      headers: {
        "cache-control": "public, max-age=60, s-maxage=300, stale-while-revalidate=600",
      },
    });
  } catch {
    return Response.json(
      {
        error: "Category coverage is temporarily unavailable.",
        event: "category_coverage_unavailable",
      },
      { status: 503 },
    );
  }
}
