/**
 * Database type definitions for Supabase
 * This file should be generated from your Supabase schema
 * For now, we'll define a basic structure
 */

export interface Database {
  public: {
    Tables: {
      user_profiles: {
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          current_organization_id: string | null;
          account_type: 'personal' | 'organization';
          preferences: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          current_organization_id?: string | null;
          account_type: 'personal' | 'organization';
          preferences?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          current_organization_id?: string | null;
          account_type?: 'personal' | 'organization';
          preferences?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organizations: {
        Row: {
          id: string;
          name: string;
          slug: string;
          description: string | null;
          industry: string | null;
          website: string | null;
          logo_url: string | null;
          settings: Record<string, any> | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          description?: string | null;
          industry?: string | null;
          website?: string | null;
          logo_url?: string | null;
          settings?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          description?: string | null;
          industry?: string | null;
          website?: string | null;
          logo_url?: string | null;
          settings?: Record<string, any> | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      organization_members: {
        Row: {
          id: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member' | 'viewer';
          status: 'active' | 'inactive' | 'pending';
          permissions: string[] | null;
          created_at: string;
          updated_at: string;
          joined_at: string;
        };
        Insert: {
          id?: string;
          organization_id: string;
          user_id: string;
          role: 'owner' | 'admin' | 'member' | 'viewer';
          status?: 'active' | 'inactive' | 'pending';
          permissions?: string[] | null;
          created_at?: string;
          updated_at?: string;
          joined_at?: string;
        };
        Update: {
          id?: string;
          organization_id?: string;
          user_id?: string;
          role?: 'owner' | 'admin' | 'member' | 'viewer';
          status?: 'active' | 'inactive' | 'pending';
          permissions?: string[] | null;
          created_at?: string;
          updated_at?: string;
          joined_at?: string;
        };
      };
    };
    Views: {
      [_ in never]: never;
    };
    Functions: {
      [_ in never]: never;
    };
    Enums: {
      [_ in never]: never;
    };
    CompositeTypes: {
      [_ in never]: never;
    };
  };
}