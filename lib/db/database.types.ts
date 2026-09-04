/**
 * Strict schema contract for the checked-in Supabase migration set.
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
      agent_category_evidence: {
        Row: {
          agent_db_id: string;
          category: string;
          confidence: number;
          created_at: string;
          evidence: Json;
          facts: Json;
          observed_at: string;
          rule_version: string;
          source: string;
          updated_at: string;
        };
        Insert: {
          agent_db_id: string;
          category: string;
          confidence: number;
          created_at?: string;
          evidence?: Json;
          facts?: Json;
          observed_at: string;
          rule_version: string;
          source: string;
          updated_at?: string;
        };
        Update: {
          agent_db_id?: string;
          category?: string;
          confidence?: number;
          created_at?: string;
          evidence?: Json;
          facts?: Json;
          observed_at?: string;
          rule_version?: string;
          source?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_category_evidence_agent_db_id_fkey";
            columns: ["agent_db_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_category_shortlist: {
        Row: {
          agent_db_id: string;
          category: string;
          created_at: string;
          rationale: string;
          selected_at: string;
          selection_version: string;
          shortlist_rank: number;
          updated_at: string;
        };
        Insert: {
          agent_db_id: string;
          category: string;
          created_at?: string;
          rationale: string;
          selected_at: string;
          selection_version: string;
          shortlist_rank: number;
          updated_at?: string;
        };
        Update: {
          agent_db_id?: string;
          category?: string;
          created_at?: string;
          rationale?: string;
          selected_at?: string;
          selection_version?: string;
          shortlist_rank?: number;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_category_shortlist_agent_db_id_fkey";
            columns: ["agent_db_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      agent_external_evidence: {
        Row: {
          agent_db_id: string;
          availability: string;
          conflict_fields: string[];
          created_at: string;
          expires_at: string;
          normalized_evidence: Json;
          observed_at: string;
          provider: string;
          raw_payload: Json | null;
          source_reference: string;
          updated_at: string;
        };
        Insert: {
          agent_db_id: string;
          availability: string;
          conflict_fields?: string[];
          created_at?: string;
          expires_at: string;
          normalized_evidence?: Json;
          observed_at: string;
          provider: string;
          raw_payload?: Json | null;
          source_reference: string;
          updated_at?: string;
        };
        Update: {
          agent_db_id?: string;
          availability?: string;
          conflict_fields?: string[];
          created_at?: string;
          expires_at?: string;
          normalized_evidence?: Json;
          observed_at?: string;
          provider?: string;
          raw_payload?: Json | null;
          source_reference?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "agent_external_evidence_agent_db_id_fkey";
            columns: ["agent_db_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
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
          registration_log_index: number | null;
          registration_transaction_hash: string | null;
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
          registration_log_index?: number | null;
          registration_transaction_hash?: string | null;
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
          registration_log_index?: number | null;
          registration_transaction_hash?: string | null;
          registry_address?: string;
          updated_at?: string;
          x402_supported?: boolean | null;
        };
        Relationships: [];
      };
      dashboard_sessions: {
        Row: {
          chain_id: number;
          created_at: string;
          expires_at: string;
          id: string;
          last_used_at: string;
          token_hash: string;
          wallet_address: string;
        };
        Insert: {
          chain_id: number;
          created_at?: string;
          expires_at: string;
          id?: string;
          last_used_at?: string;
          token_hash: string;
          wallet_address: string;
        };
        Update: {
          chain_id?: number;
          created_at?: string;
          expires_at?: string;
          id?: string;
          last_used_at?: string;
          token_hash?: string;
          wallet_address?: string;
        };
        Relationships: [];
      };
      dashboard_wallet_challenges: {
        Row: {
          chain_id: number;
          consumed_at: string | null;
          created_at: string;
          expires_at: string;
          id: string;
          issued_at: string;
          request_origin: string;
          token_hash: string;
          wallet_address: string;
        };
        Insert: {
          chain_id: number;
          consumed_at?: string | null;
          created_at?: string;
          expires_at: string;
          id?: string;
          issued_at: string;
          request_origin: string;
          token_hash: string;
          wallet_address: string;
        };
        Update: {
          chain_id?: number;
          consumed_at?: string | null;
          created_at?: string;
          expires_at?: string;
          id?: string;
          issued_at?: string;
          request_origin?: string;
          token_hash?: string;
          wallet_address?: string;
        };
        Relationships: [];
      };
      job_activity: {
        Row: {
          activity_type: string;
          created_at: string;
          details: Json;
          id: number;
          job_db_id: string;
          occurred_at: string;
          transaction_hash: string | null;
        };
        Insert: {
          activity_type: string;
          created_at?: string;
          details?: Json;
          id?: number;
          job_db_id: string;
          occurred_at?: string;
          transaction_hash?: string | null;
        };
        Update: {
          activity_type?: string;
          created_at?: string;
          details?: Json;
          id?: number;
          job_db_id?: string;
          occurred_at?: string;
          transaction_hash?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "job_activity_job_db_id_fkey";
            columns: ["job_db_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      job_transactions: {
        Row: {
          block_hash: string | null;
          block_number: number | null;
          confirmed_at: string | null;
          created_at: string;
          from_address: string;
          id: string;
          job_db_id: string;
          replaced_transaction_hash: string | null;
          status: string;
          step: string;
          submitted_at: string;
          to_address: string;
          transaction_hash: string;
          updated_at: string;
        };
        Insert: {
          block_hash?: string | null;
          block_number?: number | null;
          confirmed_at?: string | null;
          created_at?: string;
          from_address: string;
          id?: string;
          job_db_id: string;
          replaced_transaction_hash?: string | null;
          status: string;
          step: string;
          submitted_at?: string;
          to_address: string;
          transaction_hash: string;
          updated_at?: string;
        };
        Update: {
          block_hash?: string | null;
          block_number?: number | null;
          confirmed_at?: string | null;
          created_at?: string;
          from_address?: string;
          id?: string;
          job_db_id?: string;
          replaced_transaction_hash?: string | null;
          status?: string;
          step?: string;
          submitted_at?: string;
          to_address?: string;
          transaction_hash?: string;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "job_transactions_job_db_id_fkey";
            columns: ["job_db_id"];
            isOneToOne: false;
            referencedRelation: "jobs";
            referencedColumns: ["id"];
          },
        ];
      };
      jobs: {
        Row: {
          agent_db_id: string;
          agent_id: string;
          block_number: number | null;
          budget_base_units: string;
          chain_id: number;
          commerce_address: string;
          confirmed_at: string | null;
          created_at: string;
          current_step: string | null;
          deliverables: string;
          expires_at: string;
          failure_code: string | null;
          failure_message: string | null;
          id: string;
          idempotency_key: string;
          maximum_spend_base_units: string;
          mission: string;
          negotiation_hash: string;
          onchain_description: string;
          onchain_job_id: string | null;
          payment_token_address: string;
          payment_token_decimals: number;
          payment_token_symbol: string;
          policy_address: string;
          provider_address: string;
          quality_standards: string;
          quote_expires_at: string;
          registry_address: string;
          resume_token_hash: string;
          router_address: string;
          status: string;
          transaction_hash: string | null;
          updated_at: string;
          wallet_address: string;
        };
        Insert: {
          agent_db_id: string;
          agent_id: string;
          block_number?: number | null;
          budget_base_units: string;
          chain_id: number;
          commerce_address: string;
          confirmed_at?: string | null;
          created_at?: string;
          current_step?: string | null;
          deliverables: string;
          expires_at: string;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          idempotency_key: string;
          maximum_spend_base_units: string;
          mission: string;
          negotiation_hash: string;
          onchain_description: string;
          onchain_job_id?: string | null;
          payment_token_address: string;
          payment_token_decimals: number;
          payment_token_symbol: string;
          policy_address: string;
          provider_address: string;
          quality_standards: string;
          quote_expires_at: string;
          registry_address: string;
          resume_token_hash: string;
          router_address: string;
          status?: string;
          transaction_hash?: string | null;
          updated_at?: string;
          wallet_address: string;
        };
        Update: {
          agent_db_id?: string;
          agent_id?: string;
          block_number?: number | null;
          budget_base_units?: string;
          chain_id?: number;
          commerce_address?: string;
          confirmed_at?: string | null;
          created_at?: string;
          current_step?: string | null;
          deliverables?: string;
          expires_at?: string;
          failure_code?: string | null;
          failure_message?: string | null;
          id?: string;
          idempotency_key?: string;
          maximum_spend_base_units?: string;
          mission?: string;
          negotiation_hash?: string;
          onchain_description?: string;
          onchain_job_id?: string | null;
          payment_token_address?: string;
          payment_token_decimals?: number;
          payment_token_symbol?: string;
          policy_address?: string;
          provider_address?: string;
          quality_standards?: string;
          quote_expires_at?: string;
          registry_address?: string;
          resume_token_hash?: string;
          router_address?: string;
          status?: string;
          transaction_hash?: string | null;
          updated_at?: string;
          wallet_address?: string;
        };
        Relationships: [
          {
            foreignKeyName: "jobs_agent_db_id_fkey";
            columns: ["agent_db_id"];
            isOneToOne: false;
            referencedRelation: "agents";
            referencedColumns: ["id"];
          },
        ];
      };
      sync_state: {
        Row: {
          chain_id: number;
          confirmed_head: number | null;
          last_synced_block: number;
          registry_address: string;
          updated_at: string;
        };
        Insert: {
          chain_id: number;
          confirmed_head?: number | null;
          last_synced_block: number;
          registry_address: string;
          updated_at?: string;
        };
        Update: {
          chain_id?: number;
          confirmed_head?: number | null;
          last_synced_block?: number;
          registry_address?: string;
          updated_at?: string;
        };
        Relationships: [];
      };
    };
    Views: { [_ in never]: never };
    Functions: {
      category_classification_candidates: {
        Args: {
          p_after?: string | null;
          p_chain_id?: number;
          p_limit?: number;
        };
        Returns: {
          agent_db_id: string;
          agent_id: string;
          declared_category: string | null;
          description: string | null;
          source_observed_at: string;
          name: string | null;
          services: Json;
        }[];
      };
      category_coverage_report: {
        Args: { p_chain_id?: number };
        Returns: {
          activation_available: number;
          category: string;
          external_cross_checks: number;
          inventory: number;
          latest_observed_at: string | null;
          shortlist_count: number;
          valid_metadata: number;
          with_endpoint: number;
          with_health: number;
          with_image: number;
          with_reputation: number;
          with_score: number;
          with_services: number;
        }[];
      };
      featured_agent_candidates: {
        Args: {
          p_chain_ids?: number[];
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
      record_hiring_verification: {
        Args: {
          p_block_hash: string | null;
          p_block_number: number | null;
          p_current_step: string | null;
          p_failure_code: string | null;
          p_failure_message: string | null;
          p_final_block_number: number | null;
          p_final_transaction_hash: string | null;
          p_from_address: string;
          p_job_confirmed_at: string | null;
          p_job_id: string;
          p_job_status: string;
          p_onchain_job_id: string | null;
          p_replaced_transaction_hash: string | null;
          p_step: string;
          p_to_address: string;
          p_transaction_confirmed_at: string | null;
          p_transaction_hash: string;
          p_transaction_status: string;
        };
        Returns: undefined;
      };
      replace_agent_category_evidence: {
        Args: {
          p_agent_ids: string[];
          p_records: Json;
        };
        Returns: undefined;
      };
      replace_agent_category_shortlist: {
        Args: { p_records: Json };
        Returns: undefined;
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
          p_chain_ids?: number[];
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
          category_evidence: Json;
          category_source: string | null;
          chain_id: number;
          description: string | null;
          has_more: boolean;
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
