import { Check, Sparkles } from "lucide-react";

export function Logo() {
  return (
    <div className="flex items-center gap-3">
      <div className="relative h-11 w-11 rounded-md border-4 border-slate-950 bg-white">
        <Sparkles className="absolute -left-2 -top-2 h-5 w-5 text-blue-600" />
        <Check className="absolute -bottom-2 left-1 h-8 w-8 rounded-full text-blue-600" strokeWidth={4} />
      </div>
      <span className="text-xl font-extrabold text-slate-950">ممحاة الذكاء الاصطناعي</span>
    </div>
  );
}
