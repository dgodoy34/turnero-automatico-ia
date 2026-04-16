export type AppointmentStatus =
  | "confirmed"
  | "completed"
  | "no_show"
  | "cancelled";

export type Appointment = {
  id: number;

  reservation_code?: string;

  client_dni: string;

  date: string;
  time: string;

  start_time: string;
  end_time: string;

  people: number;

  assigned_table_capacity?: number;

  tables_used?: number;

  notes?: string;

  status: AppointmentStatus;

  source?: string // 👈 🔥 ESTA ES LA CLAVE

  created_at?: string;

  clients?: {
    name?: string;
    phone?: string;
    email?: string;
  };
};