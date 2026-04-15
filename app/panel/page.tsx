import { cookies } from "next/headers";
import { supabase } from "@/lib/supabaseClient";

export default async function PanelPage() {

  // ✅ FIX cookies async
  const cookieStore = await cookies();
  const session = cookieStore.get("session");

  if (!session) {
    return <div>No autorizado</div>;
  }

  const { business_id } = JSON.parse(session.value);

  // 🔥 RESTAURANTE
  const { data: restaurant } = await supabase
    .from("restaurants")
    .select("name")
    .eq("id", business_id)
    .single();

  // 🔥 RESERVAS
  const { data: reservations } = await supabase
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

  return (

    <div className="p-8 space-y-6">

      <h1 className="text-2xl font-bold">
        <h1>{restaurant?.name}</h1>

<div className="bg-yellow-100 p-4 rounded">
  Plan activo
  <br />
  <a href="#">Pagar suscripción</a>
</div>
      </h1>

      <div className="text-gray-500">
        Total reservas: {reservations?.length || 0}
      </div>

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

      {/* LOGOUT */}
      <form action="/api/auth/logout" method="POST">
        <button className="bg-red-600 text-white px-4 py-2 rounded">
          Logout
        </button>
      </form>

    </div>
  );
}