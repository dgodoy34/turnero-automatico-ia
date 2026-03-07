"use client";

interface Props{
open:boolean
onClose:()=>void
children:React.ReactNode
}

export default function Modal({open,onClose,children}:Props){

if(!open) return null

return(

<div
className="fixed inset-0 bg-black/40 flex items-center justify-center z-50"
onClick={onClose}
>

<div
className="bg-white rounded-xl p-6 w-[420px]"
onClick={(e)=>e.stopPropagation()}
>

{children}

</div>

</div>

)

}