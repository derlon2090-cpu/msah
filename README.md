# AI Eraser RTL SaaS

واجهة عربية RTL مبنية بـ Next.js App Router وTypeScript، مع باكند حقيقي عبر Prisma وNeon PostgreSQL وتخزين صور خارجي S3-compatible أو Cloudflare R2.

## التشغيل

```bash
npm install
npm run prisma:generate
npm run dev
```

الصفحات الأساسية:

- `/activate`: دخول المستخدم بكود التفعيل.
- `/editor`: معالجة الصور.
- `/images`: صور الكود الحالي، وتظهر فقط قبل انتهاء مدة الحفظ.
- `/admin`: لوحة إدارة الأكواد والصور.

## متغيرات البيئة

انسخ `.env.example` إلى `.env.local` واضبط القيم:

```env
DATABASE_URL=postgresql://USER:PASSWORD@HOST.neon.tech/DB?sslmode=require

ADMIN_EMAIL=admin@example.com
ADMIN_PASSWORD_HASH=$2a$12$replace-with-bcrypt-hash
ADMIN_SESSION_SECRET=change-this-long-random-secret
COOKIE_SECURE=false
CRON_SECRET=change-this-cron-secret
MAX_IMAGE_MB=25

S3_ENDPOINT=https://ACCOUNT_ID.r2.cloudflarestorage.com
S3_REGION=auto
S3_BUCKET=ai-eraser-images
S3_ACCESS_KEY_ID=
S3_SECRET_ACCESS_KEY=
S3_PUBLIC_BASE_URL=https://cdn.example.com
```

أنشئ `ADMIN_PASSWORD_HASH` باستخدام bcrypt، ولا تضع كلمة مرور صريحة في الكود أو ملفات البيئة المشتركة.

## قاعدة البيانات

```bash
npm run prisma:migrate
npm run db:seed
```

الجداول:

- `activation_codes`
- `code_sessions`
- `processed_images`

الجلسات تحفظ في HttpOnly cookie، وقيمة الجلسة المخزنة في قاعدة البيانات hashed.

## حذف الصور المنتهية

الصور تحفظ 10 أيام فقط. شغّل cron يومي يستدعي:

```http
POST /api/cron/delete-expired-images
Authorization: Bearer ${CRON_SECRET}
```

المسار يحذف الملفات من التخزين الخارجي ويحدّث `deleted_at` بدون حذف سجل قاعدة البيانات.

## الفحوصات

```bash
npm run typecheck
npm run build
```
