import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";

import { SIFT_SCORE_VERSION } from "@/features/scoring/formula";
import type { FeaturedScoredAgent } from "@/features/scoring/model";
import { getSupabaseServerClient } from "@/lib/db/client";
import type { Database, TableRow } from "@/lib/db/database.types";
import { DatabaseOperationError } from "@/lib/db/errors";
import { mapHealthRecord } from "@/lib/db/health-repository";
import { mapScoreRecord } from "@/lib/db/score-repository";

type FeaturedAgentRecord = Pick<
  TableRow<"agents">,
  "agent_id" | "chain_id" | "description" | "id" | "image_url" | "name"
>;

export type FeaturedAgentSources = Readonly<{
  listAgents(ids: readonly string[]): Promise<readonly FeaturedAgentRecord[]>;
  listCandidateIds(
    limit: number,
    scoreVersion: string,
    freshAfter: string,
  ): Promise<readonly string[]>;
  listHealth(
    ids: readonly string[],
  ): Promise<readonly TableRow<"agent_health">[]>;
  listScores(
    ids: readonly string[],
  ): Promise<readonly TableRow<"agent_scores">[]>;
}>;

export type FeaturedAgentRepository = Readonly<{
  listFeatured(
    limit: number,
    asOf: Date,
  ): Promise<readonly FeaturedScoredAgent[]>;
}>;

function createSupabaseSources(
  client: SupabaseClient<Database>,
): FeaturedAgentSources {
  return {
    async listCandidateIds(limit, scoreVersion, freshAfter) {
      const { data, error } = await client.rpc("featured_agent_candidates", {
        p_fresh_after: freshAfter,
        p_limit: limit,
        p_score_version: scoreVersion,
      });

      if (error) {
        throw new DatabaseOperationError("list featured candidates", error);
      }

      return data.map((row) => row.agent_db_id);
    },
    async listAgents(ids) {
      const { data, error } = await client
        .from("agents")
        .select("id,agent_id,chain_id,description,image_url,name")
        .in("id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list featured agents", error);
      }

      return data;
    },
    async listHealth(ids) {
      const { data, error } = await client
        .from("agent_health")
        .select("*")
        .in("agent_db_id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list featured health", error);
      }

      return data;
    },
    async listScores(ids) {
      const { data, error } = await client
        .from("agent_scores")
        .select("*")
        .in("agent_db_id", [...ids]);

      if (error) {
        throw new DatabaseOperationError("list featured scores", error);
      }

      return data;
    },
  };
}

export function createFeaturedAgentRepository(
  sources: FeaturedAgentSources = createSupabaseSources(
    getSupabaseServerClient(),
  ),
): FeaturedAgentRepository {
  return {
    async listFeatured(limit, asOf) {
      if (!Number.isInteger(limit) || limit < 1 || limit > 5) {
        throw new TypeError("Featured agent limit must be from 1 to 5.");
      }

      const freshAfter = new Date(
        asOf.getTime() - 24 * 60 * 60 * 1_000,
      ).toISOString();
      const ids = await sources.listCandidateIds(
        limit,
        SIFT_SCORE_VERSION,
        freshAfter,
      );

      if (ids.length === 0) {
        return [];
      }

      const [healthRecords, agentRecords, scoreRecords] = await Promise.all([
        sources.listHealth(ids),
        sources.listAgents(ids),
        sources.listScores(ids),
      ]);
      const healthById = new Map(
        healthRecords.map((record) => [
          record.agent_db_id,
          mapHealthRecord(record),
        ]),
      );
      const agentById = new Map(
        agentRecords.map((record) => [record.id, record]),
      );
      const scoreById = new Map(
        scoreRecords.map((record) => [record.agent_db_id, record]),
      );

      return ids.flatMap((id) => {
        const health = healthById.get(id);
        const agent = agentById.get(id);
        const record = scoreById.get(id);

        if (!record) {
          return [];
        }

        const score = mapScoreRecord(record);

        if (
          !health ||
          !agent ||
          score.score === null ||
          score.version !== SIFT_SCORE_VERSION ||
          score.confidence < 0.6 ||
          Date.parse(score.calculatedAt) < Date.parse(freshAfter) ||
          health.status !== "online" ||
          health.outcome !== "success" ||
          Date.parse(health.lastCheckedAt) < Date.parse(freshAfter)
        ) {
          return [];
        }

        return [
          {
            agentId: agent.agent_id,
            chainId: agent.chain_id,
            description: agent.description,
            health,
            imageUrl: agent.image_url,
            name: agent.name,
            score: { ...score, score: score.score },
          },
        ];
      }).slice(0, limit);
    },
  };
}
