import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";
import LogoutButton from "@/components/LogoutButton";

export default async function PanelPage() {

  const cookieStore = await cookies();
  const session = cookieStore.get("session")?.value;

  console.log("SESSION RAW:", session);

  // 🔒 VALIDACIÓN SEGURA
  if (!session) {
    return <div>No autorizado</div>;
  }

  let business_id: string;

  try {
    const parsed = JSON.parse(session);
    business_id = parsed.business_id;
  } catch (err) {
    console.error("SESSION PARSE ERROR", err);
    return <div>Error de sesión</div>;
  }

  // 🔥 RESTAURANTE
  const { data: restaurant, error: restaurantError } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", business_id)
    .single();

  if (restaurantError) {
    console.error("RESTAURANT ERROR:", restaurantError);
  }

  // 🔥 RESERVAS
  const { data: reservations, error: reservationsError } = await supabase
    .from("appointments")
    .select(`
      id,
      date,
      time,
      people,
      status,
      name,
      phone
    `)
    .eq("business_id", business_id)
    .order("date", { ascending: true });

  if (reservationsError) {
    console.error("RESERVATIONS ERROR:", reservationsError);
  }

  return (
    <div className="p-8 space-y-6">

      {/* ✅ TITULO BIEN */}
      <h1 className="text-2xl font-bold">
        {restaurant?.name || "Mi restaurante"}
      </h1>

      {/* 🔥 BLOQUE PLAN */}
      <div className="bg-yellow-100 p-4 rounded">
        Plan activo
        <br />
        <a href="#">Pagar suscripción</a>
      </div>

      {/* 📊 STATS */}
      <div className="text-gray-500">
        Total reservas: {reservations?.length || 0}
      </div>

      {/* 📋 LISTA */}
      <div className="space-y-3">

        {reservations?.map((r) => (

          <div
            key={r.id}
            className="border p-4 rounded flex justify-between"
          >

            <div>
              <div className="font-semibold">
                {r.name}
              </div>

              <div className="text-sm text-gray-500">
                {r.date} - {r.time}
              </div>

              <div className="text-sm">
                {r.people} personas
              </div>
            </div>

            <div className="text-sm">
              {r.status}
            </div>

          </div>

        ))}

      </div>

      {/* 🔓 LOGOUT CORRECTO */}
     <LogoutButton />

    </div>
  );
}