export type AppointmentStatus =
  | "confirmed"
  | "completed"
  | "cancelled"
  | "no_show";

export type Appointment = {
  id: number;
  reservation_code: string;
  client_dni: string;
  date: string;
  time: string;
  people: number;
  assigned_table_capacity?: number;
  notes?: string;
  status: AppointmentStatus;
  created_at?: string;

  // 👇 ESTO ES LO NUEVO
  clients?: {
    dni: string;
    name: string;
    email?: string;
    phone?: string;
  };
};