import Link from "next/link";

export default function TurneroLayout({
children,
}:{
children:React.ReactNode
}){

return(

<div className="flex min-h-screen bg-gray-100">

{/* SIDEBAR */}

<div className="w-64 bg-slate-900 text-white p-6 space-y-6">

<h1 className="text-xl font-bold">
Turnero AI
</h1>

<nav className="space-y-3 text-sm">

<Link href="/turnero">
<div className="cursor-pointer hover:text-indigo-400">
Dashboard
</div>
</Link>

<Link href="/turnero/reservas">
<div className="cursor-pointer hover:text-indigo-400">
Reservas
</div>
</Link>

<Link href="/turnero/clientes">
<div className="cursor-pointer hover:text-indigo-400">
Clientes
</div>
</Link>

<Link href="/turnero/mesas">
<div className="cursor-pointer hover:text-indigo-400">
Mesas
</div>
</Link>

<Link href="/turnero/configuracion">
<div className="cursor-pointer hover:text-indigo-400">
Configuración
</div>
</Link>

</nav>

</div>

{/* CONTENIDO */}

<div className="flex-1 p-10">

{children}

</div>

</div>

)
}
