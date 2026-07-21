# نشر Al Hinnawi على Coolify

> هذا مسار بديل للموارد المنفصلة والبناء على الخادم. للخوادم محدودة الذاكرة والمعالج استخدم [المسار الموصى به بالصورة الجاهزة](COOLIFY_QUICKSTART.md)، إذ يبني GitHub Actions التطبيق خارج Hetzner.

## 1. الموارد

1. أنشئ Project في Coolify.
2. أضف PostgreSQL كـDatabase Resource مستقلة. لا تضفها إلى Dockerfile ولا تنشر 5432 للعامة.
3. أنشئ Application من Git واختر Dockerfile deployment.
4. اربط domain، فعّل HTTPS، واضبط health endpoint على `/api/health` والمنفذ `3000`.
5. استخدم internal database URL في `DATABASE_URL`. أنشئ مستخدم runtime محدودًا، ومستخدم migration في `DATABASE_MIGRATION_URL` إن أمكن.

## 2. متغيرات البيئة

انسخ مفاتيح `.env.example` إلى Environment Variables ولا تلصق أسرارًا في Dockerfile أو build arguments. يجب أن يكون `APP_URL` و`BETTER_AUTH_URL` هما HTTPS origin النهائي، و`BETTER_AUTH_TRUSTED_ORIGINS` قائمة origins مفصولة بفواصل. ولّد `BETTER_AUTH_SECRET` و`ANALYTICS_SESSION_SECRET` بقيم عشوائية طويلة.

للإنتاج اختر S3 افتراضيًا واضبط `S3_ENDPOINT`, `S3_REGION`, `S3_BUCKET`, `S3_ACCESS_KEY_ID`, `S3_SECRET_ACCESS_KEY`, `S3_FORCE_PATH_STYLE`, و`MEDIA_PUBLIC_BASE_URL`. اجعل bucket/CORS يسمح PUT من domain الإدارة فقط وGET العام للوسائط المنشورة حسب سياسة المزود.

## 3. migrations وبدء التشغيل

في **أول نشر**، وبعد أن تصبح الحاوية Running، افتح Terminal الخاص بالتطبيق ونفّذ:

```bash
pnpm deploy:check
pnpm db:migrate
pnpm db:seed
```

ثم أضف للتحديثات اللاحقة Pre-deployment Command:

```bash
pnpm db:migrate
```

Coolify يشغّل pre-deployment داخل الحاوية القائمة، ولذلك لا تعتمد عليه وحده في أول نشر. لا تستخدم `drizzle-kit push`. الأمر الافتراضي للويب `node server.js`، ويستمع على `0.0.0.0:3000`.

## 4. Media Worker

أنشئ Application ثانية من Git والصورة/Dockerfile نفسيهما. لا تضف domain. استخدم environment نفسها وغيّر command إلى:

```bash
pnpm worker:media
```

يمكن تشغيل عدة workers لأن claim يستخدم `FOR UPDATE SKIP LOCKED`. المهام idempotent وبحد محاولات.

## 5. local storage البديل

اضبط `STORAGE_DRIVER=local`, `MEDIA_ROOT=/data/media`. إذا كان web والـworker موردين منفصلين فاستخدم لهما Bind Mount مشتركًا على الخادم نفسه (مثلاً `/data/alhinnawi/media` إلى `/data/media`)؛ Coolify يعزل اسم Volume العادية حسب UUID المورد. لا تستخدم عدة replicas دون shared filesystem، ويفضّل S3 للإنتاج القابل للتوسع. حذف Application أو التخزين قد يحذف الملفات؛ خذ نسخة منفصلة قبل أي حذف أو ترحيل.

## 6. النسخ الاحتياطي

- فعّل scheduled PostgreSQL backups في Coolify يوميًا واحتفظ بأكثر من نسخة.
- اضبط وجهة S3-compatible خارج الخادم إن كانت متاحة، مع تشفير وretention.
- اختبر استعادة dump في قاعدة مؤقتة شهريًا.
- في S3 فعّل versioning وسياسة lifecycle مناسبة. في local انسخ `/data/media` بـsnapshot/backup مستقل.
- احتفظ بقاعدة البيانات والوسائط من نفس النافذة الزمنية قدر الإمكان.

مثال استعادة قاعدة في مورد جديد (لا تنفذه فوق الإنتاج مباشرة):

```bash
pg_restore --clean --if-exists --no-owner --dbname="$NEW_DATABASE_URL" backup.dump
```

## 7. rollback

1. migrations هنا forward-only. راجع SQL قبل النشر واجعل تغييرات schema المتعارضة على مرحلتين (expand ثم contract).
2. عند فشل إصدار، أعد توجيه التطبيق إلى الصورة السابقة من Coolify.
3. لا تُرجع schema تلقائيًا إن كان الإصدار السابق متوافقًا معها.
4. إن كانت migration غير قابلة للتوافق، استعد نسخة قاعدة مختبرة إلى مورد جديد ثم بدّل `DATABASE_URL` بعد نافذة صيانة.

## 8. التحقق بعد النشر

- `/api/health` يعيد 200 وقاعدة البيانات `ok`.
- تسجيل الدخول والخروج والاستعادة يعملان.
- صفحة بائع ومشروع وcanonical وsitemap وrobots تعمل.
- ارفع صورة، راقب انتقالها إلى `ready`، وافتح variant.
- امسح QR وتحقق من redirect والعداد.
- تأكد أن 5432 غير مكشوف وأن admin يعيد `X-Robots-Tag: noindex`.
