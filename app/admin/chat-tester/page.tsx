import { Suspense } from "react";
import ChatTester from "./chattester";

export default function Page() {
  return (
    <Suspense fallback={<div>Cargando...</div>}>
      <ChatTester />
    </Suspense>
  );
}