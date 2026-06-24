import { Header } from "@/components/Header";
import { ActivationClient } from "@/components/ActivationClient";

export default function ActivatePage() {
  return (
    <main>
      <Header />
      <section className="app-container py-14">
        <ActivationClient />
      </section>
    </main>
  );
}
