# دليل الرفع (Deployment) والمزامنة لمشروع SOFT-HUB

> الهدف من هذا الملف: أي شخص يجي بعدي يعرف **بالضبط** إزاي نحدّث الداتا، نعمل Git push، وننشر على Vercel بدون ما ينسى خطوة.
> 
> **تنبيه أمني مهم:** ممنوع تكتب أو تلصق أي مفاتيح حسّاسة داخل الريبو أو داخل هذا الملف. استخدم متغيرات البيئة (Environment Variables) داخل جهازك أو داخل Vercel فقط.

---

## 0) المتطلبات (قبل أي رفع)

- Node.js + npm
- Git
- Vercel CLI (`vercel`) — لازم يكون متسطب ومُسجّل دخول
- (اختياري للـ DB migrations / types) Supabase CLI عبر `npx supabase@latest` أو تثبيت supabase cli

أوامر فحص سريعة:

```bash
node -v
npm -v
git --version
vercel --version
```

---

## 1) أماكن الداتا في المشروع (عشان ما تتوهش)

### A) Static datasets (داخل الريبو)
- **Software dataset:**
  - `public/data/software/index.json`
  - أو ملفات داخل `public/data/software/**`
- **Collections dataset:**
  - `public/data/collections/index.json`
  - أو ملفات داخل `public/data/collections/**`

### B) Bundled fallback datasets (مضمّنة داخل الكود)
- **Collections fallback:** `src/lib/data/static-collections-dataset.json`
- **Software fallback (حسب الموجود):** غالبًا عبر `src/lib/services/staticSoftwareRepository.ts` ومصادره.

### C) Supabase (Database)
- الـ Schema والمigrations موجودين هنا:
  - `supabase/migrations/*.sql`

> ملحوظة: النظام عنده fallback تلقائي لما Supabase schema ناقص أو الـ tables فاضية.

---

## 2) متغيرات البيئة (ENV) المطلوبة

### محليًا (على جهازك) — ملف `.env.local`
المفاتيح المتوقعة (بدون وضع القيم هنا):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY` *(Server-only, لا يُستخدم في الواجهة)*

متغيرات إضافية حسب الميزات:

- `ADMIN_API_SECRET` *(لتفعيل لوحة الأدمن و APIs الخاصة بها)*
- `DOWNLOAD_TOKEN_SECRET` *(سر توقيع توكنات التحميل؛ بديلًا عن استخدام `ADMIN_API_SECRET`)*
- `TURNSTILE_SITE_KEY` + `TURNSTILE_SECRET_KEY` *(لحماية صفحة التحميل Turnstile في الإنتاج)*
- `GITHUB_CONTENT_TOKEN` *(رفع الصور/الملفات إلى GitHub Contents API)*
- `GITHUB_DATA_REPO_OWNER` / `GITHUB_DATA_REPO_NAME` / `GITHUB_DATA_REPO_BRANCH` *(مكان رفع الأصول/الداتا على GitHub)*
- `VERCEL_DEPLOY_HOOK_URL` *(اختياري: لتفعيل زر/endpoint تشغيل deploy hook من لوحة الأدمن)*

### على Vercel (Production + Preview)
نفس المتغيرات السابقة (حسب احتياج المشروع).

> **قاعدة ذهبية:** أي متغير يبدأ بـ `NEXT_PUBLIC_` ممكن يوصل للـ browser. أي شيء secret لا تضعه بـ `NEXT_PUBLIC_`.

---

## 3) Workflow الرفع الأساسي (GitHub + Vercel)

### الخطوة 1: تأكد المشروع يبني بدون أخطاء
```bash
npm install
npm run lint
npm run build
```

### الخطوة 2: Git commit + push
> على Windows PowerShell، أحيانًا الأفضل استخدام `& git` لتجنب مشاكل الترميز.

```powershell
& git status -sb
& git add -A
& git commit -m "feat: your message"
& git push origin main
```

### الخطوة 3: Deploy على Vercel (Production)
```bash
vercel deploy --prod --yes
```

> **مهم:** `vercel deploy --prod` ينشر على *المشروع المرتبط حاليًا* في Vercel.
> 
> - لو عندك مشروعين (Production + Alpha) لازم تتأكد إنك عامل `vercel link` على المشروع الصحيح قبل النشر.
> - لا تفترض إن `soft-hub-alpha.vercel.app` بيتحدث تلقائيًا مع Production؛ ده يعتمد على إعدادات Vercel (Alias/Projects).

---

## 3.1) خطوة تأكيد إن الديبلوي وصل (لا تتخطاها)

بعد أي Deploy (Production أو Alpha)، افتح:

- `/api/version`

لازم يرجع JSON فيه `vercel.commit` و `vercel.deploymentId`.

> لو `/api/version` رجّع `404` يبقى أنت غالبًا نشرت على مشروع مختلف أو الـ deploy لم يحدث فعليًا.

---

## 4) Workflow “Full Stack” (DB migrations + types + Git + Vercel)

في سكربت جاهز ينفّذ أغلب خطوات الريليز:
- `scripts/deploy_full_stack.py`

### ماذا يفعل؟
- (اختياري) يحدّث `.env.local`
- يطبّق migrations على DB عبر Supabase
- يولّد Typescript types:
  - `src/lib/supabase/database.types.ts`
- يعمل commit + push
- يزامن env vars لـ Vercel
- يطلق Deploy

### تشغيل السكربت (مثال عام)
> لا تضع أي secrets في الـ command history. استخدم env vars.

```bash
python scripts/deploy_full_stack.py \
  --project-ref <SUPABASE_PROJECT_REF> \
  --db-url <SUPABASE_DB_URL> \
  --vercel-project soft-hub \
  --github-owner Viladimire --github-repo soft-hub
```

### Environment variables التي يمكن للسكربت قراءتها
- `SUPABASE_SERVICE_ROLE_KEY`
- `VERCEL_TOKEN`
- `GITHUB_TOKEN`

---

## 5) رفع/تحديث GitHub repository عبر PowerShell Script (بديل)

يوجد سكربت:
- `scripts/push_to_github.ps1`

### مثال تشغيله
```powershell
pwsh -NoLogo -NoProfile -File scripts/push_to_github.ps1 `
  -GitHubToken "$Env:GITHUB_TOKEN" `
  -RepoOwner "Viladimire" `
  -Repository "soft-hub" `
  -GitUserName "Viladimire" `
  -GitUserEmail "vladmire2282@gmail.com" `
  -Branch "main" `
  -CommitMessage "chore: sync project"
```

السكربت يقوم بـ:
- إنشاء الريبو لو غير موجود
- `git init` لو المشروع ليس git repo
- `git add -A` + commit + push

---

## 6) تحديث الداتا (Software / Collections) بدون Supabase

### خيار A (الأبسط): تعديل ملفات `public/data/**`
1) حدّث:
- `public/data/software/index.json`
- `public/data/collections/index.json`
2) شغّل:
```bash
npm run build
```
3) push + deploy

### خيار B: الاعتماد على bundled fallback
- Collections fallback موجود في:
  - `src/lib/data/static-collections-dataset.json`
- أي تعديل هنا يحتاج build + deploy.

---

## 7) Supabase (Database) — إرشادات تشغيل migrations

### مكان migrations
- `supabase/migrations/*.sql`

### تطبيق migrations
لو عندك DB URL:
```bash
npx --yes supabase@latest db push --db-url <SUPABASE_DB_URL>
```

### توليد types
```bash
npx --yes supabase@latest gen types typescript --db-url <SUPABASE_DB_URL> > src/lib/supabase/database.types.ts
```

> بعد تحديث الـ types: شغّل `npm run lint` و `npm run build` ثم اعمل commit/push.

---

## 8) Vercel Environment Variables (أهم نقطة في الرفع)

### إعدادها/تحديثها
- من لوحة Vercel: Project → Settings → Environment Variables
- حط المتغيرات في:
  - Production
  - Preview

### بعد تحديث env vars
- اعمل Deploy جديد:
```bash
vercel deploy --prod --yes
```

> **تنبيه:** تغيير env vars على Vercel لا ينعكس على الديبلوي الحالي إلا بعد Deploy جديد.

---

## 9) Troubleshooting سريع

### A) الموقع يطلع “Empty” في Collections
- السبب غالبًا: Supabase متوصل بس جدول collections فاضي.
- الحل عندنا: fallback تلقائي للـ static dataset.

### B) أخطاء Supabase 400 (schema mismatch)
- عندنا آلية fallback تمنع تكرار requests بعد أول فشل.
- لو عايز ترجع تستخدم Supabase: لازم الـ schema يبقى مطابق (migrations).

### C) React hydration / WebGL context lost
- ممنوع تكرر `OrbitBackground` في صفحات متعددة.
- لازم يكون مصدر واحد عالمي (حاليًا في `src/app/layout.tsx`).

### D) Upload يرجع 500 في لوحة الأدمن
- راجع رسالة الخطأ في الـ UI (مفروض تحتوي `buildSha` و `githubStatus` لو المشكلة من GitHub).
- الأسباب الشائعة:
  - `GITHUB_CONTENT_TOKEN` ناقص/غير صالح أو بدون صلاحيات.
  - حجم الصورة كبير بعد المعالجة (يتسبب في 413/فشل رفع GitHub).

### E) Download يظهر رسالة Turnstile غير مُعدّ
- في الإنتاج: لازم ضبط `TURNSTILE_SITE_KEY` و `TURNSTILE_SECRET_KEY`.
- على بيئات الاختبار قد يكون فيه bypass حسب الكود/الإعدادات، لكن الأفضل ضبط المتغيرات للإنتاج.

---

## 10) Checklist قبل أي Release

- [ ] `npm run lint`
- [ ] `npm run build`
- [ ] التأكد إن مفيش secrets في أي ملف متتبع
- [ ] `git status -sb` نظيف بعد الـ commit
- [ ] `git push origin main`
- [ ] `vercel deploy --prod --yes`
- [ ] فتح `soft-hub-alpha.vercel.app` وتجربة:
  - [ ] Home
  - [ ] Library `/en/software`
  - [ ] Search `/en/search`
  - [ ] Collections `/en/collections`

---

## 11) ملاحظة أمنية أخيرة
- أي مفاتيح تم مشاركتها في شات/مكان عام تعتبر **compromised** ويجب تدويرها.
- لا ترفع `.env.local` إلى Git.
