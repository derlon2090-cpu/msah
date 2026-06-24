import { Header } from "@/components/Header";
import { EditorMvp } from "@/components/EditorMvp";

export default function EditorPage() {
  return (
    <main>
      <Header />
      <section className="app-container py-8">
        <EditorMvp />
      </section>
    </main>
  );
}
