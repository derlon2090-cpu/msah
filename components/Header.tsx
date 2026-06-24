import Link from "next/link";
import { ShieldCheck } from "lucide-react";
import { Logo } from "@/components/Logo";

const links = [
  ["الرئيسية", "/"],
  ["الصور", "/images"],
  ["الأسعار", "/pricing"],
  ["الأدمن", "/admin"]
];

export function Header() {
  return (
    <header className="sticky top-0 z-30 border-b border-slate-200 bg-white/95 backdrop-blur">
      <div className="app-container flex h-[86px] items-center justify-between gap-6">
        <Logo />
        <nav className="hidden items-center gap-9 text-sm font-bold text-slate-600 md:flex">
          {links.map(([label, href]) => (
            <Link
              key={href}
              href={href}
              className="rounded-md px-2 py-3 transition hover:text-blue-700"
            >
              {label}
            </Link>
          ))}
        </nav>
        <Link
          href="/activate"
          className="inline-flex items-center gap-2 rounded-full bg-slate-50 px-5 py-3 text-sm font-bold text-slate-700 ring-1 ring-slate-200 transition hover:bg-blue-50 hover:text-blue-700"
        >
          <ShieldCheck className="h-5 w-5 text-violet-600" />
          الدخول عبر كود التفعيل فقط
        </Link>
      </div>
    </header>
  );
}
