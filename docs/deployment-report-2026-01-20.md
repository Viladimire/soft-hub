# تقرير النشر والمزامنة – 20 يناير 2026

## 1. نظرة عامة
- **المشروع:** soft-hub
- **البيئة المستهدفة:** Vercel (رابط المعاينة: https://soft-fwqsubohp-vlads-projects-645bcdb7.vercel.app/en)
- **مستودع GitHub:** https://github.com/Viladimire/soft-hub
- **آخر التزام:** `6493d0c592bfc7d739a5308c662f1bdc53e5882d` بعنوان `chore: sync project` (20 يناير 2026، 18:23 +02:00)

## 2. خطوات الرفع والمزامنة
1. تشغيل السكربت `scripts/push_to_github.ps1` بعد توفير رمز وصول GitHub في متغير بيئي مؤقت آمن، ثم تمريره عبر المعاملات:
   ```powershell
   pwsh -NoLogo -NoProfile -File scripts/push_to_github.ps1 \
     -GitHubToken "$Env:GITHUB_TOKEN" \
     -RepoOwner "Viladimire" \
     -Repository "soft-hub" \
     -GitUserName "Viladimire" \
     -GitUserEmail "vladmire2282@gmail.com"
   ```
2. السكربت تحقّق تلقائيًا من وجود المستودع ثم أنشأه عند عدم وجوده عبر GitHub REST API مع خيار `PrivateRepo = $false` (مستودع عام).
3. السكربت أدار تهيئة git، أضاف كل الملفات، أنشأ الالتزام، ثم دفع إلى الفرع `main` مع ضبط `origin` و`upstream`.
4. تمت مزامنة جميع الملفات بما في ذلك السكربتات الجديدة (تنظيف نشرات Vercel، إعادة النشر، التحقّق، إلخ) والبيانات الثابتة والصور.

## 3. فحص حالة الموقع
- تم تنفيذ طلب GET على الرابط `https://soft-fwqsubohp-vlads-projects-645bcdb7.vercel.app/en` من خلال PowerShell.
- الاستجابة كانت صفحة مصادقة من Vercel (تتضمن عنصر spinner ورسالة "Authenticating" وإعادة توجيه إلى `vercel.com/sso-api`).
- هذا يشير إلى أن الموقع الحالي يتطلب جلسة مصادقة Vercel للوصول، ولم يعرض المحتوى العام حتى الآن.

## 4. ملفات وسكربتات داعمة
- `scripts/push_to_github.ps1`: سكربت الرفع التلقائي، يتضمن:
  - إنشاء المستودع عبر REST API عند عدم وجوده.
  - ضبط `git config`، إنشاء الالتزام، والدفع باستخدام رأس HTTP موقّع بالتوكن.
- سكربتات داعمة أخرى ضمن `/scripts` يمكن استخدامها للعمليات المستقبلية:
  - `auto_redeploy_vercel.py`, `delete_all_deployments.py`, `promote_vercel_deployment.py`, `verify_deployment_status.py`، وغيرها.

## 5. توصيات للخطوات القادمة
1. **التحقق من إعدادات Vercel:** ensure عدم طلب المصادقة عند زيارة الرابط العام، أو ربط الدومين الإنتاجي الرسمي (`soft-hub-alpha.vercel.app`) بالنشر الأخير عند اكتماله.
2. **تحديث README:** إضافة تعليمات مختصرة لخط سير الرفع (GitHub + Vercel) لتسهيل الرجوع إليها من قبل الفريق.
3. **أتمتة إضافية (اختياري):** ربط GitHub Actions مع Vercel لإطلاق النشر التلقائي عند وصول التغييرات إلى الفرع `main`.

## 6. بيانات الوصول (يرجى حفظها بأمان)
- يتم تخزين رموز الوصول (GitHub، Vercel، Supabase) خارج المستودع في أدوات إدارة الأسرار. يوصى بإعادة إنتاج المتغيرات عند الحاجة عبر مدير الأسرار.

> **تنبيه أمني:** يُمنع إدراج الرموز الحساسة داخل المستودع أو المستندات العامة. استخدم متغيرات البيئة أو خوادم الأسرار وفق أفضل الممارسات الأمنية.
