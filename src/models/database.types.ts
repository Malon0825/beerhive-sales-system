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
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      audit_logs: {
        Row: {
          action: string
          created_at: string | null
          id: string
          ip_address: unknown | null
          new_values: Json | null
          old_values: Json | null
          record_id: string | null
          table_name: string | null
          user_agent: string | null
          user_id: string | null
        }
        Insert: {
          action: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Update: {
          action?: string
          created_at?: string | null
          id?: string
          ip_address?: unknown | null
          new_values?: Json | null
          old_values?: Json | null
          record_id?: string | null
          table_name?: string | null
          user_agent?: string | null
          user_id?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "audit_logs_user_id_fkey"
            columns: ["user_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      customer_events: {
        Row: {
          created_at: string | null
          customer_id: string | null
          discount_type: Database["public"]["Enums"]["discount_type"] | null
          discount_value: number | null
          event_date: string
          event_name: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          free_item_product_id: string | null
          id: string
          is_redeemed: boolean | null
          notes: string | null
          notification_sent: boolean | null
          notification_sent_at: string | null
          offer_description: string | null
          offer_valid_from: string | null
          offer_valid_until: string | null
          redeemed_at: string | null
          redeemed_order_id: string | null
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          customer_id?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number | null
          event_date: string
          event_name?: string | null
          event_type: Database["public"]["Enums"]["event_type"]
          free_item_product_id?: string | null
          id?: string
          is_redeemed?: boolean | null
          notes?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          offer_description?: string | null
          offer_valid_from?: string | null
          offer_valid_until?: string | null
          redeemed_at?: string | null
          redeemed_order_id?: string | null
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          customer_id?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number | null
          event_date?: string
          event_name?: string | null
          event_type?: Database["public"]["Enums"]["event_type"]
          free_item_product_id?: string | null
          id?: string
          is_redeemed?: boolean | null
          notes?: string | null
          notification_sent?: boolean | null
          notification_sent_at?: string | null
          offer_description?: string | null
          offer_valid_from?: string | null
          offer_valid_until?: string | null
          redeemed_at?: string | null
          redeemed_order_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "customer_events_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_events_free_item_product_id_fkey"
            columns: ["free_item_product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_events_free_item_product_id_fkey"
            columns: ["free_item_product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "customer_events_free_item_product_id_fkey"
            columns: ["free_item_product_id"]
            isOneToOne: false
            referencedRelation: "v_top_selling_products"
            referencedColumns: ["id"]
          },
        ]
      }
      customers: {
        Row: {
          anniversary_date: string | null
          birth_date: string | null
          created_at: string | null
          customer_number: string
          email: string | null
          full_name: string
          id: string
          is_active: boolean | null
          last_visit_date: string | null
          loyalty_points: number | null
          notes: string | null
          phone: string | null
          tier: Database["public"]["Enums"]["customer_tier"] | null
          total_spent: number | null
          updated_at: string | null
          vip_expiry_date: string | null
          vip_membership_number: string | null
          vip_start_date: string | null
          visit_count: number | null
        }
        Insert: {
          anniversary_date?: string | null
          birth_date?: string | null
          created_at?: string | null
          customer_number: string
          email?: string | null
          full_name: string
          id?: string
          is_active?: boolean | null
          last_visit_date?: string | null
          loyalty_points?: number | null
          notes?: string | null
          phone?: string | null
          tier?: Database["public"]["Enums"]["customer_tier"] | null
          total_spent?: number | null
          updated_at?: string | null
          vip_expiry_date?: string | null
          vip_membership_number?: string | null
          vip_start_date?: string | null
          visit_count?: number | null
        }
        Update: {
          anniversary_date?: string | null
          birth_date?: string | null
          created_at?: string | null
          customer_number?: string
          email?: string | null
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_visit_date?: string | null
          loyalty_points?: number | null
          notes?: string | null
          phone?: string | null
          tier?: Database["public"]["Enums"]["customer_tier"] | null
          total_spent?: number | null
          updated_at?: string | null
          vip_expiry_date?: string | null
          vip_membership_number?: string | null
          vip_start_date?: string | null
          visit_count?: number | null
        }
        Relationships: []
      }
      discounts: {
        Row: {
          cashier_id: string | null
          created_at: string | null
          discount_amount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id: string
          manager_id: string | null
          notes: string | null
          order_id: string | null
          order_item_id: string | null
          reason: string
        }
        Insert: {
          cashier_id?: string | null
          created_at?: string | null
          discount_amount: number
          discount_type: Database["public"]["Enums"]["discount_type"]
          discount_value: number
          id?: string
          manager_id?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          reason: string
        }
        Update: {
          cashier_id?: string | null
          created_at?: string | null
          discount_amount?: number
          discount_type?: Database["public"]["Enums"]["discount_type"]
          discount_value?: number
          id?: string
          manager_id?: string | null
          notes?: string | null
          order_id?: string | null
          order_item_id?: string | null
          reason?: string
        }
        Relationships: [
          {
            foreignKeyName: "discounts_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_manager_id_fkey"
            columns: ["manager_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "discounts_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      happy_hour_pricing: {
        Row: {
          applies_to_all_products: boolean | null
          created_at: string | null
          created_by: string | null
          days_of_week: number[] | null
          description: string | null
          discount_type: Database["public"]["Enums"]["discount_type"] | null
          discount_value: number
          end_time: string
          id: string
          is_active: boolean | null
          min_order_amount: number | null
          name: string
          start_time: string
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
        }
        Insert: {
          applies_to_all_products?: boolean | null
          created_at?: string | null
          created_by?: string | null
          days_of_week?: number[] | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value: number
          end_time: string
          id?: string
          is_active?: boolean | null
          min_order_amount?: number | null
          name: string
          start_time: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Update: {
          applies_to_all_products?: boolean | null
          created_at?: string | null
          created_by?: string | null
          days_of_week?: number[] | null
          description?: string | null
          discount_type?: Database["public"]["Enums"]["discount_type"] | null
          discount_value?: number
          end_time?: string
          id?: string
          is_active?: boolean | null
          min_order_amount?: number | null
          name?: string
          start_time?: string
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "happy_hour_pricing_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      happy_hour_products: {
        Row: {
          custom_price: number | null
          happy_hour_id: string
          product_id: string
        }
        Insert: {
          custom_price?: number | null
          happy_hour_id: string
          product_id: string
        }
        Update: {
          custom_price?: number | null
          happy_hour_id?: string
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "happy_hour_products_happy_hour_id_fkey"
            columns: ["happy_hour_id"]
            isOneToOne: false
            referencedRelation: "happy_hour_pricing"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "happy_hour_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "happy_hour_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "happy_hour_products_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_selling_products"
            referencedColumns: ["id"]
          },
        ]
      }
      inventory_movements: {
        Row: {
          approved_by: string | null
          created_at: string | null
          id: string
          movement_type: Database["public"]["Enums"]["adjustment_type"]
          notes: string | null
          order_id: string | null
          performed_by: string | null
          product_id: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: Database["public"]["Enums"]["adjustment_reason"]
          reference_number: string | null
          total_cost: number | null
          unit_cost: number | null
        }
        Insert: {
          approved_by?: string | null
          created_at?: string | null
          id?: string
          movement_type: Database["public"]["Enums"]["adjustment_type"]
          notes?: string | null
          order_id?: string | null
          performed_by?: string | null
          product_id?: string | null
          quantity_after: number
          quantity_before: number
          quantity_change: number
          reason: Database["public"]["Enums"]["adjustment_reason"]
          reference_number?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Update: {
          approved_by?: string | null
          created_at?: string | null
          id?: string
          movement_type?: Database["public"]["Enums"]["adjustment_type"]
          notes?: string | null
          order_id?: string | null
          performed_by?: string | null
          product_id?: string | null
          quantity_after?: number
          quantity_before?: number
          quantity_change?: number
          reason?: Database["public"]["Enums"]["adjustment_reason"]
          reference_number?: string | null
          total_cost?: number | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "inventory_movements_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_performed_by_fkey"
            columns: ["performed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "inventory_movements_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_selling_products"
            referencedColumns: ["id"]
          },
        ]
      }
      kitchen_orders: {
        Row: {
          assigned_to: string | null
          created_at: string | null
          destination: Database["public"]["Enums"]["order_destination"]
          id: string
          is_urgent: boolean | null
          order_id: string | null
          order_item_id: string | null
          preparation_notes: string | null
          priority_order: number | null
          ready_at: string | null
          sent_at: string | null
          served_at: string | null
          special_instructions: string | null
          started_at: string | null
          status: Database["public"]["Enums"]["kitchen_order_status"] | null
          updated_at: string | null
        }
        Insert: {
          assigned_to?: string | null
          created_at?: string | null
          destination: Database["public"]["Enums"]["order_destination"]
          id?: string
          is_urgent?: boolean | null
          order_id?: string | null
          order_item_id?: string | null
          preparation_notes?: string | null
          priority_order?: number | null
          ready_at?: string | null
          sent_at?: string | null
          served_at?: string | null
          special_instructions?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["kitchen_order_status"] | null
          updated_at?: string | null
        }
        Update: {
          assigned_to?: string | null
          created_at?: string | null
          destination?: Database["public"]["Enums"]["order_destination"]
          id?: string
          is_urgent?: boolean | null
          order_id?: string | null
          order_item_id?: string | null
          preparation_notes?: string | null
          priority_order?: number | null
          ready_at?: string | null
          sent_at?: string | null
          served_at?: string | null
          special_instructions?: string | null
          started_at?: string | null
          status?: Database["public"]["Enums"]["kitchen_order_status"] | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "kitchen_orders_assigned_to_fkey"
            columns: ["assigned_to"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_orders_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "kitchen_orders_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_item_addons: {
        Row: {
          addon_id: string | null
          addon_name: string
          created_at: string | null
          id: string
          order_item_id: string | null
          quantity: number
        }
        Insert: {
          addon_id?: string | null
          addon_name: string
          created_at?: string | null
          id?: string
          order_item_id?: string | null
          quantity?: number
        }
        Update: {
          addon_id?: string | null
          addon_name?: string
          created_at?: string | null
          id?: string
          order_item_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_item_addons_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "product_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_item_addons_order_item_id_fkey"
            columns: ["order_item_id"]
            isOneToOne: false
            referencedRelation: "order_items"
            referencedColumns: ["id"]
          },
        ]
      }
      order_items: {
        Row: {
          created_at: string | null
          discount_amount: number | null
          id: string
          is_complimentary: boolean | null
          is_vip_price: boolean | null
          item_name: string
          notes: string | null
          order_id: string | null
          package_id: string | null
          product_id: string | null
          quantity: number
          subtotal: number
          total: number
          unit_price: number
        }
        Insert: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          is_complimentary?: boolean | null
          is_vip_price?: boolean | null
          item_name: string
          notes?: string | null
          order_id?: string | null
          package_id?: string | null
          product_id?: string | null
          quantity?: number
          subtotal: number
          total: number
          unit_price: number
        }
        Update: {
          created_at?: string | null
          discount_amount?: number | null
          id?: string
          is_complimentary?: boolean | null
          is_vip_price?: boolean | null
          item_name?: string
          notes?: string | null
          order_id?: string | null
          package_id?: string | null
          product_id?: string | null
          quantity?: number
          subtotal?: number
          total?: number
          unit_price?: number
        }
        Relationships: [
          {
            foreignKeyName: "order_items_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_selling_products"
            referencedColumns: ["id"]
          },
        ]
      }
      orders: {
        Row: {
          amount_tendered: number | null
          applied_event_offer_id: string | null
          cashier_id: string | null
          change_amount: number | null
          completed_at: string | null
          created_at: string | null
          customer_id: string | null
          discount_amount: number | null
          id: string
          order_notes: string | null
          order_number: string
          payment_method: Database["public"]["Enums"]["payment_method"] | null
          status: Database["public"]["Enums"]["order_status"] | null
          subtotal: number
          session_id: string | null
          table_id: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
          voided_at: string | null
          voided_by: string | null
          voided_reason: string | null
        }
        Insert: {
          amount_tendered?: number | null
          applied_event_offer_id?: string | null
          cashier_id?: string | null
          change_amount?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          order_notes?: string | null
          order_number: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          session_id?: string | null
          table_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Update: {
          amount_tendered?: number | null
          applied_event_offer_id?: string | null
          cashier_id?: string | null
          change_amount?: number | null
          completed_at?: string | null
          created_at?: string | null
          customer_id?: string | null
          discount_amount?: number | null
          id?: string
          order_notes?: string | null
          order_number?: string
          payment_method?: Database["public"]["Enums"]["payment_method"] | null
          status?: Database["public"]["Enums"]["order_status"] | null
          subtotal?: number
          session_id?: string | null
          table_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
          voided_at?: string | null
          voided_by?: string | null
          voided_reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "orders_cashier_id_fkey"
            columns: ["cashier_id"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_session_id_fkey"
            columns: ["session_id"]
            isOneToOne: false
            referencedRelation: "order_sessions"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "orders_voided_by_fkey"
            columns: ["voided_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      order_sessions: {
        Row: {
          id: string
          session_number: string
          table_id: string | null
          customer_id: string | null
          subtotal: number
          discount_amount: number
          tax_amount: number
          total_amount: number
          status: Database["public"]["Enums"]["session_status"] | null
          opened_at: string | null
          closed_at: string | null
          opened_by: string | null
          closed_by: string | null
          notes: string | null
          created_at: string | null
          updated_at: string | null
        }
        Insert: {
          id?: string
          session_number?: string
          table_id?: string | null
          customer_id?: string | null
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          total_amount?: number
          status?: Database["public"]["Enums"]["session_status"] | null
          opened_at?: string | null
          closed_at?: string | null
          opened_by?: string | null
          closed_by?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Update: {
          id?: string
          session_number?: string
          table_id?: string | null
          customer_id?: string | null
          subtotal?: number
          discount_amount?: number
          tax_amount?: number
          total_amount?: number
          status?: Database["public"]["Enums"]["session_status"] | null
          opened_at?: string | null
          closed_at?: string | null
          opened_by?: string | null
          closed_by?: string | null
          notes?: string | null
          created_at?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "order_sessions_table_id_fkey"
            columns: ["table_id"]
            isOneToOne: false
            referencedRelation: "restaurant_tables"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_sessions_customer_id_fkey"
            columns: ["customer_id"]
            isOneToOne: false
            referencedRelation: "customers"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_sessions_opened_by_fkey"
            columns: ["opened_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "order_sessions_closed_by_fkey"
            columns: ["closed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      package_items: {
        Row: {
          choice_group: string | null
          created_at: string | null
          display_order: number | null
          id: string
          is_choice_item: boolean | null
          package_id: string | null
          product_id: string | null
          quantity: number
        }
        Insert: {
          choice_group?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_choice_item?: boolean | null
          package_id?: string | null
          product_id?: string | null
          quantity?: number
        }
        Update: {
          choice_group?: string | null
          created_at?: string | null
          display_order?: number | null
          id?: string
          is_choice_item?: boolean | null
          package_id?: string | null
          product_id?: string | null
          quantity?: number
        }
        Relationships: [
          {
            foreignKeyName: "package_items_package_id_fkey"
            columns: ["package_id"]
            isOneToOne: false
            referencedRelation: "packages"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "package_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_selling_products"
            referencedColumns: ["id"]
          },
        ]
      }
      packages: {
        Row: {
          base_price: number
          created_at: string | null
          created_by: string | null
          description: string | null
          id: string
          is_active: boolean | null
          is_addon_eligible: boolean | null
          max_quantity_per_transaction: number | null
          name: string
          package_code: string
          package_type: Database["public"]["Enums"]["package_type"]
          time_restrictions: Json | null
          updated_at: string | null
          valid_from: string | null
          valid_until: string | null
          vip_price: number | null
        }
        Insert: {
          base_price: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_addon_eligible?: boolean | null
          max_quantity_per_transaction?: number | null
          name: string
          package_code: string
          package_type?: Database["public"]["Enums"]["package_type"]
          time_restrictions?: Json | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          vip_price?: number | null
        }
        Update: {
          base_price?: number
          created_at?: string | null
          created_by?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          is_addon_eligible?: boolean | null
          max_quantity_per_transaction?: number | null
          name?: string
          package_code?: string
          package_type?: Database["public"]["Enums"]["package_type"]
          time_restrictions?: Json | null
          updated_at?: string | null
          valid_from?: string | null
          valid_until?: string | null
          vip_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "packages_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      price_history: {
        Row: {
          changed_by: string | null
          created_at: string | null
          effective_date: string
          id: string
          new_base_price: number | null
          new_cost_price: number | null
          new_vip_price: number | null
          old_base_price: number | null
          old_cost_price: number | null
          old_vip_price: number | null
          product_id: string | null
          reason: string | null
        }
        Insert: {
          changed_by?: string | null
          created_at?: string | null
          effective_date: string
          id?: string
          new_base_price?: number | null
          new_cost_price?: number | null
          new_vip_price?: number | null
          old_base_price?: number | null
          old_cost_price?: number | null
          old_vip_price?: number | null
          product_id?: string | null
          reason?: string | null
        }
        Update: {
          changed_by?: string | null
          created_at?: string | null
          effective_date?: string
          id?: string
          new_base_price?: number | null
          new_cost_price?: number | null
          new_vip_price?: number | null
          old_base_price?: number | null
          old_cost_price?: number | null
          old_vip_price?: number | null
          product_id?: string | null
          reason?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "price_history_changed_by_fkey"
            columns: ["changed_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "price_history_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_selling_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addon_associations: {
        Row: {
          addon_id: string
          is_default: boolean | null
          product_id: string
        }
        Insert: {
          addon_id: string
          is_default?: boolean | null
          product_id: string
        }
        Update: {
          addon_id?: string
          is_default?: boolean | null
          product_id?: string
        }
        Relationships: [
          {
            foreignKeyName: "product_addon_associations_addon_id_fkey"
            columns: ["addon_id"]
            isOneToOne: false
            referencedRelation: "product_addons"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_associations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_associations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_addon_associations_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_selling_products"
            referencedColumns: ["id"]
          },
        ]
      }
      product_addons: {
        Row: {
          created_at: string | null
          description: string | null
          id: string
          is_active: boolean | null
          name: string
          price: number
          updated_at: string | null
        }
        Insert: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name: string
          price: number
          updated_at?: string | null
        }
        Update: {
          created_at?: string | null
          description?: string | null
          id?: string
          is_active?: boolean | null
          name?: string
          price?: number
          updated_at?: string | null
        }
        Relationships: []
      }
      product_categories: {
        Row: {
          color_code: string | null
          created_at: string | null
          default_destination:
            | Database["public"]["Enums"]["order_destination"]
            | null
          description: string | null
          display_order: number | null
          id: string
          is_active: boolean | null
          name: string
          parent_category_id: string | null
          updated_at: string | null
        }
        Insert: {
          color_code?: string | null
          created_at?: string | null
          default_destination?:
            | Database["public"]["Enums"]["order_destination"]
            | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Update: {
          color_code?: string | null
          created_at?: string | null
          default_destination?:
            | Database["public"]["Enums"]["order_destination"]
            | null
          description?: string | null
          display_order?: number | null
          id?: string
          is_active?: boolean | null
          name?: string
          parent_category_id?: string | null
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "product_categories_parent_category_id_fkey"
            columns: ["parent_category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
        ]
      }
      product_suppliers: {
        Row: {
          created_at: string | null
          is_primary: boolean | null
          minimum_order_quantity: number | null
          product_id: string
          supplier_id: string
          supplier_sku: string | null
          unit_cost: number | null
        }
        Insert: {
          created_at?: string | null
          is_primary?: boolean | null
          minimum_order_quantity?: number | null
          product_id: string
          supplier_id: string
          supplier_sku?: string | null
          unit_cost?: number | null
        }
        Update: {
          created_at?: string | null
          is_primary?: boolean | null
          minimum_order_quantity?: number | null
          product_id?: string
          supplier_id?: string
          supplier_sku?: string | null
          unit_cost?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_selling_products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "product_suppliers_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      products: {
        Row: {
          alcohol_percentage: number | null
          barcode: string | null
          base_price: number
          category_id: string | null
          cost_price: number | null
          created_at: string | null
          created_by: string | null
          current_stock: number | null
          description: string | null
          display_order: number | null
          id: string
          image_url: string | null
          is_active: boolean | null
          is_featured: boolean | null
          name: string
          reorder_point: number | null
          reorder_quantity: number | null
          size_variant: string | null
          sku: string
          unit_of_measure: string | null
          updated_at: string | null
          vip_price: number | null
        }
        Insert: {
          alcohol_percentage?: number | null
          barcode?: string | null
          base_price: number
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name: string
          reorder_point?: number | null
          reorder_quantity?: number | null
          size_variant?: string | null
          sku: string
          unit_of_measure?: string | null
          updated_at?: string | null
          vip_price?: number | null
        }
        Update: {
          alcohol_percentage?: number | null
          barcode?: string | null
          base_price?: number
          category_id?: string | null
          cost_price?: number | null
          created_at?: string | null
          created_by?: string | null
          current_stock?: number | null
          description?: string | null
          display_order?: number | null
          id?: string
          image_url?: string | null
          is_active?: boolean | null
          is_featured?: boolean | null
          name?: string
          reorder_point?: number | null
          reorder_quantity?: number | null
          size_variant?: string | null
          sku?: string
          unit_of_measure?: string | null
          updated_at?: string | null
          vip_price?: number | null
        }
        Relationships: [
          {
            foreignKeyName: "products_category_id_fkey"
            columns: ["category_id"]
            isOneToOne: false
            referencedRelation: "product_categories"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "products_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_order_items: {
        Row: {
          created_at: string | null
          id: string
          notes: string | null
          po_id: string | null
          product_id: string | null
          quantity_ordered: number
          quantity_received: number | null
          total_cost: number
          unit_cost: number
        }
        Insert: {
          created_at?: string | null
          id?: string
          notes?: string | null
          po_id?: string | null
          product_id?: string | null
          quantity_ordered: number
          quantity_received?: number | null
          total_cost: number
          unit_cost: number
        }
        Update: {
          created_at?: string | null
          id?: string
          notes?: string | null
          po_id?: string | null
          product_id?: string | null
          quantity_ordered?: number
          quantity_received?: number | null
          total_cost?: number
          unit_cost?: number
        }
        Relationships: [
          {
            foreignKeyName: "purchase_order_items_po_id_fkey"
            columns: ["po_id"]
            isOneToOne: false
            referencedRelation: "purchase_orders"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "products"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_product_stock_status"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_order_items_product_id_fkey"
            columns: ["product_id"]
            isOneToOne: false
            referencedRelation: "v_top_selling_products"
            referencedColumns: ["id"]
          },
        ]
      }
      purchase_orders: {
        Row: {
          actual_delivery_date: string | null
          approved_by: string | null
          created_at: string | null
          created_by: string | null
          expected_delivery_date: string | null
          id: string
          notes: string | null
          order_date: string
          po_number: string
          received_by: string | null
          status: string | null
          subtotal: number
          supplier_id: string | null
          tax_amount: number | null
          total_amount: number
          updated_at: string | null
        }
        Insert: {
          actual_delivery_date?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date: string
          po_number: string
          received_by?: string | null
          status?: string | null
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Update: {
          actual_delivery_date?: string | null
          approved_by?: string | null
          created_at?: string | null
          created_by?: string | null
          expected_delivery_date?: string | null
          id?: string
          notes?: string | null
          order_date?: string
          po_number?: string
          received_by?: string | null
          status?: string | null
          subtotal?: number
          supplier_id?: string | null
          tax_amount?: number | null
          total_amount?: number
          updated_at?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "purchase_orders_approved_by_fkey"
            columns: ["approved_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_created_by_fkey"
            columns: ["created_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_received_by_fkey"
            columns: ["received_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
          {
            foreignKeyName: "purchase_orders_supplier_id_fkey"
            columns: ["supplier_id"]
            isOneToOne: false
            referencedRelation: "suppliers"
            referencedColumns: ["id"]
          },
        ]
      }
      restaurant_tables: {
        Row: {
          area: string | null
          capacity: number | null
          created_at: string | null
          current_order_id: string | null
          id: string
          is_active: boolean | null
          notes: string | null
          status: Database["public"]["Enums"]["table_status"] | null
          table_number: string
          updated_at: string | null
        }
        Insert: {
          area?: string | null
          capacity?: number | null
          created_at?: string | null
          current_order_id?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          status?: Database["public"]["Enums"]["table_status"] | null
          table_number: string
          updated_at?: string | null
        }
        Update: {
          area?: string | null
          capacity?: number | null
          created_at?: string | null
          current_order_id?: string | null
          id?: string
          is_active?: boolean | null
          notes?: string | null
          status?: Database["public"]["Enums"]["table_status"] | null
          table_number?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      split_payments: {
        Row: {
          amount: number
          created_at: string | null
          id: string
          notes: string | null
          order_id: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_number: string | null
        }
        Insert: {
          amount: number
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method: Database["public"]["Enums"]["payment_method"]
          reference_number?: string | null
        }
        Update: {
          amount?: number
          created_at?: string | null
          id?: string
          notes?: string | null
          order_id?: string | null
          payment_method?: Database["public"]["Enums"]["payment_method"]
          reference_number?: string | null
        }
        Relationships: [
          {
            foreignKeyName: "split_payments_order_id_fkey"
            columns: ["order_id"]
            isOneToOne: false
            referencedRelation: "orders"
            referencedColumns: ["id"]
          },
        ]
      }
      suppliers: {
        Row: {
          address: string | null
          contact_person: string | null
          created_at: string | null
          email: string | null
          id: string
          is_active: boolean | null
          lead_time_days: number | null
          name: string
          notes: string | null
          payment_terms: string | null
          phone: string | null
          supplier_code: string
          updated_at: string | null
        }
        Insert: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          supplier_code: string
          updated_at?: string | null
        }
        Update: {
          address?: string | null
          contact_person?: string | null
          created_at?: string | null
          email?: string | null
          id?: string
          is_active?: boolean | null
          lead_time_days?: number | null
          name?: string
          notes?: string | null
          payment_terms?: string | null
          phone?: string | null
          supplier_code?: string
          updated_at?: string | null
        }
        Relationships: []
      }
      system_settings: {
        Row: {
          category: string | null
          data_type: string
          description: string | null
          is_public: boolean | null
          key: string
          updated_at: string | null
          updated_by: string | null
          value: string
        }
        Insert: {
          category?: string | null
          data_type: string
          description?: string | null
          is_public?: boolean | null
          key: string
          updated_at?: string | null
          updated_by?: string | null
          value: string
        }
        Update: {
          category?: string | null
          data_type?: string
          description?: string | null
          is_public?: boolean | null
          key?: string
          updated_at?: string | null
          updated_by?: string | null
          value?: string
        }
        Relationships: [
          {
            foreignKeyName: "system_settings_updated_by_fkey"
            columns: ["updated_by"]
            isOneToOne: false
            referencedRelation: "users"
            referencedColumns: ["id"]
          },
        ]
      }
      users: {
        Row: {
          created_at: string | null
          email: string
          full_name: string
          id: string
          is_active: boolean | null
          last_login: string | null
          password_hash: string
          role: Database["public"]["Enums"]["user_role"]
          updated_at: string | null
          username: string
        }
        Insert: {
          created_at?: string | null
          email: string
          full_name: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username: string
        }
        Update: {
          created_at?: string | null
          email?: string
          full_name?: string
          id?: string
          is_active?: boolean | null
          last_login?: string | null
          password_hash?: string
          role?: Database["public"]["Enums"]["user_role"]
          updated_at?: string | null
          username?: string
        }
        Relationships: []
      }
    }
    Views: {
      v_daily_sales_summary: {
        Row: {
          average_transaction: number | null
          sale_date: string | null
          total_discounts: number | null
          total_revenue: number | null
          transaction_count: number | null
          unique_customers: number | null
        }
        Relationships: []
      }
      v_product_stock_status: {
        Row: {
          category_name: string | null
          current_stock: number | null
          id: string | null
          name: string | null
          reorder_point: number | null
          sku: string | null
          stock_status: string | null
          unit_of_measure: string | null
        }
        Relationships: []
      }
      v_top_selling_products: {
        Row: {
          id: string | null
          name: string | null
          sku: string | null
          times_ordered: number | null
          total_quantity_sold: number | null
          total_revenue: number | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      adjustment_reason:
        | "purchase"
        | "damaged"
        | "expired"
        | "theft"
        | "waste"
        | "count_correction"
        | "transfer_in"
        | "transfer_out"
        | "sale_deduction"
        | "void_return"
      adjustment_type:
        | "stock_in"
        | "stock_out"
        | "transfer"
        | "physical_count"
        | "sale"
        | "void_return"
      customer_tier: "regular" | "vip_silver" | "vip_gold" | "vip_platinum"
      discount_type: "percentage" | "fixed_amount" | "complimentary"
      event_type: "birthday" | "anniversary" | "custom"
      kitchen_order_status: "pending" | "preparing" | "ready" | "served" | "cancelled"
      order_destination: "kitchen" | "bartender" | "both"
      order_status: "pending" | "completed" | "voided" | "on_hold" | "draft" | "confirmed" | "preparing" | "ready" | "served"
      package_type: "vip_only" | "regular" | "promotional"
      payment_method:
        | "cash"
        | "card"
        | "gcash"
        | "paymaya"
        | "bank_transfer"
        | "split"
      session_status: "open" | "closed" | "abandoned"
      table_status: "available" | "occupied" | "reserved" | "cleaning"
      user_role: "admin" | "manager" | "cashier" | "kitchen" | "bartender"
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
      adjustment_reason: [
        "purchase",
        "damaged",
        "expired",
        "theft",
        "waste",
        "count_correction",
        "transfer_in",
        "transfer_out",
        "sale_deduction",
        "void_return",
      ],
      adjustment_type: [
        "stock_in",
        "stock_out",
        "transfer",
        "physical_count",
        "sale",
        "void_return",
      ],
      customer_tier: ["regular", "vip_silver", "vip_gold", "vip_platinum"],
      discount_type: ["percentage", "fixed_amount", "complimentary"],
      event_type: ["birthday", "anniversary", "custom"],
      kitchen_order_status: ["pending", "preparing", "ready", "served", "cancelled"],
      order_destination: ["kitchen", "bartender", "both"],
      order_status: [
        "pending",
        "completed",
        "voided",
        "on_hold",
        "draft",
        "confirmed",
        "preparing",
        "ready",
        "served",
      ],
      package_type: ["vip_only", "regular", "promotional"],
      payment_method: [
        "cash",
        "card",
        "gcash",
        "paymaya",
        "bank_transfer",
        "split",
      ],
      session_status: ["open", "closed", "abandoned"],
      table_status: ["available", "occupied", "reserved", "cleaning"],
      user_role: ["admin", "manager", "cashier", "kitchen", "bartender"],
    },
  },
} as const
