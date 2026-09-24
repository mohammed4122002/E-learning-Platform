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
      account_settings: {
        Row: {
          arabic_digits: boolean
          locale: string
          notification_prefs: Json
          phone: string | null
          show_certificates: boolean
          show_learning_record: boolean
          timezone: string
          updated_at: string
          user_id: string
        }
        Insert: {
          arabic_digits?: boolean
          locale?: string
          notification_prefs?: Json
          phone?: string | null
          show_certificates?: boolean
          show_learning_record?: boolean
          timezone?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          arabic_digits?: boolean
          locale?: string
          notification_prefs?: Json
          phone?: string | null
          show_certificates?: boolean
          show_learning_record?: boolean
          timezone?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "account_settings_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      app_settings: {
        Row: {
          key: string
          value: Json
        }
        Insert: {
          key: string
          value: Json
        }
        Update: {
          key?: string
          value?: Json
        }
        Relationships: []
      }
      assignment_submissions: {
        Row: {
          assignment_id: string
          feedback: string | null
          file_name: string | null
          file_path: string | null
          file_size: number | null
          id: string
          note: string | null
          reviewed_at: string | null
          rubric_scores: Json
          score: number | null
          status: Database["public"]["Enums"]["submission_status"]
          submitted_at: string
          trainee_id: string
        }
        Insert: {
          assignment_id: string
          feedback?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          note?: string | null
          reviewed_at?: string | null
          rubric_scores?: Json
          score?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          trainee_id: string
        }
        Update: {
          assignment_id?: string
          feedback?: string | null
          file_name?: string | null
          file_path?: string | null
          file_size?: number | null
          id?: string
          note?: string | null
          reviewed_at?: string | null
          rubric_scores?: Json
          score?: number | null
          status?: Database["public"]["Enums"]["submission_status"]
          submitted_at?: string
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "assignment_submissions_assignment_id_fkey"
            columns: ["assignment_id"]
            isOneToOne: false
            referencedRelation: "assignments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignment_submissions_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      assignments: {
        Row: {
          accepted_formats: string
          course_id: string
          due_at: string | null
          id: string
          instructions: string | null
          max_attempts: number
          max_file_mb: number
          max_score: number
          module_id: string | null
          opens_at: string
          pass_score: number | null
          requirements: string[]
          rubric: Json
          title: string
          weight_percent: number | null
        }
        Insert: {
          accepted_formats?: string
          course_id: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          max_attempts?: number
          max_file_mb?: number
          max_score?: number
          module_id?: string | null
          opens_at?: string
          pass_score?: number | null
          requirements?: string[]
          rubric?: Json
          title: string
          weight_percent?: number | null
        }
        Update: {
          accepted_formats?: string
          course_id?: string
          due_at?: string | null
          id?: string
          instructions?: string | null
          max_attempts?: number
          max_file_mb?: number
          max_score?: number
          module_id?: string | null
          opens_at?: string
          pass_score?: number | null
          requirements?: string[]
          rubric?: Json
          title?: string
          weight_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "assignments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "assignments_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance: {
        Row: {
          checked_in_at: string
          method: string
          session_id: string
          trainee_id: string
        }
        Insert: {
          checked_in_at?: string
          method?: string
          session_id: string
          trainee_id: string
        }
        Update: {
          checked_in_at?: string
          method?: string
          session_id?: string
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "course_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "attendance_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      attendance_codes: {
        Row: {
          code: string
          expires_at: string
          id: string
          session_id: string
        }
        Insert: {
          code: string
          expires_at: string
          id?: string
          session_id: string
        }
        Update: {
          code?: string
          expires_at?: string
          id?: string
          session_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "attendance_codes_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "course_sessions"
            referencedColumns: ["id"]
          },
        ]
      }
      categories: {
        Row: {
          field_slug: string | null
          id: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          field_slug?: string | null
          id?: string
          name: string
          position?: number
          slug: string
        }
        Update: {
          field_slug?: string | null
          id?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: [
          {
            foreignKeyName: "categories_field_slug_fkey"
            columns: ["field_slug"]
            isOneToOne: false
            referencedRelation: "learning_fields"
            referencedColumns: ["slug"]
          },
        ]
      }
      certificates: {
        Row: {
          code: string
          course_id: string
          course_title: string
          enrollment_id: string
          hours: number | null
          id: string
          issued_at: string
          issuer_organization_id: string | null
          revoke_reason: string | null
          revoked_at: string | null
          status: Database["public"]["Enums"]["certificate_status"]
          trainee_id: string
          trainee_name: string
          trainer_id: string
        }
        Insert: {
          code?: string
          course_id: string
          course_title: string
          enrollment_id: string
          hours?: number | null
          id?: string
          issued_at?: string
          issuer_organization_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          trainee_id: string
          trainee_name: string
          trainer_id: string
        }
        Update: {
          code?: string
          course_id?: string
          course_title?: string
          enrollment_id?: string
          hours?: number | null
          id?: string
          issued_at?: string
          issuer_organization_id?: string | null
          revoke_reason?: string | null
          revoked_at?: string | null
          status?: Database["public"]["Enums"]["certificate_status"]
          trainee_id?: string
          trainee_name?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "certificates_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_issuer_organization_id_fkey"
            columns: ["issuer_organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "certificates_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversation_participants: {
        Row: {
          conversation_id: string
          last_read_at: string | null
          muted_at: string | null
          user_id: string
        }
        Insert: {
          conversation_id: string
          last_read_at?: string | null
          muted_at?: string | null
          user_id: string
        }
        Update: {
          conversation_id?: string
          last_read_at?: string | null
          muted_at?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversation_participants_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "conversation_participants_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      conversations: {
        Row: {
          course_id: string | null
          created_at: string
          id: string
          last_message_at: string
          subject: string
        }
        Insert: {
          course_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          subject: string
        }
        Update: {
          course_id?: string | null
          created_at?: string
          id?: string
          last_message_at?: string
          subject?: string
        }
        Relationships: [
          {
            foreignKeyName: "conversations_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_files: {
        Row: {
          course_id: string
          created_at: string
          created_by: string
          file_path: string
          file_size: number
          id: string
          mime_type: string | null
          published_at: string | null
          title: string
        }
        Insert: {
          course_id: string
          created_at?: string
          created_by?: string
          file_path: string
          file_size?: number
          id?: string
          mime_type?: string | null
          published_at?: string | null
          title: string
        }
        Update: {
          course_id?: string
          created_at?: string
          created_by?: string
          file_path?: string
          file_size?: number
          id?: string
          mime_type?: string | null
          published_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_files_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_files_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_modules: {
        Row: {
          course_id: string
          from_program: boolean
          id: string
          position: number
          title: string
        }
        Insert: {
          course_id: string
          from_program?: boolean
          id?: string
          position: number
          title: string
        }
        Update: {
          course_id?: string
          from_program?: boolean
          id?: string
          position?: number
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_modules_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_private: {
        Row: {
          course_id: string
          meeting_url: string | null
          updated_at: string
        }
        Insert: {
          course_id: string
          meeting_url?: string | null
          updated_at?: string
        }
        Update: {
          course_id?: string
          meeting_url?: string | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_private_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: true
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      course_ratings: {
        Row: {
          comment: string | null
          content_score: number
          course_id: string
          created_at: string
          enrollment_id: string
          id: string
          organization_score: number | null
          trainee_id: string
          trainer_score: number
        }
        Insert: {
          comment?: string | null
          content_score: number
          course_id: string
          created_at?: string
          enrollment_id: string
          id?: string
          organization_score?: number | null
          trainee_id: string
          trainer_score: number
        }
        Update: {
          comment?: string | null
          content_score?: number
          course_id?: string
          created_at?: string
          enrollment_id?: string
          id?: string
          organization_score?: number | null
          trainee_id?: string
          trainer_score?: number
        }
        Relationships: [
          {
            foreignKeyName: "course_ratings_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: true
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_ratings_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      course_sessions: {
        Row: {
          course_id: string
          ends_at: string
          id: string
          location: string | null
          meeting_url: string | null
          module_id: string | null
          position: number
          starts_at: string
          status: string
          title: string
        }
        Insert: {
          course_id: string
          ends_at: string
          id?: string
          location?: string | null
          meeting_url?: string | null
          module_id?: string | null
          position: number
          starts_at: string
          status?: string
          title: string
        }
        Update: {
          course_id?: string
          ends_at?: string
          id?: string
          location?: string | null
          meeting_url?: string | null
          module_id?: string | null
          position?: number
          starts_at?: string
          status?: string
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "course_sessions_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "course_sessions_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      courses: {
        Row: {
          allow_downloads: boolean
          auto_attendance: boolean
          capacity: number | null
          certificate_on_completion: boolean
          city: string | null
          cover_crop: Json | null
          cover_path: string | null
          created_at: string
          currency: string
          duration_hours: number | null
          ends_at: string | null
          id: string
          learners_count: number
          level: Database["public"]["Enums"]["course_level"]
          lifetime_access: boolean
          live_questions: boolean
          meeting_platform: string | null
          min_capacity: number | null
          mode: Database["public"]["Enums"]["course_mode"]
          organization_id: string | null
          page_views: number
          price: number
          price_locked_at: string | null
          pricing_set_at: string | null
          program_id: string
          program_version_id: string
          published_at: string | null
          rating_avg: number
          rating_count: number
          record_sessions: boolean
          requires_provider_approval: boolean
          sales_paused_at: string | null
          slug: string
          starts_at: string | null
          status: Database["public"]["Enums"]["course_status"]
          summary: string | null
          title: string
          trainer_id: string
          updated_at: string
          venue: string | null
          waitlist_enabled: boolean
        }
        Insert: {
          allow_downloads?: boolean
          auto_attendance?: boolean
          capacity?: number | null
          certificate_on_completion?: boolean
          city?: string | null
          cover_crop?: Json | null
          cover_path?: string | null
          created_at?: string
          currency?: string
          duration_hours?: number | null
          ends_at?: string | null
          id?: string
          learners_count?: number
          level?: Database["public"]["Enums"]["course_level"]
          lifetime_access?: boolean
          live_questions?: boolean
          meeting_platform?: string | null
          min_capacity?: number | null
          mode: Database["public"]["Enums"]["course_mode"]
          organization_id?: string | null
          page_views?: number
          price?: number
          price_locked_at?: string | null
          pricing_set_at?: string | null
          program_id: string
          program_version_id: string
          published_at?: string | null
          rating_avg?: number
          rating_count?: number
          record_sessions?: boolean
          requires_provider_approval?: boolean
          sales_paused_at?: string | null
          slug: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          summary?: string | null
          title: string
          trainer_id: string
          updated_at?: string
          venue?: string | null
          waitlist_enabled?: boolean
        }
        Update: {
          allow_downloads?: boolean
          auto_attendance?: boolean
          capacity?: number | null
          certificate_on_completion?: boolean
          city?: string | null
          cover_crop?: Json | null
          cover_path?: string | null
          created_at?: string
          currency?: string
          duration_hours?: number | null
          ends_at?: string | null
          id?: string
          learners_count?: number
          level?: Database["public"]["Enums"]["course_level"]
          lifetime_access?: boolean
          live_questions?: boolean
          meeting_platform?: string | null
          min_capacity?: number | null
          mode?: Database["public"]["Enums"]["course_mode"]
          organization_id?: string | null
          page_views?: number
          price?: number
          price_locked_at?: string | null
          pricing_set_at?: string | null
          program_id?: string
          program_version_id?: string
          published_at?: string | null
          rating_avg?: number
          rating_count?: number
          record_sessions?: boolean
          requires_provider_approval?: boolean
          sales_paused_at?: string | null
          slug?: string
          starts_at?: string | null
          status?: Database["public"]["Enums"]["course_status"]
          summary?: string | null
          title?: string
          trainer_id?: string
          updated_at?: string
          venue?: string | null
          waitlist_enabled?: boolean
        }
        Relationships: [
          {
            foreignKeyName: "courses_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_program_version_id_fkey"
            columns: ["program_version_id"]
            isOneToOne: false
            referencedRelation: "program_versions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "courses_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      discount_codes: {
        Row: {
          active: boolean
          amount_off: number | null
          code: string
          course_id: string | null
          id: string
          max_uses: number | null
          percent_off: number | null
          used_count: number
          valid_until: string | null
        }
        Insert: {
          active?: boolean
          amount_off?: number | null
          code: string
          course_id?: string | null
          id?: string
          max_uses?: number | null
          percent_off?: number | null
          used_count?: number
          valid_until?: string | null
        }
        Update: {
          active?: boolean
          amount_off?: number | null
          code?: string
          course_id?: string | null
          id?: string
          max_uses?: number | null
          percent_off?: number | null
          used_count?: number
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "discount_codes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
        ]
      }
      dispute_attachments: {
        Row: {
          created_at: string
          dispute_id: string
          file_name: string
          file_path: string
          id: string
          size_bytes: number
        }
        Insert: {
          created_at?: string
          dispute_id: string
          file_name: string
          file_path: string
          id?: string
          size_bytes: number
        }
        Update: {
          created_at?: string
          dispute_id?: string
          file_name?: string
          file_path?: string
          id?: string
          size_bytes?: number
        }
        Relationships: [
          {
            foreignKeyName: "dispute_attachments_dispute_id_fkey"
            columns: ["dispute_id"]
            isOneToOne: false
            referencedRelation: "disputes"
            referencedColumns: ["id"]
          },
        ]
      }
      disputes: {
        Row: {
          created_at: string
          details: string
          id: string
          payment_id: string
          reason: string
          resolution: string | null
          status: Database["public"]["Enums"]["dispute_status"]
          trainee_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          details: string
          id?: string
          payment_id: string
          reason: string
          resolution?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          trainee_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          details?: string
          id?: string
          payment_id?: string
          reason?: string
          resolution?: string | null
          status?: Database["public"]["Enums"]["dispute_status"]
          trainee_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "disputes_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: false
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "disputes_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      enrollments: {
        Row: {
          completed_at: string | null
          confirmed_at: string | null
          course_id: string
          created_at: string
          currency: string
          discount_code_id: string | null
          end_reason: string | null
          ended_at: string | null
          funding: string
          hold_expires_at: string | null
          id: string
          list_price: number
          price_paid: number
          status: Database["public"]["Enums"]["enrollment_status"]
          trainee_id: string
          vat_amount: number
        }
        Insert: {
          completed_at?: string | null
          confirmed_at?: string | null
          course_id: string
          created_at?: string
          currency?: string
          discount_code_id?: string | null
          end_reason?: string | null
          ended_at?: string | null
          funding?: string
          hold_expires_at?: string | null
          id?: string
          list_price: number
          price_paid?: number
          status: Database["public"]["Enums"]["enrollment_status"]
          trainee_id: string
          vat_amount?: number
        }
        Update: {
          completed_at?: string | null
          confirmed_at?: string | null
          course_id?: string
          created_at?: string
          currency?: string
          discount_code_id?: string | null
          end_reason?: string | null
          ended_at?: string | null
          funding?: string
          hold_expires_at?: string | null
          id?: string
          list_price?: number
          price_paid?: number
          status?: Database["public"]["Enums"]["enrollment_status"]
          trainee_id?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "enrollments_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_discount_code_id_fkey"
            columns: ["discount_code_id"]
            isOneToOne: false
            referencedRelation: "discount_codes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "enrollments_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      experiences: {
        Row: {
          created_at: string
          description: string | null
          end_date: string | null
          id: string
          is_current: boolean
          organization: string
          start_date: string
          title: string
          user_id: string
        }
        Insert: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          organization: string
          start_date: string
          title: string
          user_id: string
        }
        Update: {
          created_at?: string
          description?: string | null
          end_date?: string | null
          id?: string
          is_current?: boolean
          organization?: string
          start_date?: string
          title?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "experiences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      external_certificates: {
        Row: {
          created_at: string
          credential_url: string | null
          expires_on: string | null
          field: string | null
          file_path: string | null
          id: string
          issued_on: string
          issuer: string
          reviewer_note: string | null
          serial_number: string | null
          status: Database["public"]["Enums"]["review_status"]
          title: string
          trainee_id: string
          updated_at: string
        }
        Insert: {
          created_at?: string
          credential_url?: string | null
          expires_on?: string | null
          field?: string | null
          file_path?: string | null
          id?: string
          issued_on: string
          issuer: string
          reviewer_note?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title: string
          trainee_id: string
          updated_at?: string
        }
        Update: {
          created_at?: string
          credential_url?: string | null
          expires_on?: string | null
          field?: string | null
          file_path?: string | null
          id?: string
          issued_on?: string
          issuer?: string
          reviewer_note?: string | null
          serial_number?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          title?: string
          trainee_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "external_certificates_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      favorites: {
        Row: {
          course_id: string
          created_at: string
          user_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          user_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "favorites_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "favorites_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      follows: {
        Row: {
          category_id: string | null
          created_at: string
          id: string
          organization_id: string | null
          trainer_id: string | null
          user_id: string
        }
        Insert: {
          category_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          trainer_id?: string | null
          user_id: string
        }
        Update: {
          category_id?: string | null
          created_at?: string
          id?: string
          organization_id?: string | null
          trainer_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "follows_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "follows_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_article_feedback: {
        Row: {
          article_id: string
          created_at: string
          helpful: boolean
          user_id: string
        }
        Insert: {
          article_id: string
          created_at?: string
          helpful: boolean
          user_id: string
        }
        Update: {
          article_id?: string
          created_at?: string
          helpful?: boolean
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "help_article_feedback_article_id_fkey"
            columns: ["article_id"]
            isOneToOne: false
            referencedRelation: "help_articles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "help_article_feedback_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      help_articles: {
        Row: {
          audience: string
          body: string
          category: string
          cta_href: string | null
          cta_label: string | null
          id: string
          is_featured: boolean
          position: number
          published: boolean
          read_minutes: number | null
          slug: string
          title: string
        }
        Insert: {
          audience?: string
          body: string
          category: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          is_featured?: boolean
          position?: number
          published?: boolean
          read_minutes?: number | null
          slug: string
          title: string
        }
        Update: {
          audience?: string
          body?: string
          category?: string
          cta_href?: string | null
          cta_label?: string | null
          id?: string
          is_featured?: boolean
          position?: number
          published?: boolean
          read_minutes?: number | null
          slug?: string
          title?: string
        }
        Relationships: []
      }
      identity_verifications: {
        Row: {
          document_back_path: string | null
          document_number_last4: string | null
          document_path: string
          document_type: string
          id: string
          reviewed_at: string | null
          reviewer_note: string | null
          selfie_path: string | null
          status: Database["public"]["Enums"]["review_status"]
          submitted_at: string
          user_id: string
        }
        Insert: {
          document_back_path?: string | null
          document_number_last4?: string | null
          document_path: string
          document_type: string
          id?: string
          reviewed_at?: string | null
          reviewer_note?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_at?: string
          user_id: string
        }
        Update: {
          document_back_path?: string | null
          document_number_last4?: string | null
          document_path?: string
          document_type?: string
          id?: string
          reviewed_at?: string | null
          reviewer_note?: string | null
          selfie_path?: string | null
          status?: Database["public"]["Enums"]["review_status"]
          submitted_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "identity_verifications_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      inquiries: {
        Row: {
          answer: string | null
          answered_at: string | null
          course_id: string
          created_at: string
          id: string
          question: string
          topic: string
          user_id: string
        }
        Insert: {
          answer?: string | null
          answered_at?: string | null
          course_id: string
          created_at?: string
          id?: string
          question: string
          topic: string
          user_id: string
        }
        Update: {
          answer?: string | null
          answered_at?: string | null
          course_id?: string
          created_at?: string
          id?: string
          question?: string
          topic?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "inquiries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inquiries_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      learning_fields: {
        Row: {
          icon: string
          name: string
          position: number
          slug: string
        }
        Insert: {
          icon: string
          name: string
          position: number
          slug: string
        }
        Update: {
          icon?: string
          name?: string
          position?: number
          slug?: string
        }
        Relationships: []
      }
      lesson_progress: {
        Row: {
          completed_at: string | null
          course_id: string
          lesson_id: string
          position_seconds: number
          trainee_id: string
          updated_at: string
        }
        Insert: {
          completed_at?: string | null
          course_id: string
          lesson_id: string
          position_seconds?: number
          trainee_id: string
          updated_at?: string
        }
        Update: {
          completed_at?: string | null
          course_id?: string
          lesson_id?: string
          position_seconds?: number
          trainee_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "lesson_progress_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lesson_progress_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      lessons: {
        Row: {
          body: string | null
          course_id: string
          created_at: string
          duration_seconds: number
          id: string
          is_preview: boolean
          kind: Database["public"]["Enums"]["lesson_kind"]
          media_path: string | null
          media_size: number | null
          media_type: string | null
          module_id: string
          position: number
          published_at: string | null
          title: string
        }
        Insert: {
          body?: string | null
          course_id: string
          created_at?: string
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          kind?: Database["public"]["Enums"]["lesson_kind"]
          media_path?: string | null
          media_size?: number | null
          media_type?: string | null
          module_id: string
          position: number
          published_at?: string | null
          title: string
        }
        Update: {
          body?: string | null
          course_id?: string
          created_at?: string
          duration_seconds?: number
          id?: string
          is_preview?: boolean
          kind?: Database["public"]["Enums"]["lesson_kind"]
          media_path?: string | null
          media_size?: number | null
          media_type?: string | null
          module_id?: string
          position?: number
          published_at?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "lessons_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "lessons_module_id_fkey"
            columns: ["module_id"]
            isOneToOne: false
            referencedRelation: "course_modules"
            referencedColumns: ["id"]
          },
        ]
      }
      messages: {
        Row: {
          attachment_path: string | null
          body: string
          conversation_id: string
          created_at: string
          id: string
          sender_id: string
        }
        Insert: {
          attachment_path?: string | null
          body: string
          conversation_id: string
          created_at?: string
          id?: string
          sender_id: string
        }
        Update: {
          attachment_path?: string | null
          body?: string
          conversation_id?: string
          created_at?: string
          id?: string
          sender_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "messages_conversation_id_fkey"
            columns: ["conversation_id"]
            isOneToOne: false
            referencedRelation: "conversations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "messages_sender_id_fkey"
            columns: ["sender_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      notifications: {
        Row: {
          archived_at: string | null
          body: string | null
          created_at: string
          id: string
          kind: string
          link: string | null
          read_at: string | null
          title: string
          user_id: string
        }
        Insert: {
          archived_at?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind: string
          link?: string | null
          read_at?: string | null
          title: string
          user_id: string
        }
        Update: {
          archived_at?: string | null
          body?: string | null
          created_at?: string
          id?: string
          kind?: string
          link?: string | null
          read_at?: string | null
          title?: string
          user_id?: string
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
      organization_members: {
        Row: {
          created_at: string
          organization_id: string
          role: string
          user_id: string
        }
        Insert: {
          created_at?: string
          organization_id: string
          role?: string
          user_id: string
        }
        Update: {
          created_at?: string
          organization_id?: string
          role?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "organization_members_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "organization_members_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      organizations: {
        Row: {
          city: string | null
          created_at: string
          created_by: string | null
          id: string
          kind: Database["public"]["Enums"]["organization_kind"]
          logo_path: string | null
          name: string
          slug: string
          verification_status: Database["public"]["Enums"]["review_status"]
        }
        Insert: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind: Database["public"]["Enums"]["organization_kind"]
          logo_path?: string | null
          name: string
          slug: string
          verification_status?: Database["public"]["Enums"]["review_status"]
        }
        Update: {
          city?: string | null
          created_at?: string
          created_by?: string | null
          id?: string
          kind?: Database["public"]["Enums"]["organization_kind"]
          logo_path?: string | null
          name?: string
          slug?: string
          verification_status?: Database["public"]["Enums"]["review_status"]
        }
        Relationships: [
          {
            foreignKeyName: "organizations_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      payments: {
        Row: {
          amount: number
          created_at: string
          currency: string
          enrollment_id: string
          failure_reason: string | null
          id: string
          idempotency_key: string
          method: string
          provider: string
          provider_ref: string | null
          status: Database["public"]["Enums"]["payment_status"]
          trainee_id: string
          updated_at: string
        }
        Insert: {
          amount: number
          created_at?: string
          currency?: string
          enrollment_id: string
          failure_reason?: string | null
          id?: string
          idempotency_key: string
          method: string
          provider: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trainee_id: string
          updated_at?: string
        }
        Update: {
          amount?: number
          created_at?: string
          currency?: string
          enrollment_id?: string
          failure_reason?: string | null
          id?: string
          idempotency_key?: string
          method?: string
          provider?: string
          provider_ref?: string | null
          status?: Database["public"]["Enums"]["payment_status"]
          trainee_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "payments_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "payments_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          avatar_path: string | null
          bio: string | null
          city: string | null
          created_at: string
          deletion_requested_at: string | null
          frozen_at: string | null
          full_name: string
          headline: string | null
          id: string
          identity_status: Database["public"]["Enums"]["review_status"] | null
          is_public: boolean
          updated_at: string
        }
        Insert: {
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          frozen_at?: string | null
          full_name?: string
          headline?: string | null
          id: string
          identity_status?: Database["public"]["Enums"]["review_status"] | null
          is_public?: boolean
          updated_at?: string
        }
        Update: {
          avatar_path?: string | null
          bio?: string | null
          city?: string | null
          created_at?: string
          deletion_requested_at?: string | null
          frozen_at?: string | null
          full_name?: string
          headline?: string | null
          id?: string
          identity_status?: Database["public"]["Enums"]["review_status"] | null
          is_public?: boolean
          updated_at?: string
        }
        Relationships: []
      }
      program_declarations: {
        Row: {
          clauses: string[]
          content_hash: string
          created_at: string
          id: string
          program_id: string
          reference: string
          revision: number
          snapshot: Json
          user_id: string
        }
        Insert: {
          clauses: string[]
          content_hash: string
          created_at?: string
          id?: string
          program_id: string
          reference: string
          revision: number
          snapshot: Json
          user_id: string
        }
        Update: {
          clauses?: string[]
          content_hash?: string
          created_at?: string
          id?: string
          program_id?: string
          reference?: string
          revision?: number
          snapshot?: Json
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_declarations_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_declarations_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      program_items: {
        Row: {
          created_at: string
          due_note: string | null
          duration_minutes: number | null
          id: string
          kind: string
          max_score: number | null
          media_name: string | null
          media_path: string | null
          media_size: number | null
          media_type: string | null
          position: number
          program_id: string
          summary: string | null
          title: string
          unit_id: string
          weight_percent: number | null
        }
        Insert: {
          created_at?: string
          due_note?: string | null
          duration_minutes?: number | null
          id?: string
          kind: string
          max_score?: number | null
          media_name?: string | null
          media_path?: string | null
          media_size?: number | null
          media_type?: string | null
          position?: number
          program_id: string
          summary?: string | null
          title: string
          unit_id: string
          weight_percent?: number | null
        }
        Update: {
          created_at?: string
          due_note?: string | null
          duration_minutes?: number | null
          id?: string
          kind?: string
          max_score?: number | null
          media_name?: string | null
          media_path?: string | null
          media_size?: number | null
          media_type?: string | null
          position?: number
          program_id?: string
          summary?: string | null
          title?: string
          unit_id?: string
          weight_percent?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "program_items_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_items_unit_id_program_id_fkey"
            columns: ["unit_id", "program_id"]
            isOneToOne: false
            referencedRelation: "program_units"
            referencedColumns: ["id", "program_id"]
          },
        ]
      }
      program_review_requests: {
        Row: {
          decided_at: string | null
          decided_by: string | null
          declaration_id: string
          findings: Json
          id: string
          note: string | null
          program_id: string
          reason: string | null
          revision: number
          status: string
          submitted_at: string
          submitted_by: string
          version_id: string | null
        }
        Insert: {
          decided_at?: string | null
          decided_by?: string | null
          declaration_id: string
          findings?: Json
          id?: string
          note?: string | null
          program_id: string
          reason?: string | null
          revision: number
          status?: string
          submitted_at?: string
          submitted_by: string
          version_id?: string | null
        }
        Update: {
          decided_at?: string | null
          decided_by?: string | null
          declaration_id?: string
          findings?: Json
          id?: string
          note?: string | null
          program_id?: string
          reason?: string | null
          revision?: number
          status?: string
          submitted_at?: string
          submitted_by?: string
          version_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "program_review_requests_decided_by_fkey"
            columns: ["decided_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_review_requests_declaration_id_fkey"
            columns: ["declaration_id"]
            isOneToOne: false
            referencedRelation: "program_declarations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_review_requests_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_review_requests_submitted_by_fkey"
            columns: ["submitted_by"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "program_review_requests_version_id_fkey"
            columns: ["version_id"]
            isOneToOne: false
            referencedRelation: "program_versions"
            referencedColumns: ["id"]
          },
        ]
      }
      program_units: {
        Row: {
          created_at: string
          id: string
          kind: string
          position: number
          program_id: string
          summary: string | null
          title: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind?: string
          position?: number
          program_id: string
          summary?: string | null
          title: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: string
          position?: number
          program_id?: string
          summary?: string | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "program_units_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      program_versions: {
        Row: {
          created_at: string
          id: string
          program_id: string
          snapshot: Json
          version: number
        }
        Insert: {
          created_at?: string
          id?: string
          program_id: string
          snapshot: Json
          version: number
        }
        Update: {
          created_at?: string
          id?: string
          program_id?: string
          snapshot?: Json
          version?: number
        }
        Relationships: [
          {
            foreignKeyName: "program_versions_program_id_fkey"
            columns: ["program_id"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
        ]
      }
      programs: {
        Row: {
          audience: string[]
          category_id: string | null
          cover_path: string | null
          created_at: string
          current_version: number
          decided_at: string | null
          derived_from: string | null
          description: string | null
          id: string
          language: string
          level: Database["public"]["Enums"]["course_level"]
          objectives: string[]
          organization_id: string | null
          owner_id: string
          prerequisites: string | null
          published_at: string | null
          reference_price: number | null
          review_state: Database["public"]["Enums"]["program_review_state"]
          revision: number
          skills: string[]
          slug: string
          status: Database["public"]["Enums"]["program_status"]
          submitted_at: string | null
          summary: string | null
          title: string
          total_hours: number | null
          updated_at: string
        }
        Insert: {
          audience?: string[]
          category_id?: string | null
          cover_path?: string | null
          created_at?: string
          current_version?: number
          decided_at?: string | null
          derived_from?: string | null
          description?: string | null
          id?: string
          language?: string
          level?: Database["public"]["Enums"]["course_level"]
          objectives?: string[]
          organization_id?: string | null
          owner_id: string
          prerequisites?: string | null
          published_at?: string | null
          reference_price?: number | null
          review_state?: Database["public"]["Enums"]["program_review_state"]
          revision?: number
          skills?: string[]
          slug: string
          status?: Database["public"]["Enums"]["program_status"]
          submitted_at?: string | null
          summary?: string | null
          title: string
          total_hours?: number | null
          updated_at?: string
        }
        Update: {
          audience?: string[]
          category_id?: string | null
          cover_path?: string | null
          created_at?: string
          current_version?: number
          decided_at?: string | null
          derived_from?: string | null
          description?: string | null
          id?: string
          language?: string
          level?: Database["public"]["Enums"]["course_level"]
          objectives?: string[]
          organization_id?: string | null
          owner_id?: string
          prerequisites?: string | null
          published_at?: string | null
          reference_price?: number | null
          review_state?: Database["public"]["Enums"]["program_review_state"]
          revision?: number
          skills?: string[]
          slug?: string
          status?: Database["public"]["Enums"]["program_status"]
          submitted_at?: string | null
          summary?: string | null
          title?: string
          total_hours?: number | null
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "programs_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_derived_from_fkey"
            columns: ["derived_from"]
            isOneToOne: false
            referencedRelation: "programs"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "programs_owner_id_fkey"
            columns: ["owner_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      queue_dismissals: {
        Row: {
          created_at: string
          hidden_until: string | null
          item_key: string
          user_id: string
        }
        Insert: {
          created_at?: string
          hidden_until?: string | null
          item_key: string
          user_id: string
        }
        Update: {
          created_at?: string
          hidden_until?: string | null
          item_key?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "queue_dismissals_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quiz_attempts: {
        Row: {
          answers: Json
          id: string
          passed: boolean | null
          quiz_id: string
          score_percent: number | null
          started_at: string
          submitted_at: string | null
          trainee_id: string
        }
        Insert: {
          answers?: Json
          id?: string
          passed?: boolean | null
          quiz_id: string
          score_percent?: number | null
          started_at?: string
          submitted_at?: string | null
          trainee_id: string
        }
        Update: {
          answers?: Json
          id?: string
          passed?: boolean | null
          quiz_id?: string
          score_percent?: number | null
          started_at?: string
          submitted_at?: string | null
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "quiz_attempts_quiz_id_fkey"
            columns: ["quiz_id"]
            isOneToOne: false
            referencedRelation: "quizzes"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quiz_attempts_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      quizzes: {
        Row: {
          course_id: string
          id: string
          lesson_id: string | null
          max_attempts: number
          pass_percent: number
          questions: Json
          time_limit_minutes: number | null
          title: string
        }
        Insert: {
          course_id: string
          id?: string
          lesson_id?: string | null
          max_attempts?: number
          pass_percent?: number
          questions?: Json
          time_limit_minutes?: number | null
          title: string
        }
        Update: {
          course_id?: string
          id?: string
          lesson_id?: string | null
          max_attempts?: number
          pass_percent?: number
          questions?: Json
          time_limit_minutes?: number | null
          title?: string
        }
        Relationships: [
          {
            foreignKeyName: "quizzes_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "quizzes_lesson_id_fkey"
            columns: ["lesson_id"]
            isOneToOne: false
            referencedRelation: "lessons"
            referencedColumns: ["id"]
          },
        ]
      }
      receipts: {
        Row: {
          amount: number
          currency: string
          id: string
          issued_at: string
          number: string
          payment_id: string
          vat_amount: number
        }
        Insert: {
          amount: number
          currency: string
          id?: string
          issued_at?: string
          number?: string
          payment_id: string
          vat_amount?: number
        }
        Update: {
          amount?: number
          currency?: string
          id?: string
          issued_at?: string
          number?: string
          payment_id?: string
          vat_amount?: number
        }
        Relationships: [
          {
            foreignKeyName: "receipts_payment_id_fkey"
            columns: ["payment_id"]
            isOneToOne: true
            referencedRelation: "payments"
            referencedColumns: ["id"]
          },
        ]
      }
      refund_requests: {
        Row: {
          amount: number
          cancelled_at: string | null
          created_at: string
          decided_at: string | null
          decision_note: string | null
          details: string | null
          enrollment_id: string
          id: string
          reason: string
          requires_admin: boolean
          status: Database["public"]["Enums"]["request_status"]
          trainee_id: string
        }
        Insert: {
          amount: number
          cancelled_at?: string | null
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          details?: string | null
          enrollment_id: string
          id?: string
          reason: string
          requires_admin?: boolean
          status?: Database["public"]["Enums"]["request_status"]
          trainee_id: string
        }
        Update: {
          amount?: number
          cancelled_at?: string | null
          created_at?: string
          decided_at?: string | null
          decision_note?: string | null
          details?: string | null
          enrollment_id?: string
          id?: string
          reason?: string
          requires_admin?: boolean
          status?: Database["public"]["Enums"]["request_status"]
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "refund_requests_enrollment_id_fkey"
            columns: ["enrollment_id"]
            isOneToOne: false
            referencedRelation: "enrollments"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "refund_requests_trainee_id_fkey"
            columns: ["trainee_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      terms_acceptances: {
        Row: {
          accepted_at: string
          id: string
          user_id: string
          version: string
        }
        Insert: {
          accepted_at?: string
          id?: string
          user_id: string
          version: string
        }
        Update: {
          accepted_at?: string
          id?: string
          user_id?: string
          version?: string
        }
        Relationships: [
          {
            foreignKeyName: "terms_acceptances_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainee_preferences: {
        Row: {
          category_ids: string[]
          completed_at: string | null
          employer: string | null
          experience_level: string | null
          experience_years: string | null
          field_slugs: string[]
          goal: string | null
          job_title: string | null
          level: Database["public"]["Enums"]["course_level"] | null
          modes: Database["public"]["Enums"]["course_mode"][]
          skills: string[]
          step: number
          updated_at: string
          user_id: string
          weekly_hours: string | null
        }
        Insert: {
          category_ids?: string[]
          completed_at?: string | null
          employer?: string | null
          experience_level?: string | null
          experience_years?: string | null
          field_slugs?: string[]
          goal?: string | null
          job_title?: string | null
          level?: Database["public"]["Enums"]["course_level"] | null
          modes?: Database["public"]["Enums"]["course_mode"][]
          skills?: string[]
          step?: number
          updated_at?: string
          user_id: string
          weekly_hours?: string | null
        }
        Update: {
          category_ids?: string[]
          completed_at?: string | null
          employer?: string | null
          experience_level?: string | null
          experience_years?: string | null
          field_slugs?: string[]
          goal?: string | null
          job_title?: string | null
          level?: Database["public"]["Enums"]["course_level"] | null
          modes?: Database["public"]["Enums"]["course_mode"][]
          skills?: string[]
          step?: number
          updated_at?: string
          user_id?: string
          weekly_hours?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "trainee_preferences_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_calendar_events: {
        Row: {
          all_day: boolean
          created_at: string
          ends_at: string
          id: string
          kind: string
          recurrence: string
          starts_at: string
          title: string
          trainer_id: string
        }
        Insert: {
          all_day?: boolean
          created_at?: string
          ends_at: string
          id?: string
          kind: string
          recurrence?: string
          starts_at: string
          title: string
          trainer_id: string
        }
        Update: {
          all_day?: boolean
          created_at?: string
          ends_at?: string
          id?: string
          kind?: string
          recurrence?: string
          starts_at?: string
          title?: string
          trainer_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_calendar_events_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_portfolio_items: {
        Row: {
          courses_count: number | null
          created_at: string
          duration_days: number | null
          file_format: string | null
          happened_on: string | null
          id: string
          image_paths: string[]
          kind: string
          organization: string | null
          page_count: number | null
          title: string
          trainees_count: number | null
          trainer_id: string
          updated_at: string
        }
        Insert: {
          courses_count?: number | null
          created_at?: string
          duration_days?: number | null
          file_format?: string | null
          happened_on?: string | null
          id?: string
          image_paths?: string[]
          kind: string
          organization?: string | null
          page_count?: number | null
          title: string
          trainees_count?: number | null
          trainer_id: string
          updated_at?: string
        }
        Update: {
          courses_count?: number | null
          created_at?: string
          duration_days?: number | null
          file_format?: string | null
          happened_on?: string | null
          id?: string
          image_paths?: string[]
          kind?: string
          organization?: string | null
          page_count?: number | null
          title?: string
          trainees_count?: number | null
          trainer_id?: string
          updated_at?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_portfolio_items_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_profiles: {
        Row: {
          audience: string | null
          created_at: string
          cv_name: string | null
          cv_path: string | null
          cv_size: number | null
          delivery_modes: Database["public"]["Enums"]["course_mode"][]
          experience_band: string | null
          goal: string | null
          hidden_program_ids: string[]
          languages: string[]
          onboarding_completed_at: string | null
          onboarding_step: number
          profile_completed_at: string | null
          skills: string[]
          specialties: string[]
          updated_at: string
          user_id: string
        }
        Insert: {
          audience?: string | null
          created_at?: string
          cv_name?: string | null
          cv_path?: string | null
          cv_size?: number | null
          delivery_modes?: Database["public"]["Enums"]["course_mode"][]
          experience_band?: string | null
          goal?: string | null
          hidden_program_ids?: string[]
          languages?: string[]
          onboarding_completed_at?: string | null
          onboarding_step?: number
          profile_completed_at?: string | null
          skills?: string[]
          specialties?: string[]
          updated_at?: string
          user_id: string
        }
        Update: {
          audience?: string | null
          created_at?: string
          cv_name?: string | null
          cv_path?: string | null
          cv_size?: number | null
          delivery_modes?: Database["public"]["Enums"]["course_mode"][]
          experience_band?: string | null
          goal?: string | null
          hidden_program_ids?: string[]
          languages?: string[]
          onboarding_completed_at?: string | null
          onboarding_step?: number
          profile_completed_at?: string | null
          skills?: string[]
          specialties?: string[]
          updated_at?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "trainer_profiles_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: true
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      trainer_qualifications: {
        Row: {
          created_at: string
          file_path: string | null
          id: string
          issuer: string
          kind: string
          title: string
          trainer_id: string
          verified_at: string | null
          year: number | null
        }
        Insert: {
          created_at?: string
          file_path?: string | null
          id?: string
          issuer: string
          kind: string
          title: string
          trainer_id: string
          verified_at?: string | null
          year?: number | null
        }
        Update: {
          created_at?: string
          file_path?: string | null
          id?: string
          issuer?: string
          kind?: string
          title?: string
          trainer_id?: string
          verified_at?: string | null
          year?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "trainer_qualifications_trainer_id_fkey"
            columns: ["trainer_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      user_workspaces: {
        Row: {
          created_at: string
          id: string
          is_default: boolean
          kind: Database["public"]["Enums"]["workspace_kind"]
          organization_id: string | null
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          is_default?: boolean
          kind: Database["public"]["Enums"]["workspace_kind"]
          organization_id?: string | null
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          is_default?: boolean
          kind?: Database["public"]["Enums"]["workspace_kind"]
          organization_id?: string | null
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "user_workspaces_organization_id_fkey"
            columns: ["organization_id"]
            isOneToOne: false
            referencedRelation: "organizations"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "user_workspaces_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      violation_reports: {
        Row: {
          created_at: string
          details: string | null
          evidence_path: string | null
          id: string
          reason: string
          reporter_id: string
          status: string
          target_id: string
          target_type: string
          withdrawn_at: string | null
        }
        Insert: {
          created_at?: string
          details?: string | null
          evidence_path?: string | null
          id?: string
          reason: string
          reporter_id: string
          status?: string
          target_id: string
          target_type: string
          withdrawn_at?: string | null
        }
        Update: {
          created_at?: string
          details?: string | null
          evidence_path?: string | null
          id?: string
          reason?: string
          reporter_id?: string
          status?: string
          target_id?: string
          target_type?: string
          withdrawn_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "violation_reports_reporter_id_fkey"
            columns: ["reporter_id"]
            isOneToOne: false
            referencedRelation: "profiles"
            referencedColumns: ["id"]
          },
        ]
      }
      waitlist_entries: {
        Row: {
          course_id: string
          created_at: string
          id: string
          invite_expires_at: string | null
          invited_at: string | null
          status: Database["public"]["Enums"]["waitlist_status"]
          trainee_id: string
        }
        Insert: {
          course_id: string
          created_at?: string
          id?: string
          invite_expires_at?: string | null
          invited_at?: string | null
          status?: Database["public"]["Enums"]["waitlist_status"]
          trainee_id: string
        }
        Update: {
          course_id?: string
          created_at?: string
          id?: string
          invite_expires_at?: string | null
          invited_at?: string | null
          status?: Database["public"]["Enums"]["waitlist_status"]
          trainee_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "waitlist_entries_course_id_fkey"
            columns: ["course_id"]
            isOneToOne: false
            referencedRelation: "courses"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "waitlist_entries_trainee_id_fkey"
            columns: ["trainee_id"]
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
      accept_waitlist_invite: {
        Args: { p_entry: string }
        Returns: {
          enrollment_id: string
          hold_expires_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          total: number
        }[]
      }
      account_deletion_blockers: {
        Args: never
        Returns: {
          reason: string
        }[]
      }
      add_dispute_attachment: {
        Args: {
          p_dispute: string
          p_name: string
          p_path: string
          p_size: number
        }
        Returns: string
      }
      add_trainer_event: {
        Args: {
          p_all_day: boolean
          p_ends: string
          p_kind: string
          p_recurrence: string
          p_starts: string
          p_title: string
        }
        Returns: string
      }
      add_workspace: {
        Args: {
          p_kind: Database["public"]["Enums"]["workspace_kind"]
          p_org_city?: string
          p_org_name?: string
        }
        Returns: string
      }
      can_edit_program: { Args: { p: string }; Returns: boolean }
      cancel_refund_request: { Args: { p_refund: string }; Returns: undefined }
      certificate_conditions: {
        Args: { p_enrollment: string }
        Returns: {
          done: number
          info: Json
          key: string
          met: boolean
          total: number
        }[]
      }
      check_in: {
        Args: { p_code: string }
        Returns: {
          already: boolean
          checked_in_at: string
          session_id: string
        }[]
      }
      clone_program: {
        Args: {
          p_assignments: boolean
          p_materials: boolean
          p_objectives: boolean
          p_source: string
          p_title: string
          p_units: boolean
        }
        Returns: string
      }
      course_outline: {
        Args: { p_course: string }
        Returns: {
          duration_seconds: number
          is_preview: boolean
          kind: Database["public"]["Enums"]["lesson_kind"]
          lesson_id: string
          lesson_position: number
          lesson_title: string
          module_id: string
          module_position: number
          module_title: string
        }[]
      }
      course_progress: {
        Args: { p_course: string; p_trainee?: string }
        Returns: {
          completed: number
          percent: number
          total: number
        }[]
      }
      course_public_facts: {
        Args: { p_courses: string[] }
        Returns: {
          assignments: number
          course_id: string
          first_session_at: string
          last_session_ends_at: string
          lessons: number
          modules: number
          quizzes: number
          seats_left: number
          sessions: number
        }[]
      }
      course_publish_blockers: {
        Args: { p_course: string }
        Returns: {
          code: string
          detail: string
        }[]
      }
      course_quizzes: {
        Args: { p_course: string }
        Returns: {
          id: string
          lesson_id: string
          max_attempts: number
          pass_percent: number
          question_count: number
          time_limit_minutes: number
          title: string
        }[]
      }
      course_rating_breakdown: {
        Args: { p_course: string }
        Returns: {
          count: number
          stars: number
        }[]
      }
      course_sales: {
        Args: { p_course: string }
        Returns: {
          avatar_path: string
          commission_percent: number
          confirmed_at: string
          created_at: string
          currency: string
          discount_amount: number
          discount_code: string
          enrollment_id: string
          enrollment_status: Database["public"]["Enums"]["enrollment_status"]
          list_price: number
          paid_at: string
          payment_id: string
          payment_method: string
          payment_ref: string
          payment_status: Database["public"]["Enums"]["payment_status"]
          price_paid: number
          receipt_number: string
          refund_amount: number
          refund_decided_at: string
          refund_reason: string
          refund_status: Database["public"]["Enums"]["request_status"]
          trainee_id: string
          trainee_name: string
          vat_amount: number
        }[]
      }
      course_seats_left: { Args: { p_course: string }; Returns: number }
      course_seats_taken: { Args: { c: string }; Returns: number }
      create_course: {
        Args: {
          p_mode: Database["public"]["Enums"]["course_mode"]
          p_program_version: string
          p_title?: string
        }
        Returns: string
      }
      create_payment: {
        Args: {
          p_enrollment: string
          p_idempotency_key: string
          p_method: string
        }
        Returns: string
      }
      create_program: { Args: { p_title: string }; Returns: string }
      discover_courses: {
        Args: {
          p_categories?: string[]
          p_cities?: string[]
          p_levels?: Database["public"]["Enums"]["course_level"][]
          p_limit?: number
          p_min_rating?: number
          p_modes?: Database["public"]["Enums"]["course_mode"][]
          p_offset?: number
          p_price_max?: number
          p_price_min?: number
          p_q?: string
          p_sort?: string
        }
        Returns: {
          course_id: string
          total: number
        }[]
      }
      discover_facets: {
        Args: {
          p_categories?: string[]
          p_cities?: string[]
          p_levels?: Database["public"]["Enums"]["course_level"][]
          p_min_rating?: number
          p_modes?: Database["public"]["Enums"]["course_mode"][]
          p_price_max?: number
          p_price_min?: number
          p_q?: string
        }
        Returns: {
          facet: string
          hits: number
          value: string
        }[]
      }
      discover_pattern: { Args: { p_q: string }; Returns: string }
      discover_suggest: {
        Args: { p_q?: string }
        Returns: {
          hits: number
          hours: number
          id: string
          kind: string
          label: string
          rating: number
          slug: string
        }[]
      }
      expire_stale_holds: { Args: never; Returns: number }
      freeze_account: { Args: never; Returns: undefined }
      get_quiz: {
        Args: { p_quiz: string }
        Returns: {
          course_id: string
          id: string
          pass_percent: number
          questions: Json
          time_limit_minutes: number
          title: string
        }[]
      }
      has_workspace: {
        Args: { k: Database["public"]["Enums"]["workspace_kind"] }
        Returns: boolean
      }
      invite_next_waitlisted: { Args: { p_course: string }; Returns: undefined }
      is_admin: { Args: never; Returns: boolean }
      is_conversation_folder: {
        Args: { object_name: string }
        Returns: boolean
      }
      is_conversation_member: { Args: { c: string }; Returns: boolean }
      is_enrolled: { Args: { c: string }; Returns: boolean }
      is_org_member: { Args: { org: string }; Returns: boolean }
      issue_certificate: { Args: { p_enrollment: string }; Returns: string }
      join_live_session: {
        Args: { p_session: string }
        Returns: {
          checked_in_at: string
          meeting_url: string
        }[]
      }
      join_waitlist: { Args: { p_course: string }; Returns: string }
      leave_waitlist: { Args: { p_entry: string }; Returns: undefined }
      manages_course: { Args: { c: string }; Returns: boolean }
      my_waitlist_positions: {
        Args: never
        Returns: {
          entry_id: string
          queue_position: number
          total: number
        }[]
      }
      notify: {
        Args: { b: string; k: string; l: string; t: string; u: string }
        Returns: undefined
      }
      notify_course_trainees: {
        Args: { p_body: string; p_course: string; p_title: string }
        Returns: number
      }
      open_dispute: {
        Args: { p_details: string; p_payment: string; p_reason: string }
        Returns: string
      }
      owns_program: { Args: { p: string }; Returns: boolean }
      platform_commission_percent: { Args: never; Returns: number }
      program_missing_fields: { Args: { p: string }; Returns: string[] }
      program_snapshot: { Args: { p: string }; Returns: Json }
      public_profile: { Args: { p_user: string }; Returns: Json }
      publish_course: {
        Args: { p_ack: boolean; p_course: string }
        Returns: undefined
      }
      publish_new_content: {
        Args: { p_ack: boolean; p_course: string; p_lessons: string[] }
        Returns: number
      }
      quiz_attempt_review: {
        Args: { p_attempt: string }
        Returns: {
          chosen: string
          correct_answer: string
          is_correct: boolean
          options: Json
          question: string
          question_id: string
        }[]
      }
      quote_enrollment: {
        Args: { p_code?: string; p_course: string }
        Returns: {
          code_status: string
          currency: string
          discount: number
          list_price: number
          subtotal: number
          total: number
          vat: number
        }[]
      }
      rate_course: {
        Args: {
          p_comment: string
          p_content: number
          p_enrollment: string
          p_org: number
          p_trainer: number
        }
        Returns: string
      }
      record_course_view: { Args: { p_course: string }; Returns: undefined }
      record_lesson_progress: {
        Args: { p_lesson: string; p_position: number }
        Returns: {
          completed: boolean
          course_percent: number
        }[]
      }
      refund_quote: {
        Args: { p_enrollment: string }
        Returns: {
          amount: number
          currency: string
          days_before: number
          paid: number
          percent: number
          reference_at: string
          starts_at: string
          tier: string
          window_ends_at: string
        }[]
      }
      reorder_program_units: {
        Args: { p_ids: string[]; p_program: string }
        Returns: undefined
      }
      request_account_deletion: { Args: never; Returns: undefined }
      request_refund: {
        Args: { p_details: string; p_enrollment: string; p_reason: string }
        Returns: string
      }
      require_user: { Args: never; Returns: string }
      review_program: {
        Args: {
          p_decision: string
          p_findings?: Json
          p_note?: string
          p_program: string
          p_reason?: string
        }
        Returns: undefined
      }
      sandbox_settle_payment: {
        Args: { p_payment: string; p_succeeded: boolean }
        Returns: Database["public"]["Enums"]["payment_status"]
      }
      save_course_sessions: {
        Args: { p_course: string; p_sessions: Json }
        Returns: number
      }
      set_course_sales_paused: {
        Args: { p_course: string; p_paused: boolean }
        Returns: undefined
      }
      settle_payment: {
        Args: {
          p_failure?: string
          p_payment: string
          p_provider: string
          p_provider_ref: string
          p_succeeded: boolean
        }
        Returns: Database["public"]["Enums"]["payment_status"]
      }
      start_conversation: {
        Args: { p_body: string; p_course: string; p_subject: string }
        Returns: string
      }
      start_enrollment: {
        Args: { p_code?: string; p_course: string; p_funding?: string }
        Returns: {
          enrollment_id: string
          hold_expires_at: string
          status: Database["public"]["Enums"]["enrollment_status"]
          total: number
        }[]
      }
      submit_assignment: {
        Args: { p_assignment: string; p_file_path: string; p_note: string }
        Returns: string
      }
      submit_assignment_file: {
        Args: {
          p_assignment: string
          p_file_name: string
          p_file_path: string
          p_file_size: number
          p_note: string
        }
        Returns: string
      }
      submit_identity_documents: {
        Args: {
          p_back_path: string
          p_front_path: string
          p_last4: string
          p_type: string
        }
        Returns: string
      }
      submit_identity_verification: {
        Args: {
          p_document_path: string
          p_last4: string
          p_selfie_path: string
          p_type: string
        }
        Returns: string
      }
      submit_program_for_review: {
        Args: { p_clauses: string[]; p_program: string }
        Returns: string
      }
      submit_quiz: {
        Args: { p_answers: Json; p_quiz: string }
        Returns: {
          attempt_id: string
          correct: number
          passed: boolean
          score_percent: number
          total: number
        }[]
      }
      submit_quiz_attempt: {
        Args: { p_answers: Json; p_quiz: string }
        Returns: {
          attempt_id: string
          attempt_no: number
          correct: number
          max_attempts: number
          passed: boolean
          score_percent: number
          total: number
        }[]
      }
      trainer_busy_days: {
        Args: { p_days?: number; p_from: string; p_trainer: string }
        Returns: {
          busy: boolean
          day: string
        }[]
      }
      trainer_income_benchmarks: { Args: never; Returns: Json }
      trainer_public_stats: {
        Args: { p_trainer: string }
        Returns: {
          courses: number
          learners: number
          rating: number
          ratings: number
        }[]
      }
      trainer_stats: { Args: never; Returns: Json }
      update_course_session: {
        Args: {
          p_ends_at: string
          p_location: string
          p_module: string
          p_session: string
          p_starts_at: string
          p_title: string
        }
        Returns: undefined
      }
      update_course_setup: {
        Args: { p_course: string; p_patch: Json }
        Returns: undefined
      }
      vat_rate: { Args: never; Returns: number }
      verify_certificate: {
        Args: { p_code: string }
        Returns: {
          code: string
          course_title: string
          hours: number
          issued_at: string
          issuer_name: string
          revoked_at: string
          status: Database["public"]["Enums"]["certificate_status"]
          trainee_name: string
          trainer_name: string
        }[]
      }
      withdraw_dispute: { Args: { p_dispute: string }; Returns: undefined }
      withdraw_enrollment: {
        Args: { p_enrollment: string; p_reason: string }
        Returns: undefined
      }
      withdraw_program_review: {
        Args: { p_program: string }
        Returns: undefined
      }
      withdraw_violation_report: {
        Args: { p_report: string }
        Returns: undefined
      }
    }
    Enums: {
      certificate_status: "issued" | "revoked"
      course_level: "beginner" | "intermediate" | "advanced"
      course_mode: "in_person" | "live_remote" | "recorded"
      course_status:
        | "draft"
        | "open"
        | "in_progress"
        | "completed"
        | "cancelled"
      dispute_status: "open" | "under_review" | "resolved" | "closed"
      enrollment_status:
        | "pending_payment"
        | "pending_provider"
        | "confirmed"
        | "in_progress"
        | "completed"
        | "withdrawn"
        | "cancelled"
        | "access_revoked"
      lesson_kind: "video" | "text" | "file" | "quiz"
      organization_kind: "provider" | "studio" | "requester"
      payment_status:
        | "pending"
        | "processing"
        | "succeeded"
        | "failed"
        | "expired"
        | "refunded"
      program_review_state:
        | "draft"
        | "under_review"
        | "needs_changes"
        | "rejected"
        | "approved"
      program_status: "draft" | "published" | "archived"
      request_status: "under_review" | "approved" | "rejected"
      review_status: "pending" | "verified" | "needs_changes" | "rejected"
      submission_status:
        | "submitted"
        | "needs_revision"
        | "accepted"
        | "rejected"
      waitlist_status: "waiting" | "invited" | "accepted" | "expired" | "left"
      workspace_kind:
        | "trainee"
        | "trainer"
        | "provider"
        | "studio"
        | "requester"
        | "admin"
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  TableName extends (DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never) = never,
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
  EnumName extends (DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never) = never,
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
  CompositeTypeName extends (PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never) = never,
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
      certificate_status: ["issued", "revoked"],
      course_level: ["beginner", "intermediate", "advanced"],
      course_mode: ["in_person", "live_remote", "recorded"],
      course_status: ["draft", "open", "in_progress", "completed", "cancelled"],
      dispute_status: ["open", "under_review", "resolved", "closed"],
      enrollment_status: [
        "pending_payment",
        "pending_provider",
        "confirmed",
        "in_progress",
        "completed",
        "withdrawn",
        "cancelled",
        "access_revoked",
      ],
      lesson_kind: ["video", "text", "file", "quiz"],
      organization_kind: ["provider", "studio", "requester"],
      payment_status: [
        "pending",
        "processing",
        "succeeded",
        "failed",
        "expired",
        "refunded",
      ],
      program_review_state: [
        "draft",
        "under_review",
        "needs_changes",
        "rejected",
        "approved",
      ],
      program_status: ["draft", "published", "archived"],
      request_status: ["under_review", "approved", "rejected"],
      review_status: ["pending", "verified", "needs_changes", "rejected"],
      submission_status: [
        "submitted",
        "needs_revision",
        "accepted",
        "rejected",
      ],
      waitlist_status: ["waiting", "invited", "accepted", "expired", "left"],
      workspace_kind: [
        "trainee",
        "trainer",
        "provider",
        "studio",
        "requester",
        "admin",
      ],
    },
  },
} as const
