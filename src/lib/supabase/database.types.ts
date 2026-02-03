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
          summary: string | null;
          description: string;
          version: string;
          size_in_bytes: number | null;
          platforms: string[];
          categories: string[];
          type: string;
          website_url: string | null;
          download_url: string;
          is_featured: boolean;
          downloads_count: number;
          developer: Json;
          features: string[];
          is_trending: boolean;
          release_date: string | null;
          created_at: string;
          updated_at: string;
          stats: Json;
          media: Json;
          requirements: Json | null;
          changelog: Json | null;
          search_vector: unknown;
        };
        Insert: {
          id?: string;
          slug: string;
          name: string;
          summary?: string | null;
          description: string;
          version: string;
          size_in_bytes?: number | null;
          platforms?: string[];
          categories?: string[];
          type: string;
          website_url?: string | null;
          download_url: string;
          is_featured?: boolean;
          downloads_count?: number;
          developer?: Json;
          features?: string[];
          is_trending?: boolean;
          release_date?: string | null;
          requirements?: Json | null;
          changelog?: Json | null;
          created_at?: string;
          updated_at?: string;
          stats?: Json;
          media?: Json;
        };
        Update: Partial<Database["public"]["Tables"]["software"]["Insert"]>;
        Relationships: [];
      };
      software_releases: {
        Row: {
          id: string;
          software_id: string;
          version: string;
          file_name: string | null;
          additional_info: string | null;
          download_url: string;
          size_in_bytes: number | null;
          release_date: string | null;
          downloads_count: number;
          created_at: string;
        };
        Insert: {
          id?: string;
          software_id: string;
          version: string;
          file_name?: string | null;
          additional_info?: string | null;
          download_url: string;
          size_in_bytes?: number | null;
          release_date?: string | null;
          downloads_count?: number;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["software_releases"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "software_releases_software_id_fkey";
            columns: ["software_id"];
            referencedRelation: "software";
            referencedColumns: ["id"];
          },
        ];
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
      collections: {
        Row: {
          id: string;
          slug: string;
          title: string;
          subtitle: string | null;
          description: string | null;
          cover_image_url: string | null;
          accent_color: string | null;
          theme: Json;
          is_featured: boolean;
          display_order: number;
          published_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          subtitle?: string | null;
          description?: string | null;
          cover_image_url?: string | null;
          accent_color?: string | null;
          theme?: Json;
          is_featured?: boolean;
          display_order?: number;
          published_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collections"]["Insert"]>;
        Relationships: [];
      };
      collection_items: {
        Row: {
          collection_id: string;
          software_id: string;
          position: number;
          highlight: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          collection_id: string;
          software_id: string;
          position?: number;
          highlight?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["collection_items"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "collection_items_collection_id_fkey";
            columns: ["collection_id"];
            referencedRelation: "collections";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "collection_items_software_id_fkey";
            columns: ["software_id"];
            referencedRelation: "software";
            referencedColumns: ["id"];
          },
        ];
      };
      analytics_events: {
        Row: {
          id: string;
          software_id: string;
          event_type: "view" | "download" | "share";
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          software_id: string;
          event_type: "view" | "download" | "share";
          metadata?: Json | null;
          created_at?: string;
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
      analytics_search_events: {
        Row: {
          id: string;
          query: string;
          filters: Json | null;
          results_count: number | null;
          duration_ms: number | null;
          locale: string | null;
          source: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          query: string;
          filters?: Json | null;
          results_count?: number | null;
          duration_ms?: number | null;
          locale?: string | null;
          source?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["analytics_search_events"]["Insert"]>;
        Relationships: [];
      };
      games: {
        Row: {
          software_id: string;
          genres: string[];
          modes: string[];
          monetization: string | null;
          is_free: boolean;
          is_open_source: boolean;
          repositories: Json;
          age_rating: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          software_id: string;
          genres?: string[];
          modes?: string[];
          monetization?: string | null;
          is_free?: boolean;
          is_open_source?: boolean;
          repositories?: Json;
          age_rating?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["games"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "games_software_id_fkey";
            columns: ["software_id"];
            referencedRelation: "software";
            referencedColumns: ["id"];
          },
        ];
      };
      operating_systems: {
        Row: {
          software_id: string;
          kernel: string | null;
          based_on: string | null;
          architectures: string[];
          support_status: string | null;
          lifecycle: Json;
          release_channel: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          software_id: string;
          kernel?: string | null;
          based_on?: string | null;
          architectures?: string[];
          support_status?: string | null;
          lifecycle?: Json;
          release_channel?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["operating_systems"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "operating_systems_software_id_fkey";
            columns: ["software_id"];
            referencedRelation: "software";
            referencedColumns: ["id"];
          },
        ];
      };
      multimedia: {
        Row: {
          software_id: string;
          media_types: string[];
          supports_streaming: boolean;
          supports_editing: boolean;
          codecs_supported: string[];
          integrations: string[];
          created_at: string;
          updated_at: string;
        };
        Insert: {
          software_id: string;
          media_types?: string[];
          supports_streaming?: boolean;
          supports_editing?: boolean;
          codecs_supported?: string[];
          integrations?: string[];
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["multimedia"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "multimedia_software_id_fkey";
            columns: ["software_id"];
            referencedRelation: "software";
            referencedColumns: ["id"];
          },
        ];
      };
      utilities: {
        Row: {
          software_id: string;
          utility_type: string;
          automation_features: string[];
          integrations: string[];
          telemetry: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          software_id: string;
          utility_type: string;
          automation_features?: string[];
          integrations?: string[];
          telemetry?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["utilities"]["Insert"]>;
        Relationships: [
          {
            foreignKeyName: "utilities_software_id_fkey";
            columns: ["software_id"];
            referencedRelation: "software";
            referencedColumns: ["id"];
          },
        ];
      };
      films: {
        Row: {
          id: string;
          slug: string;
          title: string;
          description: string | null;
          release_date: string | null;
          metadata: Json;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          slug: string;
          title: string;
          description?: string | null;
          release_date?: string | null;
          metadata?: Json;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["films"]["Insert"]>;
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_admin: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      is_service_role: {
        Args: Record<PropertyKey, never>;
        Returns: boolean;
      };
      increment_software_stat: {
        Args: {
          p_software_id: string;
          p_field: string;
          p_delta?: number;
        };
        Returns: void;
      };
      analytics_popular_software: {
        Args: {
          p_limit?: number;
        };
        Returns: {
          software_id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          downloads: number;
          views: number;
        }[];
      };
      analytics_trending_software: {
        Args: {
          p_limit?: number;
          p_window_days?: number;
        };
        Returns: {
          software_id: string;
          name: string;
          slug: string;
          logo_url: string | null;
          total_events: number;
          views: number;
          downloads: number;
        }[];
      };
      analytics_totals: {
        Args: Record<PropertyKey, never>;
        Returns: {
          total_views: number;
          total_downloads: number;
          total_software: number;
        }[];
      };
      analytics_top_countries: {
        Args: {
          p_limit?: number;
          p_window_days?: number;
        };
        Returns: {
          country: string | null;
          total_events: number;
          views: number;
          downloads: number;
        }[];
      };
      collections_public: {
        Args: {
          published_only?: boolean;
        };
        Returns: Database["public"]["Tables"]["collections"]["Row"][];
      };
      collection_items_for: {
        Args: {
          collection: string;
        };
        Returns: {
          collection_id: string;
          software_id: string;
          position: number;
          highlight: string | null;
          created_at: string;
          updated_at: string;
        }[];
      };
    };
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};
