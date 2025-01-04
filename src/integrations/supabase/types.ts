export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  public: {
    Tables: {
      game_codes: {
        Row: {
          category: Database["public"]["Enums"]["game_category"]
          code_text: string
          created_at: string
          description: string | null
          expiration_date: string | null
          id: string
          original_value: number | null
          platform: string
          price: number
          region: string | null
          seller_id: string
          status: Database["public"]["Enums"]["code_status"] | null
          title: Database["public"]["Enums"]["game_title"]
          updated_at: string
        }
        Insert: {
          category?: Database["public"]["Enums"]["game_category"]
          code_text: string
          created_at?: string
          description?: string | null
          expiration_date?: string | null
          id?: string
          original_value?: number | null
          platform: string
          price: number
          region?: string | null
          seller_id: string
          status?: Database["public"]["Enums"]["code_status"] | null
          title: Database["public"]["Enums"]["game_title"]
          updated_at?: string
        }
        Update: {
          category?: Database["public"]["Enums"]["game_category"]
          code_text?: string
          created_at?: string
          description?: string | null
          expiration_date?: string | null
          id?: string
          original_value?: number | null
          platform?: string
          price?: number
          region?: string | null
          seller_id?: string
          status?: Database["public"]["Enums"]["code_status"] | null
          title?: Database["public"]["Enums"]["game_title"]
          updated_at?: string
        }
        Relationships: []
      }
      profiles: {
        Row: {
          avatar_url: string | null
          created_at: string
          id: string
          username: string | null
        }
        Insert: {
          avatar_url?: string | null
          created_at?: string
          id: string
          username?: string | null
        }
        Update: {
          avatar_url?: string | null
          created_at?: string
          id?: string
          username?: string | null
        }
        Relationships: []
      }
      sellers: {
        Row: {
          created_at: string
          id: string
          status: Database["public"]["Enums"]["seller_status"] | null
          stripe_account_id: string | null
          updated_at: string
        }
        Insert: {
          created_at?: string
          id: string
          status?: Database["public"]["Enums"]["seller_status"] | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Update: {
          created_at?: string
          id?: string
          status?: Database["public"]["Enums"]["seller_status"] | null
          stripe_account_id?: string | null
          updated_at?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      code_status: "available" | "sold" | "pending"
      game_category:
        | "Action"
        | "Adventure"
        | "RPG"
        | "Sports"
        | "Strategy"
        | "Racing"
        | "Simulation"
        | "Fighting"
        | "Horror"
        | "Platformer"
        | "Shooter"
        | "Puzzle"
        | "Family"
      game_title:
        | "Call of Duty: Modern Warfare"
        | "Red Dead Redemption 2"
        | "Grand Theft Auto V"
        | "The Legend of Zelda: Breath of the Wild"
        | "FIFA 24"
        | "Minecraft"
        | "Cyberpunk 2077"
        | "Assassin's Creed Valhalla"
        | "God of War Ragnarök"
        | "Elden Ring"
        | "Spider-Man 2"
        | "Super Mario Odyssey"
        | "The Last of Us Part II"
        | "Horizon Forbidden West"
        | "Resident Evil 4 Remake"
      seller_status: "pending" | "onboarding" | "active" | "rejected"
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type PublicSchema = Database[Extract<keyof Database, "public">]

export type Tables<
  PublicTableNameOrOptions extends
    | keyof (PublicSchema["Tables"] & PublicSchema["Views"])
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
        Database[PublicTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? (Database[PublicTableNameOrOptions["schema"]]["Tables"] &
      Database[PublicTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : PublicTableNameOrOptions extends keyof (PublicSchema["Tables"] &
        PublicSchema["Views"])
    ? (PublicSchema["Tables"] &
        PublicSchema["Views"])[PublicTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  PublicTableNameOrOptions extends
    | keyof PublicSchema["Tables"]
    | { schema: keyof Database },
  TableName extends PublicTableNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = PublicTableNameOrOptions extends { schema: keyof Database }
  ? Database[PublicTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : PublicTableNameOrOptions extends keyof PublicSchema["Tables"]
    ? PublicSchema["Tables"][PublicTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  PublicEnumNameOrOptions extends
    | keyof PublicSchema["Enums"]
    | { schema: keyof Database },
  EnumName extends PublicEnumNameOrOptions extends { schema: keyof Database }
    ? keyof Database[PublicEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = PublicEnumNameOrOptions extends { schema: keyof Database }
  ? Database[PublicEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : PublicEnumNameOrOptions extends keyof PublicSchema["Enums"]
    ? PublicSchema["Enums"][PublicEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof PublicSchema["CompositeTypes"]
    | { schema: keyof Database },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof Database
  }
    ? keyof Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends { schema: keyof Database }
  ? Database[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof PublicSchema["CompositeTypes"]
    ? PublicSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never
