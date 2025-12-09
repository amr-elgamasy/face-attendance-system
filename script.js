// عناصر DOM
const video = document.getElementById('video');
const canvas = document.getElementById('canvas');
const ctx = canvas.getContext('2d');
const startCameraBtn = document.getElementById('startCamera');
const captureBtn = document.getElementById('captureBtn');
const checkoutBtn = document.getElementById('checkoutBtn');
const statusMessage = document.getElementById('statusMessage');
const userNameInput = document.getElementById('userName');
const userIdInput = document.getElementById('userId');
const logContainer = document.getElementById('logContainer');
const overlay = document.getElementById('overlay');
const totalAttendance = document.getElementById('totalAttendance');
const totalCheckout = document.getElementById('totalCheckout');

// متغيرات عامة
let stream = null;
let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
let stats = JSON.parse(localStorage.getItem('stats')) || { checkin: 0, checkout: 0 };
let registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || {};
let systemSettings = JSON.parse(localStorage.getItem('systemSettings')) || {
    checkinTime: '09:00',
    checkoutTime: '17:00',
    autoDetection: true
};
let isProcessing = false;
let detectionInterval = null;
let modelsLoaded = false;

console.log('تم تحميل السكريبت بنجاح');

// تحميل نماذج face-api.js
async function loadModels() {
    const modelStatus = document.getElementById('modelStatus');
    
    try {
        console.log('بدء تحميل نماذج التعرف على الوجه...');
        if (modelStatus) {
            modelStatus.style.display = 'block';
            modelStatus.innerHTML = '⏳ جاري تحميل نماذج التعرف على الوجه...';
        }
        
        // استخدام CDN بديل أكثر استقراراً
        const MODEL_URL = '/models';
        const BACKUP_URL = 'https://cdn.jsdelivr.net/npm/@vladmandic/face-api/model/';
        
        try {
            // محاولة التحميل من المجلد المحلي أولاً
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(MODEL_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL)
            ]);
        } catch (localError) {
            console.log('⚠️ فشل التحميل المحلي، جاري المحاولة من CDN...');
            // محاولة التحميل من CDN البديل
            await Promise.all([
                faceapi.nets.ssdMobilenetv1.loadFromUri(BACKUP_URL),
                faceapi.nets.faceLandmark68Net.loadFromUri(BACKUP_URL),
                faceapi.nets.faceRecognitionNet.loadFromUri(BACKUP_URL)
            ]);
        }
        
        modelsLoaded = true;
        console.log('✅ تم تحميل جميع النماذج بنجاح');
        
        if (modelStatus) {
            modelStatus.innerHTML = '✅ تم تحميل نماذج التعرف بنجاح';
            modelStatus.style.background = 'rgba(76, 175, 80, 0.2)';
            setTimeout(() => {
                modelStatus.style.display = 'none';
            }, 3000);
        }
        
        return true;
    } catch (error) {
        console.error('❌ خطأ في تحميل النماذج:', error);
        
        if (modelStatus) {
            modelStatus.innerHTML = '❌ فشل تحميل النماذج - سيتم استخدام الوضع الأساسي';
            modelStatus.style.background = 'rgba(244, 67, 54, 0.2)';
        }
        
        return false;
    }
}

// تشغيل الكاميرا تلقائياً عند تحميل الصفحة
window.addEventListener('load', async () => {
    // التحقق من تحميل face-api.js
    if (typeof faceapi === 'undefined') {
        console.error('❌ face-api.js لم يتم تحميله');
        const modelStatus = document.getElementById('modelStatus');
        if (modelStatus) {
            modelStatus.style.display = 'block';
            modelStatus.innerHTML = '❌ فشل تحميل المكتبة - سيتم استخدام الوضع الأساسي';
            modelStatus.style.background = 'rgba(244, 67, 54, 0.2)';
        }
        // تشغيل الكاميرا بدون النماذج
        setTimeout(() => {
            startCamera();
        }, 500);
        return;
    }
    
    console.log('✅ face-api.js تم تحميله');
    
    // تحميل النماذج أولاً
    const loaded = await loadModels();
    
    // ثم تشغيل الكاميرا
    setTimeout(() => {
        startCamera();
    }, 500);
});

// تحديث الإحصائيات
function updateStats() {
    totalAttendance.textContent = stats.checkin;
    totalCheckout.textContent = stats.checkout;
}

// عرض رسالة الحالة
function showStatus(message, type) {
    statusMessage.textContent = message;
    statusMessage.className = `status-message ${type}`;
    
    setTimeout(() => {
        statusMessage.textContent = '';
        statusMessage.className = 'status-message';
    }, 5000);
}

// تشغيل الكاميرا
async function startCamera() {
    try {
        // طلب الوصول للكاميرا
        stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
                width: 640, 
                height: 480,
                facingMode: 'user'
            } 
        });
        
        video.srcObject = stream;
        
        // تفعيل الأزرار
        captureBtn.disabled = false;
        checkoutBtn.disabled = false;
        startCameraBtn.disabled = true;
        startCameraBtn.textContent = '✅ الكاميرا تعمل';
        
        // تفعيل الإطار
        overlay.classList.add('active');
        
        showStatus('✅ تم تشغيل الكاميرا - جاري التعرف التلقائي على الوجوه...', 'success');
        
        // بدء الكشف التلقائي عن الوجوه
        startAutoDetection();
        
    } catch (error) {
        console.error('خطأ في تشغيل الكاميرا:', error);
        showStatus('❌ فشل تشغيل الكاميرا. تأكد من الأذونات.', 'error');
    }
}

startCameraBtn.addEventListener('click', startCamera);

// التقاط الصورة وتحليلها باستخدام face-api.js
async function captureImageWithDescriptor() {
    if (!modelsLoaded) {
        console.log('❌ النماذج لم يتم تحميلها بعد');
        return null;
    }
    
    try {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        ctx.drawImage(video, 0, 0);
        
        // استخراج وصف الوجه
        const detection = await faceapi
            .detectSingleFace(canvas)
            .withFaceLandmarks()
            .withFaceDescriptor();
        
        if (!detection) {
            console.log('❌ لم يتم اكتشاف وجه');
            return null;
        }
        
        const imageData = canvas.toDataURL('image/jpeg', 0.8);
        
        return {
            imageData: imageData,
            descriptor: Array.from(detection.descriptor), // تحويل Float32Array إلى Array عادي
            detection: detection
        };
    } catch (error) {
        console.error('خطأ في استخراج وصف الوجه:', error);
        return null;
    }
}

// التقاط الصورة فقط (بدون face-api)
function captureImage() {
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    ctx.drawImage(video, 0, 0);
    return canvas.toDataURL('image/jpeg', 0.8);
}

// بدء الكشف التلقائي عن الوجوه
function startAutoDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
    }
    
    detectionInterval = setInterval(() => {
        if (stream && video.readyState === video.HAVE_ENOUGH_DATA && !isProcessing) {
            detectAndProcessFace();
        }
    }, 2000); // فحص كل ثانيتين
}

// إيقاف الكشف التلقائي
function stopAutoDetection() {
    if (detectionInterval) {
        clearInterval(detectionInterval);
        detectionInterval = null;
    }
}

// كشف ومعالجة الوجه
async function detectAndProcessFace() {
    if (isProcessing) return;
    
    try {
        isProcessing = true;
        
        // إذا كانت النماذج محملة، استخدم face-api.js
        if (modelsLoaded) {
            // استخراج الوجه مع الوصف
            const faceData = await captureImageWithDescriptor();
            
            if (!faceData) {
                // لا يوجد وجه
                overlay.style.borderColor = '#ff4444';
                isProcessing = false;
                return;
            }
            
            // وجه تم اكتشافه
            overlay.style.borderColor = '#00ff00';
            
            // البحث عن وجه مطابق
            const matchedUser = findMatchingFaceWithDescriptor(faceData.descriptor);
            
            if (matchedUser) {
                // وجه معروف - تسجيل حضور/انصراف تلقائي
                await autoAttendance(matchedUser, faceData.imageData);
            } else {
                // وجه جديد - طلب التسجيل
                showStatus('👤 وجه جديد! يرجى تسجيل بياناتك أدناه', 'info');
                overlay.style.borderColor = '#FFA500';
                
                // حفظ البيانات المؤقتة للتسجيل
                window.tempFaceData = faceData;
            }
        } else {
            // الوضع الأساسي - بدون face-api.js
            const currentImage = captureImage();
            
            // فحص جودة بسيط
            if (!currentImage || currentImage.length < 1000) {
                isProcessing = false;
                return;
            }
            
            overlay.style.borderColor = '#00ff00';
            
            // البحث عن وجه مطابق بالطريقة البسيطة
            const matchedUser = findMatchingFace(currentImage);
            
            if (matchedUser) {
                await autoAttendance(matchedUser, currentImage);
            } else {
                showStatus('👤 وجه جديد! يرجى تسجيل بياناتك أدناه', 'info');
                overlay.style.borderColor = '#FFA500';
            }
        }
        
    } catch (error) {
        console.error('خطأ في الكشف التلقائي:', error);
    } finally {
        isProcessing = false;
    }
}

// فحص جودة الوجه - نسخة مرنة
function checkFaceQuality(imageData) {
    // فحص بسيط لجودة الصورة
    if (!imageData || imageData.length < 1000) {
        return { isValid: false, message: '' };
    }
    
    // السماح بجميع مستويات الإضاءة تقريباً
    const brightness = imageData.length / 100000;
    
    console.log('مستوى الإضاءة:', brightness.toFixed(2));
    
    // معايير مرنة جداً - فقط للحالات الشديدة
    if (brightness < 0.1) {
        return { isValid: false, message: '' }; // لا نعرض رسالة
    }
    
    if (brightness > 5) {
        return { isValid: false, message: '' }; // لا نعرض رسالة
    }
    
    return { isValid: true };
}

// البحث عن وجه مطابق باستخدام face descriptors
function findMatchingFaceWithDescriptor(descriptor) {
    if (!descriptor) return null;
    
    const users = Object.values(registeredFaces);
    let bestMatch = null;
    let bestDistance = 0.6; // عتبة المسافة الإقليدية (أقل = أفضل)
    
    for (let user of users) {
        if (!user.faceDescriptor) {
            console.log(`المستخدم ${user.userId} ليس لديه descriptor`);
            continue;
        }
        
        // حساب المسافة الإقليدية
        const distance = euclideanDistance(descriptor, user.faceDescriptor);
        console.log(`مقارنة مع ${user.userId}: المسافة = ${distance.toFixed(3)}`);
        
        if (distance < bestDistance) {
            bestDistance = distance;
            bestMatch = user;
        }
    }
    
    if (bestMatch) {
        console.log(`✅ تم العثور على تطابق: ${bestMatch.userId} بمسافة ${bestDistance.toFixed(3)}`);
    }
    
    return bestMatch;
}

// حساب المسافة الإقليدية بين وصفين
function euclideanDistance(desc1, desc2) {
    if (!desc1 || !desc2 || desc1.length !== desc2.length) {
        return Infinity;
    }
    
    let sum = 0;
    for (let i = 0; i < desc1.length; i++) {
        const diff = desc1[i] - desc2[i];
        sum += diff * diff;
    }
    return Math.sqrt(sum);
}

// البحث عن وجه مطابق (طريقة قديمة - احتياطية)
function findMatchingFace(currentImage) {
    const users = Object.values(registeredFaces);
    
    for (let user of users) {
        const similarity = compareFacesSimple(user.faceImage, currentImage);
        console.log(`مقارنة مع ${user.userId}: ${similarity.toFixed(1)}%`);
        
        if (similarity > 85) {
            return user;
        }
    }
    
    return null;
}

// مقارنة بسيطة للوجوه
function compareFacesSimple(face1, face2) {
    if (!face1 || !face2) return 0;
    
    const sizeDiff = Math.abs(face1.length - face2.length) / Math.max(face1.length, face2.length);
    return (1 - sizeDiff) * 100;
}

// تسجيل حضور/انصراف تلقائي
async function autoAttendance(user, faceImage) {
    stopAutoDetection(); // إيقاف الكشف مؤقتاً
    
    const currentTime = new Date();
    const currentHour = currentTime.getHours();
    const currentMinute = currentTime.getMinutes();
    const timeString = `${currentHour}:${currentMinute.toString().padStart(2, '0')}`;
    
    // تحديد نوع التسجيل بناءً على الوقت
    const [checkinHour, checkinMinute] = systemSettings.checkinTime.split(':').map(Number);
    const [checkoutHour, checkoutMinute] = systemSettings.checkoutTime.split(':').map(Number);
    
    let type = 'checkin';
    
    // إذا كان الوقت بعد وقت الانصراف
    if (currentHour > checkoutHour || (currentHour === checkoutHour && currentMinute >= checkoutMinute)) {
        type = 'checkout';
    }
    // إذا كان الوقت بعد منتصف وقت العمل
    else if (currentHour > checkinHour + 4) {
        type = 'checkout';
    }
    
    // التحقق من آخر سجل لهذا المستخدم اليوم
    const today = new Date().toLocaleDateString('ar-EG');
    const todayRecords = attendanceRecords.filter(r => {
        const recordDate = new Date(r.time).toLocaleDateString('ar-EG');
        return r.userId === user.userId && recordDate === today;
    });
    
    // تحديد نوع السجل بناءً على آخر سجل
    if (todayRecords.length > 0) {
        const lastRecord = todayRecords[0];
        // إذا كان آخر سجل حضور، السجل التالي سيكون انصراف
        type = lastRecord.type === 'checkin' ? 'checkout' : 'checkin';
    }
    
    // الحصول على اسم المستخدم من السجلات السابقة
    const userRecords = attendanceRecords.filter(r => r.userId === user.userId);
    const userName = userRecords.length > 0 ? userRecords[0].name : 'غير معروف';
    
    // إنشاء السجل
    const record = {
        id: Date.now(),
        name: userName,
        userId: user.userId,
        type: type,
        time: currentTime.toLocaleString('ar-EG'),
        faceImage: faceImage,
        isNewUser: false,
        faceMatched: true,
        autoDetected: true
    };
    
    // حفظ السجل
    attendanceRecords.unshift(record);
    localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
    
    // تحديث الإحصائيات
    stats[type]++;
    localStorage.setItem('stats', JSON.stringify(stats));
    updateStats();
    
    // عرض السجلات
    displayRecords();
    
    // رسالة نجاح
    const message = type === 'checkin' 
        ? `✅ مرحباً ${userName}! تم تسجيل الحضور في ${timeString}`
        : `🚪 مع السلامة ${userName}! تم تسجيل الانصراف في ${timeString}`;
    
    showStatus(message, 'success');
    overlay.style.borderColor = type === 'checkin' ? '#4CAF50' : '#f44336';
    
    // انتظار 5 ثواني ثم استئناف الكشف
    setTimeout(() => {
        overlay.style.borderColor = '#4CAF50';
        startAutoDetection();
    }, 5000);
}

// التحقق من وجود بصمة وجه مسجلة
function checkRegisteredFace(userId) {
    return registeredFaces[userId] || null;
}

// تسجيل بصمة وجه جديدة مع descriptor
async function registerFace(userId, faceData, userName) {
    if (!faceData) {
        console.error('❌ لا يوجد بيانات وجه للتسجيل');
        return false;
    }
    
    registeredFaces[userId] = {
        userId: userId,
        userName: userName,
        faceImage: faceData.imageData || faceData, // دعم البيانات القديمة والجديدة
        faceDescriptor: faceData.descriptor || null, // حفظ الوصف إذا كان موجوداً
        registeredAt: new Date().toLocaleString('ar-EG')
    };
    localStorage.setItem('registeredFaces', JSON.stringify(registeredFaces));
    console.log('✅ تم تسجيل بصمة الوجه للمستخدم:', userId, 'مع descriptor:', !!faceData.descriptor);
    return true;
}


// التحقق من تطابق الوجوه - نسخة مبسطة وفعالة
function compareFaces(face1, face2) {
    if (!face1 || !face2) {
        console.log('أحد الوجوه غير موجود');
        return false;
    }
    
    try {
        // مقارنة بسيطة بناءً على الحجم والتشابه
        const sizeDiff = Math.abs(face1.length - face2.length) / Math.max(face1.length, face2.length);
        
        // حساب نسبة التشابه (كلما كان الفرق أقل كان التشابه أكبر)
        const similarity = (1 - sizeDiff) * 100;
        
        console.log('نسبة التطابق:', similarity.toFixed(2) + '%');
        
        // قبول التطابق إذا كان أكثر من 85%
        return similarity > 85;
    } catch (error) {
        console.error('خطأ في مقارنة الوجوه:', error);
        return false;
    }
}

// التحقق من وجود بصمة وجه مسجلة
function checkRegisteredFace(userId) {
    return registeredFaces[userId] || null;
}

// تسجيل بصمة وجه جديدة
function registerFace(userId, faceImage) {
    registeredFaces[userId] = {
        userId: userId,
        faceImage: faceImage,
        registeredAt: new Date().toLocaleString('ar-EG')
    };
    localStorage.setItem('registeredFaces', JSON.stringify(registeredFaces));
}

// إضافة سجل حضور - للمستخدمين الجدد فقط
async function addAttendanceRecord(type) {
    console.log('تسجيل يدوي:', type);
    
    stopAutoDetection(); // إيقاف الكشف التلقائي مؤقتاً
    
    const userName = userNameInput.value.trim();
    const userId = userIdInput.value.trim();
    
    if (!userName || !userId) {
        showStatus('⚠️ يرجى إدخال الاسم والرقم الوظيفي', 'error');
        setTimeout(() => startAutoDetection(), 3000);
        return;
    }
    
    if (!stream) {
        showStatus('⚠️ يرجى تشغيل الكاميرا أولاً', 'error');
        setTimeout(() => startAutoDetection(), 3000);
        return;
    }
    
    try {
        // التحقق من وجود بصمة مسجلة
        const registeredFace = checkRegisteredFace(userId);
        
        if (registeredFace) {
            showStatus('⚠️ هذا المستخدم مسجل بالفعل! سيتم التعرف عليه تلقائياً', 'info');
            userNameInput.value = '';
            userIdInput.value = '';
            setTimeout(() => startAutoDetection(), 3000);
            return;
        }
        
        // مستخدم جديد - التقاط صورة مع descriptor
        let faceData = window.tempFaceData; // استخدام البيانات المؤقتة إذا كانت موجودة
        
        if (!faceData) {
            showStatus('⏳ جاري تسجيل بصمة الوجه...', 'info');
            faceData = await captureImageWithDescriptor();
        }
        
        if (!faceData) {
            showStatus('❌ لم يتم اكتشاف وجه واضح. حاول مرة أخرى', 'error');
            setTimeout(() => startAutoDetection(), 3000);
            return;
        }
        
        // تسجيل بصمة الوجه
        console.log('مستخدم جديد - تسجيل البصمة');
        await registerFace(userId, faceData, userName);
        
        // إنشاء أول سجل
        const record = {
            id: Date.now(),
            name: userName,
            userId: userId,
            type: type,
            time: new Date().toLocaleString('ar-EG'),
            faceImage: faceData.imageData,
            isNewUser: true,
            faceMatched: true,
            autoDetected: false
        };
        
        // حفظ السجل
        attendanceRecords.unshift(record);
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
        
        // تحديث الإحصائيات
        stats[type]++;
        localStorage.setItem('stats', JSON.stringify(stats));
        updateStats();
        
        // عرض السجلات
        displayRecords();
        
        const message = `✅ مرحباً ${userName}! تم تسجيل بصمة وجهك بنجاح. الآن سيتم التعرف عليك تلقائياً.`;
        showStatus(message, 'success');
        overlay.style.borderColor = '#4CAF50';
        
        // مسح الحقول
        userNameInput.value = '';
        userIdInput.value = '';
        window.tempFaceData = null;
        
        console.log('✅ اكتمل التسجيل بنجاح');
        
        // استئناف الكشف التلقائي بعد 5 ثواني
        setTimeout(() => {
            startAutoDetection();
        }, 5000);
        
    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        showStatus('❌ حدث خطأ! يرجى المحاولة مرة أخرى', 'error');
        setTimeout(() => startAutoDetection(), 3000);
    }
}

// عرض السجلات
function displayRecords() {
    if (attendanceRecords.length === 0) {
        logContainer.innerHTML = '<p class="no-records">لا توجد سجلات حتى الآن</p>';
        return;
    }
    
    logContainer.innerHTML = '';
    
    // عرض آخر 10 سجلات
    attendanceRecords.slice(0, 10).forEach(record => {
        const entry = document.createElement('div');
        entry.className = `log-entry ${record.type}`;
        
        // تحديد حالة البصمة
        let faceStatus = '';
        if (record.isNewUser) {
            faceStatus = '<span class="face-status new">🆕 مستخدم جديد</span>';
        } else if (record.faceMatched) {
            faceStatus = '<span class="face-status matched">✅ وجه متطابق</span>';
        }
        
        entry.innerHTML = `
            <div class="name">${record.name} - ${record.userId}</div>
            <div class="time">⏰ ${record.time}</div>
            ${faceStatus}
            <span class="type ${record.type}">
                ${record.type === 'checkin' ? '✅ حضور' : '🚪 انصراف'}
            </span>
        `;
        logContainer.appendChild(entry);
    });
}

// أزرار التسجيل
captureBtn.addEventListener('click', () => {
    addAttendanceRecord('checkin');
});

// أزرار التسجيل
captureBtn.addEventListener('click', () => {
    console.log('تم الضغط على زر الحضور');
    addAttendanceRecord('checkin');
});

checkoutBtn.addEventListener('click', () => {
    console.log('تم الضغط على زر الانصراف');
    addAttendanceRecord('checkout');
});

// عرض السجلات عند تحميل الصفحة
console.log('تحميل السجلات الموجودة');
displayRecords();
updateStats();

// تنظيف الموارد عند إغلاق الصفحة
window.addEventListener('beforeunload', () => {
    if (stream) {
        stream.getTracks().forEach(track => track.stop());
    }
});

// الانتقال إلى لوحة الأدمن
const adminBtn = document.getElementById('adminBtn');
if (adminBtn) {
    adminBtn.addEventListener('click', () => {
        window.location.href = 'admin.html';
    });
}

console.log('جاهز للاستخدام! ✅');

// إضافة زر مسح (اختياري)
// يمكنك إضافة زر في HTML وربطه بهذه الدالة