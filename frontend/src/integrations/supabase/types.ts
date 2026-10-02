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
    PostgrestVersion: "14.18"
  }
  public: {
    Tables: {
      devices: {
        Row: {
          created_at: string
          id: string
          kind: Database["public"]["Enums"]["device_kind"]
          label: string
          last_complete_at: string | null
          last_seen_at: string | null
          last_seq: number
          revoked_at: string | null
          token_hash: string
          user_id: string
        }
        Insert: {
          created_at?: string
          id?: string
          kind: Database["public"]["Enums"]["device_kind"]
          label: string
          last_complete_at?: string | null
          last_seen_at?: string | null
          last_seq?: number
          revoked_at?: string | null
          token_hash: string
          user_id: string
        }
        Update: {
          created_at?: string
          id?: string
          kind?: Database["public"]["Enums"]["device_kind"]
          label?: string
          last_complete_at?: string | null
          last_seen_at?: string | null
          last_seq?: number
          revoked_at?: string | null
          token_hash?: string
          user_id?: string
        }
        Relationships: []
      }
      emergency_contacts: {
        Row: {
          alias: string
          authorized: boolean
          contact_enc: string
          contact_iv: string
          created_at: string
          id: string
          priority: number
          user_id: string
        }
        Insert: {
          alias: string
          authorized?: boolean
          contact_enc: string
          contact_iv: string
          created_at?: string
          id?: string
          priority: number
          user_id: string
        }
        Update: {
          alias?: string
          authorized?: boolean
          contact_enc?: string
          contact_iv?: string
          created_at?: string
          id?: string
          priority?: number
          user_id?: string
        }
        Relationships: []
      }
      heartbeats: {
        Row: {
          battery: number | null
          charging: boolean | null
          client_ts: string | null
          complete: boolean
          device_id: string
          id: string
          location_accuracy: number | null
          location_enc: string | null
          location_iv: string | null
          location_ts: string | null
          network: string | null
          received_at: string
          seq: number
          user_id: string
          wearable_connected: boolean | null
        }
        Insert: {
          battery?: number | null
          charging?: boolean | null
          client_ts?: string | null
          complete: boolean
          device_id: string
          id?: string
          location_accuracy?: number | null
          location_enc?: string | null
          location_iv?: string | null
          location_ts?: string | null
          network?: string | null
          received_at?: string
          seq: number
          user_id: string
          wearable_connected?: boolean | null
        }
        Update: {
          battery?: number | null
          charging?: boolean | null
          client_ts?: string | null
          complete?: boolean
          device_id?: string
          id?: string
          location_accuracy?: number | null
          location_enc?: string | null
          location_iv?: string | null
          location_ts?: string | null
          network?: string | null
          received_at?: string
          seq?: number
          user_id?: string
          wearable_connected?: boolean | null
        }
        Relationships: [
          {
            foreignKeyName: "heartbeats_device_id_fkey"
            columns: ["device_id"]
            isOneToOne: false
            referencedRelation: "devices"
            referencedColumns: ["id"]
          },
        ]
      }
      incident_events: {
        Row: {
          actor: string
          covert: boolean
          created_at: string
          details: Json
          device_id: string | null
          heartbeat_id: string | null
          id: string
          incident_id: string | null
          new_state: Database["public"]["Enums"]["safety_state"] | null
          prev_state: Database["public"]["Enums"]["safety_state"] | null
          rule: string
          user_id: string
        }
        Insert: {
          actor: string
          covert?: boolean
          created_at?: string
          details?: Json
          device_id?: string | null
          heartbeat_id?: string | null
          id?: string
          incident_id?: string | null
          new_state?: Database["public"]["Enums"]["safety_state"] | null
          prev_state?: Database["public"]["Enums"]["safety_state"] | null
          rule: string
          user_id: string
        }
        Update: {
          actor?: string
          covert?: boolean
          created_at?: string
          details?: Json
          device_id?: string | null
          heartbeat_id?: string | null
          id?: string
          incident_id?: string | null
          new_state?: Database["public"]["Enums"]["safety_state"] | null
          prev_state?: Database["public"]["Enums"]["safety_state"] | null
          rule?: string
          user_id?: string
        }
        Relationships: []
      }
      incidents: {
        Row: {
          covert: boolean
          escalated_at: string | null
          id: string
          opened_at: string
          resolution: string | null
          resolved_at: string | null
          state: Database["public"]["Enums"]["safety_state"]
          trigger: string
          user_id: string
        }
        Insert: {
          covert?: boolean
          escalated_at?: string | null
          id?: string
          opened_at?: string
          resolution?: string | null
          resolved_at?: string | null
          state: Database["public"]["Enums"]["safety_state"]
          trigger: string
          user_id: string
        }
        Update: {
          covert?: boolean
          escalated_at?: string | null
          id?: string
          opened_at?: string
          resolution?: string | null
          resolved_at?: string | null
          state?: Database["public"]["Enums"]["safety_state"]
          trigger?: string
          user_id?: string
        }
        Relationships: []
      }
      notification_dispatches: {
        Row: {
          attempts: number
          contact_id: string
          covert: boolean
          created_at: string
          id: string
          incident_id: string
          last_error: string | null
          priority: number
          sent_at: string | null
          snapshot: Json
          status: string
          user_id: string
        }
        Insert: {
          attempts?: number
          contact_id: string
          covert?: boolean
          created_at?: string
          id?: string
          incident_id: string
          last_error?: string | null
          priority: number
          sent_at?: string | null
          snapshot: Json
          status?: string
          user_id: string
        }
        Update: {
          attempts?: number
          contact_id?: string
          covert?: boolean
          created_at?: string
          id?: string
          incident_id?: string
          last_error?: string | null
          priority?: number
          sent_at?: string | null
          snapshot?: Json
          status?: string
          user_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "notification_dispatches_contact_id_fkey"
            columns: ["contact_id"]
            isOneToOne: false
            referencedRelation: "emergency_contacts"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "notification_dispatches_incident_id_fkey"
            columns: ["incident_id"]
            isOneToOne: false
            referencedRelation: "incidents"
            referencedColumns: ["id"]
          },
        ]
      }
      profiles: {
        Row: {
          callsign: string
          checkin_pin_hash: string | null
          created_at: string
          duress_pin_hash: string | null
          failed_pin_attempts: number
          id: string
          pins_configured: boolean
        }
        Insert: {
          callsign?: string
          checkin_pin_hash?: string | null
          created_at?: string
          duress_pin_hash?: string | null
          failed_pin_attempts?: number
          id: string
          pins_configured?: boolean
        }
        Update: {
          callsign?: string
          checkin_pin_hash?: string | null
          created_at?: string
          duress_pin_hash?: string | null
          failed_pin_attempts?: number
          id?: string
          pins_configured?: boolean
        }
        Relationships: []
      }
      safety_status: {
        Row: {
          active_incident_id: string | null
          armed: boolean
          armed_at: string | null
          last_any_heartbeat_at: string | null
          last_complete_heartbeat_at: string | null
          state: Database["public"]["Enums"]["safety_state"]
          state_entered_at: string
          updated_at: string
          user_id: string
        }
        Insert: {
          active_incident_id?: string | null
          armed?: boolean
          armed_at?: string | null
          last_any_heartbeat_at?: string | null
          last_complete_heartbeat_at?: string | null
          state?: Database["public"]["Enums"]["safety_state"]
          state_entered_at?: string
          updated_at?: string
          user_id: string
        }
        Update: {
          active_incident_id?: string | null
          armed?: boolean
          armed_at?: string | null
          last_any_heartbeat_at?: string | null
          last_complete_heartbeat_at?: string | null
          state?: Database["public"]["Enums"]["safety_state"]
          state_entered_at?: string
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      [_ in never]: never
    }
    Functions: {
      _classify_pin: { Args: { _pin: string; _user: string }; Returns: string }
      _correlation: { Args: { _user: string }; Returns: Json }
      _execute_cascade: { Args: { _incident: string }; Returns: number }
      _ingest: {
        Args: {
          _battery: number
          _charging: boolean
          _client_ts: string
          _device: string
          _loc_acc: number
          _loc_enc: string
          _loc_iv: string
          _loc_ts: string
          _network: string
          _seq: number
          _user: string
          _wearable: boolean
        }
        Returns: Json
      }
      _open_duress: {
        Args: { _device: string; _hb: string; _user: string }
        Returns: undefined
      }
      _snapshot: { Args: { _user: string }; Returns: Json }
      _transition: {
        Args: {
          _actor: string
          _details?: Json
          _device: string
          _heartbeat: string
          _incident: string
          _rule: string
          _to: Database["public"]["Enums"]["safety_state"]
          _user: string
        }
        Returns: undefined
      }
      _visible_checkin: {
        Args: { _device: string; _hb: string; _user: string }
        Returns: undefined
      }
      api_checkin: {
        Args: {
          _battery: number
          _charging: boolean
          _client_ts: string
          _device: string
          _loc_acc: number
          _loc_enc: string
          _loc_iv: string
          _loc_ts: string
          _network: string
          _pin: string
          _seq: number
          _user: string
          _wearable: boolean
        }
        Returns: Json
      }
      api_ingest_device: {
        Args: {
          _battery: number
          _charging: boolean
          _client_ts: string
          _loc_acc: number
          _loc_enc: string
          _loc_iv: string
          _loc_ts: string
          _network: string
          _seq: number
          _token_hash: string
          _wearable: boolean
        }
        Returns: Json
      }
      api_set_armed: {
        Args: { _armed: boolean; _pin: string; _user: string }
        Returns: Json
      }
      api_set_pins: {
        Args: {
          _checkin: string
          _current: string
          _duress: string
          _user: string
        }
        Returns: Json
      }
      api_silent_alarm: {
        Args: { _device: string; _user: string }
        Returns: Json
      }
      api_stand_down: { Args: { _pin: string; _user: string }; Returns: Json }
      bootstrap_operator: { Args: never; Returns: undefined }
      run_watchdog: { Args: never; Returns: number }
    }
    Enums: {
      device_kind: "phone" | "wearable"
      safety_state:
        | "NORMAL"
        | "ARE_YOU_ALIVE"
        | "PROLONGED_NO_RESPONSE"
        | "CRITICAL_UNRESOLVED"
        | "RESOLVED"
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
      device_kind: ["phone", "wearable"],
      safety_state: [
        "NORMAL",
        "ARE_YOU_ALIVE",
        "PROLONGED_NO_RESPONSE",
        "CRITICAL_UNRESOLVED",
        "RESOLVED",
      ],
    },
  },
} as const
