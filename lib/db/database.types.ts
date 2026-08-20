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
          created_at: string;
          failure_count: number;
          last_checked_at: string;
          last_success_at: string | null;
          response_time_ms: number | null;
          status: string;
          updated_at: string;
        };
        Insert: {
          agent_db_id: string;
          created_at?: string;
          failure_count: number;
          last_checked_at: string;
          last_success_at?: string | null;
          response_time_ms?: number | null;
          status: string;
          updated_at?: string;
        };
        Update: {
          agent_db_id?: string;
          created_at?: string;
          failure_count?: number;
          last_checked_at?: string;
          last_success_at?: string | null;
          response_time_ms?: number | null;
          status?: string;
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
          metadata_component: number | null;
          reliability_component: number | null;
          reputation_component: number | null;
          score_version: string;
          sift_score: number;
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
          metadata_component?: number | null;
          reliability_component?: number | null;
          reputation_component?: number | null;
          score_version: string;
          sift_score: number;
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
          metadata_component?: number | null;
          reliability_component?: number | null;
          reputation_component?: number | null;
          score_version?: string;
          sift_score?: number;
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
    Functions: { [_ in never]: never };
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
