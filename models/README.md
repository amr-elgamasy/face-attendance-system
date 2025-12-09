# نماذج face-api.js

هذا المجلد يحتوي على نماذج الذكاء الاصطناعي المطلوبة للتعرف على الوجوه.

## 📦 تحميل النماذج

لتشغيل النظام، يجب تحميل النماذج التالية:

### الطريقة الأولى: تحميل تلقائي من CDN
النظام يحمل النماذج تلقائياً من CDN عند فتح الموقع لأول مرة.

### الطريقة الثانية: تحميل يدوي
لتسريع التحميل، يمكنك تحميل النماذج محلياً:

```bash
cd models

# تحميل SSD MobileNet v1 (للكشف عن الوجوه)
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/ssd_mobilenetv1_model-shard2

# تحميل Face Landmark 68 (لتحديد ملامح الوجه)
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_landmark_68_model-shard1

# تحميل Face Recognition (للتعرف على الوجوه)
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-weights_manifest.json
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard1
curl -O https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/face_recognition_model-shard2
```

### باستخدام PowerShell (Windows):
```powershell
cd models

$files = @(
    "ssd_mobilenetv1_model-weights_manifest.json",
    "ssd_mobilenetv1_model-shard1",
    "ssd_mobilenetv1_model-shard2",
    "face_landmark_68_model-weights_manifest.json",
    "face_landmark_68_model-shard1",
    "face_recognition_model-weights_manifest.json",
    "face_recognition_model-shard1",
    "face_recognition_model-shard2"
)

foreach($file in $files) {
    Invoke-WebRequest -Uri "https://raw.githubusercontent.com/justadudewhohacks/face-api.js/master/weights/$file" -OutFile "$file"
    Write-Host "Downloaded: $file"
}
```

## 📋 النماذج المطلوبة

1. **ssd_mobilenetv1_model** (~5 MB)
   - للكشف عن الوجوه في الصورة
   
2. **face_landmark_68_model** (~350 KB)
   - لتحديد 68 نقطة على الوجه
   
3. **face_recognition_model** (~6 MB)
   - لاستخراج الوصف الرقمي للوجه (128 رقم)

**المجموع**: ~11 MB

## ⚠️ ملاحظة

النماذج لم يتم تضمينها في Git بسبب حجمها الكبير. 
يتم تحميلها تلقائياً عند أول استخدام، أو يمكنك تحميلها يدوياً باستخدام الأوامر أعلاه.
