/**
 * Strict schema contract for the checked-in M2 migration.
 *
 * Regenerate this file from a migrated database with `npm run db:types` after
 * every schema change. The command and review workflow are documented in
 * `docs/database.md`.
 */
export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type Database = {
  public: {
    Tables: {
      agent_health: {
        Row: {
          agent_db_id: string;
          check_count: number;
          checked_endpoint: string | null;
          created_at: string;
          endpoint_hash: string | null;
          failure_count: number;
          last_checked_at: string;
          last_success_at: string | null;
          outcome: string | null;
          response_time_ms: number | null;
          service_type: string | null;
          status: string;
          success_count: number;
          updated_at: string;
        };
        Insert: {
          agent_db_id: string;
          check_count?: number;
          checked_endpoint?: string | null;
          created_at?: string;
          endpoint_hash?: string | null;
          failure_count: number;
          last_checked_at: string;
          last_success_at?: string | null;
          outcome?: string | null;
          response_time_ms?: number | null;
          service_type?: string | null;
          status: string;
          success_count?: number;
          updated_at?: string;
        };
        Update: {
          agent_db_id?: string;
          check_count?: number;
          checked_endpoint?: string | null;
          created_at?: string;
          endpoint_hash?: string | null;
          failure_count?: number;
          last_checked_at?: string;
          last_success_at?: string | null;
          outcome?: string | null;
          response_time_ms?: number | null;
          service_type?: string | null;
          status?: string;
          success_count?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_health_agent_db_id_fkey";
            columns: ["agent_db_id"];
            isOneToOne: true;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_reputation: {
        Row: {
          agent_db_id: string;
          created_at: string;
          failed_jobs: number | null;
          feedback_count: number | null;
          last_activity_at: string | null;
          reputation_score: number | null;
          source: string | null;
          source_observed_at: string | null;
          successful_jobs: number | null;
          updated_at: string;
        };
        Insert: {
          agent_db_id: string;
          created_at?: string;
          failed_jobs?: number | null;
          feedback_count?: number | null;
          last_activity_at?: string | null;
          reputation_score?: number | null;
          source?: string | null;
          source_observed_at?: string | null;
          successful_jobs?: number | null;
          updated_at?: string;
        };
        Update: {
          agent_db_id?: string;
          created_at?: string;
          failed_jobs?: number | null;
          feedback_count?: number | null;
          last_activity_at?: string | null;
          reputation_score?: number | null;
          source?: string | null;
          source_observed_at?: string | null;
          successful_jobs?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_reputation_agent_db_id_fkey";
            columns: ["agent_db_id"];
            isOneToOne: true;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_scores: {
        Row: {
          agent_db_id: string;
          availability_component: number | null;
          calculated_at: string;
          capability_component: number | null;
          confidence: number;
          created_at: string;
          evidence_snapshot: Json;
          metadata_component: number | null;
          reliability_component: number | null;
          reputation_component: number | null;
          score_version: string;
          sift_score: number | null;
          source_freshness: Json;
          track_record_component: number | null;
          updated_at: string;
        };
        Insert: {
          agent_db_id: string;
          availability_component?: number | null;
          calculated_at: string;
          capability_component?: number | null;
          confidence: number;
          created_at?: string;
          evidence_snapshot: Json;
          metadata_component?: number | null;
          reliability_component?: number | null;
          reputation_component?: number | null;
          score_version: string;
          sift_score?: number | null;
          source_freshness: Json;
          track_record_component?: number | null;
          updated_at?: string;
        };
        Update: {
          agent_db_id?: string;
          availability_component?: number | null;
          calculated_at?: string;
          capability_component?: number | null;
          confidence?: number;
          created_at?: string;
          evidence_snapshot?: Json;
          metadata_component?: number | null;
          reliability_component?: number | null;
          reputation_component?: number | null;
          score_version?: string;
          sift_score?: number | null;
          source_freshness?: Json;
          track_record_component?: number | null;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_scores_agent_db_id_fkey";
            columns: ["agent_db_id"];
            isOneToOne: true;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_services: {
        Row: {
          agent_db_id: string;
          created_at: string;
          endpoint: string | null;
          id: string;
          metadata: Json | null;
          service_type: string;
          updated_at: string;
          version: string | null;
        };
        Insert: {
          agent_db_id: string;
          created_at?: string;
          endpoint?: string | null;
          id?: string;
          metadata?: Json | null;
          service_type: string;
          updated_at?: string;
          version?: string | null;
        };
        Update: {
          agent_db_id?: string;
          created_at?: string;
          endpoint?: string | null;
          id?: string;
          metadata?: Json | null;
          service_type?: string;
          updated_at?: string;
          version?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "agent_services_agent_db_id_fkey";
            columns: ["agent_db_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      agents: {
        Row: {
          active: boolean | null;
          agent_id: string;
          agent_uri: string | null;
          category: string | null;
          chain_id: number;
          created_at: string;
          description: string | null;
          id: string;
          image_url: string | null;
          last_synced_at: string | null;
          metadata_verified_at: string | null;
          metadata_status: string;
          name: string | null;
          owner_address: string | null;
          registered_at: string | null;
          registered_block: number | null;
          registry_address: string;
          updated_at: string;
          x402_supported: boolean | null;
        };
        Insert: {
          active?: boolean | null;
          agent_id: string;
          agent_uri?: string | null;
          category?: string | null;
          chain_id: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          last_synced_at?: string | null;
          metadata_verified_at?: string | null;
          metadata_status?: string;
          name?: string | null;
          owner_address?: string | null;
          registered_at?: string | null;
          registered_block?: number | null;
          registry_address: string;
          updated_at?: string;
          x402_supported?: boolean | null;
        };
        Update: {
          active?: boolean | null;
          agent_id?: string;
          agent_uri?: string | null;
          category?: string | null;
          chain_id?: number;
          created_at?: string;
          description?: string | null;
          id?: string;
          image_url?: string | null;
          last_synced_at?: string | null;
          metadata_verified_at?: string | null;
          metadata_status?: string;
          name?: string | null;
          owner_address?: string | null;
          registered_at?: string | null;
          registered_block?: number | null;
          registry_address?: string;
          updated_at?: string;
          x402_supported?: boolean | null;
        };
        Relationships: [];
      };
      sync_state: {
        Row: {
          chain_id: number;
          last_synced_block: number;
          registry_address: string;
          updated_at: string;
        };
        Insert: {
          chain_id: number;
          last_synced_block: number;
          registry_address: string;
          updated_at?: string;
        };
        Update: {
          chain_id?: number;
          last_synced_block?: number;
          registry_address?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      featured_agent_candidates: {
        Args: {
          p_fresh_after?: string;
          p_limit?: number;
          p_score_version?: string;
        };
        Returns: { agent_db_id: string }[];
      };
      health_check_candidates: {
        Args: {
          p_limit?: number;
          p_stale_before?: string;
        };
        Returns: { agent_db_id: string }[];
      };
      score_recalculation_candidates: {
        Args: {
          p_limit?: number;
          p_score_version?: string;
        };
        Returns: { agent_db_id: string }[];
      };
      search_agents: {
        Args: {
          p_categories?: string[];
          p_metadata_statuses?: string[];
          p_page?: number;
          p_page_size?: number;
          p_search_terms?: string[];
          p_sort?: string;
        };
        Returns: {
          active: boolean | null;
          agent_db_id: string;
          agent_id: string;
          category_source: string | null;
          chain_id: number;
          description: string | null;
          image_url: string | null;
          last_synced_at: string | null;
          metadata_status: string;
          name: string | null;
          owner_address: string | null;
          registered_at: string | null;
          registered_block: number | null;
          registry_address: string;
          relevance: number;
          resolved_categories: string[];
          result_page: number;
          services: Json;
          total_count: number;
          x402_supported: boolean | null;
        }[];
      };
    };
    Enums: { [_ in never]: never };
    CompositeTypes: { [_ in never]: never };
  };
};

export type PublicTableName = keyof Database["public"]["Tables"];

export type TableRow<TableName extends PublicTableName> =
  Database["public"]["Tables"][TableName]["Row"];

export type TableInsert<TableName extends PublicTableName> =
  Database["public"]["Tables"][TableName]["Insert"];

export type TableUpdate<TableName extends PublicTableName> =
  Database["public"]["Tables"][TableName]["Update"];
