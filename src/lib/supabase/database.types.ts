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
      software: {
        Row: {
          id: string;
          slug: string;
          name: string;
          summary: string;
          description: string;
          version: string;
          size_in_bytes: number;
          platforms: string[];
          categories: string[];
          type: string;
          website_url: string | null;
          download_url: string;
          is_featured: boolean;
          release_date: string;
          updated_at: string;
          created_at: string;
          stats: Json;
          media: Json;
          requirements: Json | null;
          changelog: Json | null;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          summary: string;
          description: string;
          version: string;
          size_in_bytes: number;
          platforms: string[];
          categories: string[];
          type: string;
          website_url?: string | null;
          download_url: string;
          is_featured?: boolean;
          release_date: string;
          updated_at?: string;
          created_at?: string;
          stats?: Json;
          media?: Json;
          requirements?: Json | null;
          changelog?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["software"]["Insert"]>;
        Relationships: [];
      };
      categories: {
        Row: {
          id: string;
          slug: string;
          name: string;
          description: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          description?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["categories"]["Insert"]>;
        Relationships: [];
      };
      analytics_events: {
        Row: {
          id: string;
          software_id: string;
          event_type: "view" | "download" | "share";
          created_at: string;
          metadata: Json | null;
        };
        Insert: {
          id?: string;
          software_id: string;
          event_type: "view" | "download" | "share";
          created_at?: string;
          metadata?: Json | null;
        };
        Update: Partial<Database["public"]["Tables"]["analytics_events"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "analytics_events_software_id_fkey";
            columns: ["software_id"];
            referencedRelation: "software";
            referencedColumns: ["id"];
          },
        ];
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
