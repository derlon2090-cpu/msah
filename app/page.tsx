import { Sparkles } from "lucide-react";
import { Header } from "@/components/Header";
import { EditorMvp } from "@/components/EditorMvp";

export default function HomePage() {
  return (
    <main>
      <Header />
      <section className="subtle-grid pb-14 pt-10">
        <div className="app-container">
          <div className="mx-auto max-w-3xl text-center">
            <div className="mb-3 flex justify-center gap-6 text-violet-600">
              <Sparkles className="h-6 w-6" />
              <Sparkles className="h-4 w-4" />
            </div>
            <h1 className="text-balance text-4xl font-black leading-tight text-slate-950 md:text-6xl">
              امسح الشعارات والعناصر غير المرغوبة باحترافية
            </h1>
            <p className="mx-auto mt-5 max-w-2xl text-lg leading-8 text-slate-500">
              تقنية ذكاء اصطناعي تساعدك على تحديد العناصر وإزالتها مع الحفاظ على أبعاد الصورة وجودتها الأصلية.
            </p>
          </div>
          <div className="mt-10">
            <EditorMvp previewLocked />
          </div>
        </div>
      </section>
    </main>
  );
}
