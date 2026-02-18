import TurneroUI from "@/components/turnero/TurneroUI";

export default function Page() {
  return (
    <main className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      <div className="mx-auto max-w-6xl px-4 py-10">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-4xl font-bold tracking-tight text-slate-900">
            Turnero AI
          </h1>
          <p className="mt-2 text-slate-600">
            Gestión profesional de clientes y turnos. Listo para integrar WhatsApp Bot 🤖📲
          </p>
        </div>

        {/* UI principal */}
        <TurneroUI />
      </div>
    </main>
  );
}
