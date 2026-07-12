export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "14.5"
  }
  public: {
    Tables: {
      ai_cache: {
        Row: {
          cache_key: string | null
          created_at: string | null
          id: string
          kind: string | null
          payload: Json | null
        }
        Insert: {
          cache_key?: string | null
          created_at?: string | null
          id?: string
          kind?: string | null
          payload?: Json | null
        }
        Update: {
          cache_key?: string | null
          created_at?: string | null
          id?: string
          kind?: string | null
          payload?: Json | null
        }
        Relationships: []
      }
      ai_usage: {
        Row: {
          created_at: string | null
          id: string
          kind: string | null
          model: string | null
          request_date: string | null
          user_id: string | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          kind?: string | null
          model?: string | null
          request_date?: string | null
          user_id?: string | null
        }
        Update: {
          created_at?: string | null
          id?: string
          kind?: string | null
          model?: string | null
          request_date?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "ai_usage_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      audits: {
        Row: {
          auditor_id: string | null
          completed_date: string | null
          created_at: string | null
          department_id: string | null
          findings: string | null
          id: string
          result: Database["public"]["Enums"]["audit_result"] | null
          scheduled_date: string | null
          status: string | null
          title: string | null
        }
        Insert: {
          auditor_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          department_id?: string | null
          findings?: string | null
          id?: string
          result?: Database["public"]["Enums"]["audit_result"] | null
          scheduled_date?: string | null
          status?: string | null
          title?: string | null
        }
        Update: {
          auditor_id?: string | null
          completed_date?: string | null
          created_at?: string | null
          department_id?: string | null
          findings?: string | null
          id?: string
          result?: Database["public"]["Enums"]["audit_result"] | null
          scheduled_date?: string | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audits_auditor_id_fkey"
            columns: ["auditor_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "audits_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      badges: {
        Row: {
          created_at: string | null
          description: string | null
          icon: string | null
          id: string
          name: string | null
          unlock_rule: Json | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string | null
          unlock_rule?: Json | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          icon?: string | null
          id?: string
          name?: string | null
          unlock_rule?: Json | null
        }
        Relationships: []
      }
      carbon_transactions: {
        Row: {
          co2e: number | null
          created_at: string | null
          date: string | null
          department_id: string | null
          emission_factor_id: string | null
          id: string
          is_auto: boolean | null
          note: string | null
          quantity: number | null
          source_ref: string | null
          source_type: Database["public"]["Enums"]["source_type"] | null
        }
        Insert: {
          co2e?: number | null
          created_at?: string | null
          date?: string | null
          department_id?: string | null
          emission_factor_id?: string | null
          id?: string
          is_auto?: boolean | null
          note?: string | null
          quantity?: number | null
          source_ref?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
        }
        Update: {
          co2e?: number | null
          created_at?: string | null
          date?: string | null
          department_id?: string | null
          emission_factor_id?: string | null
          id?: string
          is_auto?: boolean | null
          note?: string | null
          quantity?: number | null
          source_ref?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
        }
        Relationships: [
          {
            foreignKeyName: "carbon_transactions_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "carbon_transactions_emission_factor_id_fkey"
            columns: ["emission_factor_id"]
            isOneToOne: false
            referencedRelation: "emission_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          created_at: string | null
          id: string
          name: string | null
          status: string | null
          type: Database["public"]["Enums"]["category_type"] | null
        }
        Insert: {
          created_at?: string | null
          id?: string
          name?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["category_type"] | null
        }
        Update: {
          created_at?: string | null
          id?: string
          name?: string | null
          status?: string | null
          type?: Database["public"]["Enums"]["category_type"] | null
        }
        Relationships: []
      }
      challenge_participations: {
        Row: {
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          challenge_id: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          progress: number | null
          proof_url: string | null
          reviewed_by: string | null
          xp_awarded: number | null
        }
        Insert: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          challenge_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          progress?: number | null
          proof_url?: string | null
          reviewed_by?: string | null
          xp_awarded?: number | null
        }
        Update: {
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          challenge_id?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          progress?: number | null
          proof_url?: string | null
          reviewed_by?: string | null
          xp_awarded?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenge_participations_challenge_id_fkey"
            columns: ["challenge_id"]
            isOneToOne: false
            referencedRelation: "challenges"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "challenge_participations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      challenges: {
        Row: {
          category_id: string | null
          created_at: string | null
          deadline: string | null
          description: string | null
          difficulty: string | null
          evidence_required: boolean | null
          id: string
          status: Database["public"]["Enums"]["challenge_status"] | null
          title: string | null
          xp: number | null
        }
        Insert: {
          category_id?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          difficulty?: string | null
          evidence_required?: boolean | null
          id?: string
          status?: Database["public"]["Enums"]["challenge_status"] | null
          title?: string | null
          xp?: number | null
        }
        Update: {
          category_id?: string | null
          created_at?: string | null
          deadline?: string | null
          description?: string | null
          difficulty?: string | null
          evidence_required?: boolean | null
          id?: string
          status?: Database["public"]["Enums"]["challenge_status"] | null
          title?: string | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "challenges_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
        ]
      }
      compliance_issues: {
        Row: {
          audit_id: string | null
          created_at: string | null
          description: string | null
          due_date: string | null
          id: string
          is_overdue: boolean | null
          owner_id: string | null
          severity: Database["public"]["Enums"]["issue_severity"] | null
          status: Database["public"]["Enums"]["issue_status"] | null
        }
        Insert: {
          audit_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_overdue?: boolean | null
          owner_id?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"] | null
          status?: Database["public"]["Enums"]["issue_status"] | null
        }
        Update: {
          audit_id?: string | null
          created_at?: string | null
          description?: string | null
          due_date?: string | null
          id?: string
          is_overdue?: boolean | null
          owner_id?: string | null
          severity?: Database["public"]["Enums"]["issue_severity"] | null
          status?: Database["public"]["Enums"]["issue_status"] | null
        }
        Relationships: [
          {
            foreignKeyName: "compliance_issues_audit_id_fkey"
            columns: ["audit_id"]
            isOneToOne: false
            referencedRelation: "audits"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "compliance_issues_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      csr_activities: {
        Row: {
          activity_date: string | null
          capacity: number | null
          category_id: string | null
          created_at: string | null
          department_id: string | null
          description: string | null
          id: string
          location: string | null
          points: number | null
          status: string | null
          title: string | null
        }
        Insert: {
          activity_date?: string | null
          capacity?: number | null
          category_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          location?: string | null
          points?: number | null
          status?: string | null
          title?: string | null
        }
        Update: {
          activity_date?: string | null
          capacity?: number | null
          category_id?: string | null
          created_at?: string | null
          department_id?: string | null
          description?: string | null
          id?: string
          location?: string | null
          points?: number | null
          status?: string | null
          title?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "csr_activities_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "csr_activities_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      department_scores: {
        Row: {
          created_at: string | null
          department_id: string | null
          environmental_score: number | null
          governance_score: number | null
          id: string
          social_score: number | null
          total_score: number | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          department_id?: string | null
          environmental_score?: number | null
          governance_score?: number | null
          id?: string
          social_score?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          department_id?: string | null
          environmental_score?: number | null
          governance_score?: number | null
          id?: string
          social_score?: number | null
          total_score?: number | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "department_scores_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: true
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      departments: {
        Row: {
          code: string | null
          created_at: string | null
          employee_count: number | null
          head_id: string | null
          id: string
          name: string | null
          parent_id: string | null
          status: string | null
        }
        Insert: {
          code?: string | null
          created_at?: string | null
          employee_count?: number | null
          head_id?: string | null
          id?: string
          name?: string | null
          parent_id?: string | null
          status?: string | null
        }
        Update: {
          code?: string | null
          created_at?: string | null
          employee_count?: number | null
          head_id?: string | null
          id?: string
          name?: string | null
          parent_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "departments_head_id_fkey"
            columns: ["head_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "departments_parent_id_fkey"
            columns: ["parent_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      diversity_metrics: {
        Row: {
          avg_tenure: number | null
          created_at: string | null
          department_id: string | null
          gender_ratio: number | null
          headcount: number | null
          id: string
          period: string | null
          training_hours: number | null
        }
        Insert: {
          avg_tenure?: number | null
          created_at?: string | null
          department_id?: string | null
          gender_ratio?: number | null
          headcount?: number | null
          id?: string
          period?: string | null
          training_hours?: number | null
        }
        Update: {
          avg_tenure?: number | null
          created_at?: string | null
          department_id?: string | null
          gender_ratio?: number | null
          headcount?: number | null
          id?: string
          period?: string | null
          training_hours?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "diversity_metrics_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      emission_factors: {
        Row: {
          created_at: string | null
          factor_kgco2e: number | null
          id: string
          name: string | null
          reference: string | null
          source_type: Database["public"]["Enums"]["source_type"] | null
          status: string | null
          unit: string | null
          valid_from: string | null
          valid_to: string | null
        }
        Insert: {
          created_at?: string | null
          factor_kgco2e?: number | null
          id?: string
          name?: string | null
          reference?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
          status?: string | null
          unit?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Update: {
          created_at?: string | null
          factor_kgco2e?: number | null
          id?: string
          name?: string | null
          reference?: string | null
          source_type?: Database["public"]["Enums"]["source_type"] | null
          status?: string | null
          unit?: string | null
          valid_from?: string | null
          valid_to?: string | null
        }
        Relationships: []
      }
      employee_participations: {
        Row: {
          activity_id: string | null
          approval_status: Database["public"]["Enums"]["approval_status"] | null
          completion_date: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          points_earned: number | null
          proof_url: string | null
          reviewed_by: string | null
        }
        Insert: {
          activity_id?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          completion_date?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          points_earned?: number | null
          proof_url?: string | null
          reviewed_by?: string | null
        }
        Update: {
          activity_id?: string | null
          approval_status?:
            | Database["public"]["Enums"]["approval_status"]
            | null
          completion_date?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          points_earned?: number | null
          proof_url?: string | null
          reviewed_by?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "employee_participations_activity_id_fkey"
            columns: ["activity_id"]
            isOneToOne: false
            referencedRelation: "csr_activities"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_participations_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "employee_participations_reviewed_by_fkey"
            columns: ["reviewed_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      environmental_goals: {
        Row: {
          baseline: number | null
          created_at: string | null
          current_value: number | null
          department_id: string | null
          id: string
          metric: string | null
          name: string | null
          status: Database["public"]["Enums"]["goal_status"] | null
          target: number | null
          target_date: string | null
        }
        Insert: {
          baseline?: number | null
          created_at?: string | null
          current_value?: number | null
          department_id?: string | null
          id?: string
          metric?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["goal_status"] | null
          target?: number | null
          target_date?: string | null
        }
        Update: {
          baseline?: number | null
          created_at?: string | null
          current_value?: number | null
          department_id?: string | null
          id?: string
          metric?: string | null
          name?: string | null
          status?: Database["public"]["Enums"]["goal_status"] | null
          target?: number | null
          target_date?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "environmental_goals_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      esg_policies: {
        Row: {
          body: string | null
          created_at: string | null
          effective_date: string | null
          id: string
          name: string | null
          owner_id: string | null
          pillar: Database["public"]["Enums"]["pillar"] | null
          requires_ack: boolean | null
          status: string | null
          version: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: string
          name?: string | null
          owner_id?: string | null
          pillar?: Database["public"]["Enums"]["pillar"] | null
          requires_ack?: boolean | null
          status?: string | null
          version?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          effective_date?: string | null
          id?: string
          name?: string | null
          owner_id?: string | null
          pillar?: Database["public"]["Enums"]["pillar"] | null
          requires_ack?: boolean | null
          status?: string | null
          version?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "esg_policies_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      esg_settings: {
        Row: {
          auto_emission_enabled: boolean | null
          badge_auto_award_enabled: boolean | null
          created_at: string | null
          env_weight: number | null
          evidence_required_enabled: boolean | null
          gov_weight: number | null
          id: number
          notify_email: boolean | null
          notify_in_app: boolean | null
          social_weight: number | null
          updated_at: string | null
        }
        Insert: {
          auto_emission_enabled?: boolean | null
          badge_auto_award_enabled?: boolean | null
          created_at?: string | null
          env_weight?: number | null
          evidence_required_enabled?: boolean | null
          gov_weight?: number | null
          id: number
          notify_email?: boolean | null
          notify_in_app?: boolean | null
          social_weight?: number | null
          updated_at?: string | null
        }
        Update: {
          auto_emission_enabled?: boolean | null
          badge_auto_award_enabled?: boolean | null
          created_at?: string | null
          env_weight?: number | null
          evidence_required_enabled?: boolean | null
          gov_weight?: number | null
          id?: number
          notify_email?: boolean | null
          notify_in_app?: boolean | null
          social_weight?: number | null
          updated_at?: string | null
        }
        Relationships: []
      }
      job_runs: {
        Row: {
          affected_count: number | null
          id: string
          job_name: string
          note: string | null
          ran_at: string
        }
        Insert: {
          affected_count?: number | null
          id?: string
          job_name: string
          note?: string | null
          ran_at?: string
        }
        Update: {
          affected_count?: number | null
          id?: string
          job_name?: string
          note?: string | null
          ran_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          body: string | null
          created_at: string | null
          id: string
          payload: Json | null
          read_at: string | null
          title: string | null
          type: Database["public"]["Enums"]["notification_type"] | null
          user_id: string | null
        }
        Insert: {
          body?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string | null
        }
        Update: {
          body?: string | null
          created_at?: string | null
          id?: string
          payload?: Json | null
          read_at?: string | null
          title?: string | null
          type?: Database["public"]["Enums"]["notification_type"] | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "notifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      org_score_snapshots: {
        Row: {
          created_at: string | null
          environmental: number | null
          governance: number | null
          id: string
          overall_esg: number | null
          snapshot_date: string | null
          social: number | null
        }
        Insert: {
          created_at?: string | null
          environmental?: number | null
          governance?: number | null
          id?: string
          overall_esg?: number | null
          snapshot_date?: string | null
          social?: number | null
        }
        Update: {
          created_at?: string | null
          environmental?: number | null
          governance?: number | null
          id?: string
          overall_esg?: number | null
          snapshot_date?: string | null
          social?: number | null
        }
        Relationships: []
      }
      policy_acknowledgements: {
        Row: {
          acknowledged_at: string | null
          created_at: string | null
          employee_id: string | null
          id: string
          policy_id: string | null
          reminder_count: number | null
          status: string | null
        }
        Insert: {
          acknowledged_at?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          policy_id?: string | null
          reminder_count?: number | null
          status?: string | null
        }
        Update: {
          acknowledged_at?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
          policy_id?: string | null
          reminder_count?: number | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "policy_acknowledgements_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "policy_acknowledgements_policy_id_fkey"
            columns: ["policy_id"]
            isOneToOne: false
            referencedRelation: "esg_policies"
            referencedColumns: ["id"]
          },
        ]
      }
      product_esg_profiles: {
        Row: {
          carbon_per_unit: number | null
          certifications: string | null
          created_at: string | null
          emission_factor_id: string | null
          id: string
          notes: string | null
          product_name: string | null
          recyclable_pct: number | null
          sku: string | null
        }
        Insert: {
          carbon_per_unit?: number | null
          certifications?: string | null
          created_at?: string | null
          emission_factor_id?: string | null
          id?: string
          notes?: string | null
          product_name?: string | null
          recyclable_pct?: number | null
          sku?: string | null
        }
        Update: {
          carbon_per_unit?: number | null
          certifications?: string | null
          created_at?: string | null
          emission_factor_id?: string | null
          id?: string
          notes?: string | null
          product_name?: string | null
          recyclable_pct?: number | null
          sku?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_esg_profiles_emission_factor_id_fkey"
            columns: ["emission_factor_id"]
            isOneToOne: false
            referencedRelation: "emission_factors"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string | null
          department_id: string | null
          email: string | null
          full_name: string | null
          id: string
          points_balance: number | null
          role: Database["public"]["Enums"]["user_role"] | null
          xp: number | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id: string
          points_balance?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
          xp?: number | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string | null
          department_id?: string | null
          email?: string | null
          full_name?: string | null
          id?: string
          points_balance?: number | null
          role?: Database["public"]["Enums"]["user_role"] | null
          xp?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "profiles_department_id_fkey"
            columns: ["department_id"]
            isOneToOne: false
            referencedRelation: "departments"
            referencedColumns: ["id"]
          },
        ]
      }
      reward_redemptions: {
        Row: {
          created_at: string | null
          employee_id: string | null
          id: string
          points_spent: number | null
          redeemed_at: string | null
          reward_id: string | null
          status: string | null
        }
        Insert: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          points_spent?: number | null
          redeemed_at?: string | null
          reward_id?: string | null
          status?: string | null
        }
        Update: {
          created_at?: string | null
          employee_id?: string | null
          id?: string
          points_spent?: number | null
          redeemed_at?: string | null
          reward_id?: string | null
          status?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "reward_redemptions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "reward_redemptions_reward_id_fkey"
            columns: ["reward_id"]
            isOneToOne: false
            referencedRelation: "rewards"
            referencedColumns: ["id"]
          },
        ]
      }
      rewards: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          name: string | null
          points_required: number | null
          status: string | null
          stock: number | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          points_required?: number | null
          status?: string | null
          stock?: number | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          name?: string | null
          points_required?: number | null
          status?: string | null
          stock?: number | null
        }
        Relationships: []
      }
      training_completions: {
        Row: {
          completed_at: string | null
          completion_pct: number | null
          course_name: string | null
          created_at: string | null
          employee_id: string | null
          id: string
        }
        Insert: {
          completed_at?: string | null
          completion_pct?: number | null
          course_name?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
        }
        Update: {
          completed_at?: string | null
          completion_pct?: number | null
          course_name?: string | null
          created_at?: string | null
          employee_id?: string | null
          id?: string
        }
        Relationships: [
          {
            foreignKeyName: "training_completions_employee_id_fkey"
            columns: ["employee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      auth_dept: { Args: never; Returns: string }
      auth_role: {
        Args: never
        Returns: Database["public"]["Enums"]["user_role"]
      }
      create_notification: {
        Args: {
          p_body: string
          p_payload?: Json
          p_title: string
          p_type: Database["public"]["Enums"]["notification_type"]
          p_user: string
        }
        Returns: string
      }
    }
    Enums: {
      approval_status: "pending" | "approved" | "rejected"
      audit_result: "pass" | "fail" | "partial" | "pending"
      category_type: "csr_activity" | "challenge"
      challenge_status:
        | "draft"
        | "active"
        | "under_review"
        | "completed"
        | "archived"
      goal_status: "active" | "achieved" | "missed" | "archived"
      issue_severity: "low" | "medium" | "high" | "critical"
      issue_status: "open" | "in_progress" | "resolved" | "closed"
      notification_type:
        | "compliance_issue"
        | "approval_decision"
        | "policy_reminder"
        | "badge_unlock"
        | "issue_overdue"
      pillar: "environmental" | "social" | "governance"
      source_type:
        | "purchase"
        | "manufacturing"
        | "expense"
        | "fleet"
        | "energy"
        | "manual"
      user_role: "admin" | "manager" | "employee"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {
      approval_status: ["pending", "approved", "rejected"],
      audit_result: ["pass", "fail", "partial", "pending"],
      category_type: ["csr_activity", "challenge"],
      challenge_status: [
        "draft",
        "active",
        "under_review",
        "completed",
        "archived",
      ],
      goal_status: ["active", "achieved", "missed", "archived"],
      issue_severity: ["low", "medium", "high", "critical"],
      issue_status: ["open", "in_progress", "resolved", "closed"],
      notification_type: [
        "compliance_issue",
        "approval_decision",
        "policy_reminder",
        "badge_unlock",
        "issue_overdue",
      ],
      pillar: ["environmental", "social", "governance"],
      source_type: [
        "purchase",
        "manufacturing",
        "expense",
        "fleet",
        "energy",
        "manual",
      ],
      user_role: ["admin", "manager", "employee"],
    },
  },
} as const
