// تحميل البيانات
let registeredFaces = JSON.parse(localStorage.getItem('registeredFaces')) || {};
let attendanceRecords = JSON.parse(localStorage.getItem('attendanceRecords')) || [];
let systemSettings = JSON.parse(localStorage.getItem('systemSettings')) || {
    checkinTime: '09:00',
    checkoutTime: '17:00',
    autoDetection: true
};

// عناصر DOM
const totalEmployees = document.getElementById('totalEmployees');
const todayCheckins = document.getElementById('todayCheckins');
const todayCheckouts = document.getElementById('todayCheckouts');
const totalRecords = document.getElementById('totalRecords');
const searchInput = document.getElementById('searchInput');
const employeesTableBody = document.getElementById('employeesTableBody');
const recordsContainer = document.getElementById('recordsContainer');
const employeeModal = document.getElementById('employeeModal');
const backToHome = document.getElementById('backToHome');
const exportData = document.getElementById('exportData');
const checkinTimeInput = document.getElementById('checkinTime');
const checkoutTimeInput = document.getElementById('checkoutTime');
const saveSettingsBtn = document.getElementById('saveSettings');

// تحميل الإعدادات
checkinTimeInput.value = systemSettings.checkinTime;
checkoutTimeInput.value = systemSettings.checkoutTime;

// حفظ الإعدادات
saveSettingsBtn.addEventListener('click', () => {
    systemSettings.checkinTime = checkinTimeInput.value;
    systemSettings.checkoutTime = checkoutTimeInput.value;
    
    localStorage.setItem('systemSettings', JSON.stringify(systemSettings));
    
    alert('✅ تم حفظ الإعدادات بنجاح!\n\nوقت الحضور: ' + systemSettings.checkinTime + '\nوقت الانصراف: ' + systemSettings.checkoutTime);
});

// تحديث الإحصائيات
function updateStatistics() {
    // إجمالي الموظفين
    totalEmployees.textContent = Object.keys(registeredFaces).length;
    
    // سجلات اليوم
    const today = new Date().toLocaleDateString('ar-EG');
    const todayRecords = attendanceRecords.filter(record => {
        const recordDate = new Date(record.time).toLocaleDateString('ar-EG');
        return recordDate === today;
    });
    
    const checkins = todayRecords.filter(r => r.type === 'checkin').length;
    const checkouts = todayRecords.filter(r => r.type === 'checkout').length;
    
    todayCheckins.textContent = checkins;
    todayCheckouts.textContent = checkouts;
    totalRecords.textContent = attendanceRecords.length;
}

// عرض الموظفين في الجدول
function displayEmployees(filter = 'all', searchTerm = '') {
    const employeesData = Object.values(registeredFaces);
    
    if (employeesData.length === 0) {
        employeesTableBody.innerHTML = '<tr><td colspan="7" class="no-data">لا توجد موظفين مسجلين</td></tr>';
        return;
    }
    
    // تصفية البيانات
    let filteredData = employeesData;
    
    if (searchTerm) {
        filteredData = filteredData.filter(emp => {
            const records = attendanceRecords.filter(r => r.userId === emp.userId);
            const name = records.length > 0 ? records[0].name : '';
            return name.includes(searchTerm) || emp.userId.includes(searchTerm);
        });
    }
    
    if (filter === 'today') {
        const today = new Date().toLocaleDateString('ar-EG');
        filteredData = filteredData.filter(emp => {
            const todayRecords = attendanceRecords.filter(r => {
                const recordDate = new Date(r.time).toLocaleDateString('ar-EG');
                return r.userId === emp.userId && recordDate === today;
            });
            return todayRecords.length > 0;
        });
    }
    
    employeesTableBody.innerHTML = '';
    
    filteredData.forEach(employee => {
        const empRecords = attendanceRecords.filter(r => r.userId === employee.userId);
        const lastRecord = empRecords.length > 0 ? empRecords[0] : null;
        const employeeName = lastRecord ? lastRecord.name : 'غير معروف';
        
        const row = document.createElement('tr');
        row.innerHTML = `
            <td><img src="${employee.faceImage}" class="employee-face" alt="صورة الموظف"></td>
            <td>${employeeName}</td>
            <td>${employee.userId}</td>
            <td>${employee.registeredAt}</td>
            <td>${lastRecord ? lastRecord.time : 'لا يوجد'}</td>
            <td><span class="badge">${empRecords.length}</span></td>
            <td>
                <button class="action-btn view" onclick="viewEmployeeDetails('${employee.userId}')">👁️ عرض</button>
                <button class="action-btn delete" onclick="deleteEmployee('${employee.userId}')">🗑️ حذف</button>
            </td>
        `;
        employeesTableBody.appendChild(row);
    });
}

// عرض تفاصيل الموظف
function viewEmployeeDetails(userId) {
    const employee = registeredFaces[userId];
    const empRecords = attendanceRecords.filter(r => r.userId === userId);
    const employeeName = empRecords.length > 0 ? empRecords[0].name : 'غير معروف';
    
    const checkins = empRecords.filter(r => r.type === 'checkin').length;
    const checkouts = empRecords.filter(r => r.type === 'checkout').length;
    
    const detailsHTML = `
        <div class="employee-detail-card">
            <img src="${employee.faceImage}" class="employee-detail-face" alt="صورة الموظف">
            <div class="employee-detail-info">
                <div class="detail-row">
                    <span class="detail-label">الاسم:</span>
                    <span class="detail-value">${employeeName}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">الرقم الوظيفي:</span>
                    <span class="detail-value">${employee.userId}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">تاريخ التسجيل:</span>
                    <span class="detail-value">${employee.registeredAt}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">عدد مرات الحضور:</span>
                    <span class="detail-value">${checkins}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">عدد مرات الانصراف:</span>
                    <span class="detail-value">${checkouts}</span>
                </div>
                <div class="detail-row">
                    <span class="detail-label">إجمالي السجلات:</span>
                    <span class="detail-value">${empRecords.length}</span>
                </div>
            </div>
        </div>
        <div style="margin-top: 20px;">
            <h3>آخر 5 سجلات:</h3>
            ${empRecords.slice(0, 5).map(record => `
                <div class="record-card ${record.type}" style="margin-top: 10px;">
                    <div class="record-info">
                        <div class="name">${record.type === 'checkin' ? '✅ حضور' : '🚪 انصراف'}</div>
                        <div class="details">⏰ ${record.time}</div>
                    </div>
                </div>
            `).join('')}
        </div>
    `;
    
    document.getElementById('employeeDetails').innerHTML = detailsHTML;
    employeeModal.style.display = 'block';
}

// حذف موظف
function deleteEmployee(userId) {
    if (confirm('هل أنت متأكد من حذف هذا الموظف وجميع سجلاته؟')) {
        delete registeredFaces[userId];
        localStorage.setItem('registeredFaces', JSON.stringify(registeredFaces));
        
        // حذف السجلات المرتبطة
        attendanceRecords = attendanceRecords.filter(r => r.userId !== userId);
        localStorage.setItem('attendanceRecords', JSON.stringify(attendanceRecords));
        
        displayEmployees();
        displayAllRecords();
        updateStatistics();
        alert('✅ تم حذف الموظف بنجاح');
    }
}

// عرض جميع السجلات
function displayAllRecords() {
    if (attendanceRecords.length === 0) {
        recordsContainer.innerHTML = '<p class="no-data">لا توجد سجلات</p>';
        return;
    }
    
    recordsContainer.innerHTML = '';
    
    attendanceRecords.slice(0, 50).forEach(record => {
        const card = document.createElement('div');
        card.className = `record-card ${record.type}`;
        card.innerHTML = `
            <div class="record-info">
                <div class="name">${record.name} - ${record.userId}</div>
                <div class="details">⏰ ${record.time}</div>
            </div>
            <div>
                ${record.isNewUser ? '<span class="record-badge new">🆕 مستخدم جديد</span>' : ''}
                <span class="record-badge ${record.type}">
                    ${record.type === 'checkin' ? '✅ حضور' : '🚪 انصراف'}
                </span>
            </div>
        `;
        recordsContainer.appendChild(card);
    });
}

// تصدير البيانات
exportData.addEventListener('click', () => {
    const data = {
        employees: registeredFaces,
        records: attendanceRecords,
        exportDate: new Date().toLocaleString('ar-EG')
    };
    
    const dataStr = JSON.stringify(data, null, 2);
    const dataBlob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(dataBlob);
    
    const link = document.createElement('a');
    link.href = url;
    link.download = `attendance-data-${Date.now()}.json`;
    link.click();
    
    alert('✅ تم تصدير البيانات بنجاح');
});

// حذف جميع البيانات
const clearAllDataBtn = document.getElementById('clearAllData');
if (clearAllDataBtn) {
    clearAllDataBtn.addEventListener('click', () => {
        const confirmFirst = confirm('⚠️ تحذير! هل أنت متأكد من حذف جميع البيانات؟\n\nسيتم حذف:\n- جميع الموظفين المسجلين\n- جميع بصمات الوجوه\n- جميع سجلات الحضور والانصراف\n- جميع الإحصائيات\n\nهذا الإجراء لا يمكن التراجع عنه!');
        
        if (confirmFirst) {
            const confirmSecond = confirm('⚠️ تأكيد نهائي!\n\nاضغط موافق لحذف جميع البيانات بشكل نهائي');
            
            if (confirmSecond) {
                // حذف جميع البيانات من localStorage
                localStorage.removeItem('registeredFaces');
                localStorage.removeItem('attendanceRecords');
                localStorage.removeItem('stats');
                
                // إعادة تحميل البيانات
                registeredFaces = {};
                attendanceRecords = [];
                
                // تحديث العرض
                updateStatistics();
                displayEmployees();
                displayAllRecords();
                
                alert('✅ تم حذف جميع البيانات بنجاح!\n\nالنظام جاهز الآن لبداية جديدة.');
            }
        }
    });
}

// البحث
searchInput.addEventListener('input', (e) => {
    const searchTerm = e.target.value.trim();
    const activeFilter = document.querySelector('.filter-btn.active').dataset.filter;
    displayEmployees(activeFilter, searchTerm);
});

// التصفية
document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
        document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const filter = btn.dataset.filter;
        displayEmployees(filter, searchInput.value.trim());
    });
});

// إضافة إمكانية سحب Modal
let isDragging = false;
let currentX;
let currentY;
let initialX;
let initialY;
let xOffset = 0;
let yOffset = 0;

const modalContent = document.querySelector('.modal-content');
const modalHeader = modalContent.querySelector('h2');

// جعل عنوان Modal قابل للسحب
modalHeader.style.cursor = 'move';
modalHeader.style.userSelect = 'none';

modalHeader.addEventListener('mousedown', dragStart);
document.addEventListener('mousemove', drag);
document.addEventListener('mouseup', dragEnd);

function dragStart(e) {
    initialX = e.clientX - xOffset;
    initialY = e.clientY - yOffset;
    
    if (e.target === modalHeader) {
        isDragging = true;
    }
}

function drag(e) {
    if (isDragging) {
        e.preventDefault();
        
        currentX = e.clientX - initialX;
        currentY = e.clientY - initialY;
        
        xOffset = currentX;
        yOffset = currentY;
        
        setTranslate(currentX, currentY, modalContent);
    }
}

function dragEnd(e) {
    initialX = currentX;
    initialY = currentY;
    isDragging = false;
}

function setTranslate(xPos, yPos, el) {
    el.style.transform = `translate(${xPos}px, ${yPos}px)`;
}

// إغلاق Modal
document.querySelector('.close').addEventListener('click', () => {
    employeeModal.style.display = 'none';
    // إعادة تعيين الموضع
    xOffset = 0;
    yOffset = 0;
    modalContent.style.transform = 'translate(0px, 0px)';
});

window.addEventListener('click', (e) => {
    if (e.target === employeeModal) {
        employeeModal.style.display = 'none';
        // إعادة تعيين الموضع
        xOffset = 0;
        yOffset = 0;
        modalContent.style.transform = 'translate(0px, 0px)';
    }
});

// العودة للرئيسية
backToHome.addEventListener('click', () => {
    window.location.href = 'index.html';
});

// تحميل البيانات عند فتح الصفحة
updateStatistics();
displayEmployees();
displayAllRecords();