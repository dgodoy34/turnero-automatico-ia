export default function AdminLayout({ children }: { children: React.ReactNode }) {

  return (

    <div className="admin-layout">

      <aside className="admin-sidebar">

        <h2>Turnero AI</h2>

        <nav>

          <a href="/admin">Dashboard</a>

          <a href="/admin/restaurants">
            Restaurantes
          </a>

          <a href="/admin/licenses">
            Licencias
          </a>

          <a href="/admin/payments">
            Pagos
          </a>

          <a href="/admin/whatsapp">
            WhatsApp
          </a>

        </nav>

      </aside>

      <main className="admin-content">

        {children}

      </main>

    </div>

  )

}