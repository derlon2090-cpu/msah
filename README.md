# ممحاة الذكاء الاصطناعي

MVP عربي RTL لمنصة SaaS لإزالة الشعارات والعناصر غير المرغوبة من الصور. الواجهة مبنية بـ Next.js + TypeScript + Tailwind، مع مكونات UI بأسلوب shadcn، وطبقة تخزين قابلة للعمل محليا أو عبر Supabase/PostgreSQL.

## التشغيل

```bash
npm install
npm run dev
```

افتح:

- الصفحة الرئيسية: `http://localhost:3000`
- المحرر: `http://localhost:3000/editor`
- التفعيل: `http://localhost:3000/activate`
- الصور: `http://localhost:3000/images`
- الأسعار: `http://localhost:3000/pricing`
- الأدمن: `http://localhost:3000/admin`

## متغيرات البيئة

انسخ `.env.example` إلى `.env.local` وعدل القيم:

```env
ADMIN_EMAIL=admin@demo.com
ADMIN_PASSWORD=Admin12345!
ADMIN_SESSION_SECRET=change-this-long-random-secret
COOKIE_SECURE=false
```

للنشر على HTTPS اجعل `COOKIE_SECURE=true` أو احذفها حتى تستخدم الكوكي الآمن تلقائيا في production.

## Supabase

مخطط الجداول موجود في:

```text
supabase/schema.sql
```

الجداول الأساسية:

- `activation_codes`
- `processed_images`

إذا لم تكن متغيرات Supabase مضبوطة، يعمل الـ MVP بتخزين محلي داخل `.data/db.json` ورفع الصور إلى `public/uploads`.

## كود تجربة

يوجد كود مبدئي في التخزين المحلي ومخطط Supabase:

```text
DEMO-2026
```

يعرض: `18 من 20 استخدام`.

## مقارنة مع المرجع

- هيدر عربي RTL أبيض مع شعار واضح.
- منطقة "الدخول عبر كود التفعيل فقط" صغيرة وليست مودال كبير.
- المحرر ظاهر مباشرة ومقفل قبل التفعيل.
- القفل مدمج داخل المحرر ويتحول إلى مفتوح بعد التفعيل.
- أدوات المحرر: رفع صورة، تحديد مستطيل، فرشاة Mask، ممحاة Mask، تراجع، إعادة، تكبير، تصغير، قبل/بعد.
- لوحة جانبية للكشف الذكي مع حالة الاكتشاف ومرات الاستخدام المتبقية والصور السابقة.
- استخدام العبارة "مرات الاستخدام المتبقية" وعدم استخدام "نقاط" أو "كريدت".
- صفحة أدمن مباشرة على `/admin` مع دخول مستقل وإحصائيات وإنشاء/تعديل/تعطيل/حذف الأكواد.

## الفحوصات

```bash
npm run typecheck
npm run build
```
