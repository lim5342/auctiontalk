// ============================================================
// 경매톡 관리자 - admin.js (localStorage 연동 버전)
// main.js의 'pendingInquiries' 키를 직접 읽어 관리
// ============================================================

const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin1234';

let currentPage = 'dashboard';
let allInquiries = [];
let allConsultants = [];
let filteredInquiries = [];

// localStorage 헬퍼
function lsGet(key) {
    try { const d = localStorage.getItem(key); return d ? JSON.parse(d) : null; } catch(e) { return null; }
}
function lsSet(key, val) {
    try { localStorage.setItem(key, JSON.stringify(val)); } catch(e) {}
}

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(item.getAttribute('data-page'));
        });
    });

    const filterStatus = document.getElementById('filter-status');
    const searchInput  = document.getElementById('search-input');
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    if (searchInput)  searchInput.addEventListener('input', applyFilters);

    const excelBtn = document.getElementById('excel-export-btn');
    if (excelBtn) excelBtn.addEventListener('click', exportToExcel);

    const modal = document.getElementById('inquiry-modal');
    if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }
});

// ── 로그인 / 로그아웃 ──────────────────────────────────────
function handleLogin(e) {
    e.preventDefault();
    const u = document.getElementById('admin-username').value;
    const p = document.getElementById('admin-password').value;
    if (u === ADMIN_USERNAME && p === ADMIN_PASSWORD) {
        document.getElementById('login-screen').style.display = 'none';
        document.getElementById('admin-dashboard').style.display = 'flex';
        loadDashboardData();
        loadInquiries();
        loadConsultants();
    } else {
        alert('아이디 또는 비밀번호가 올바르지 않습니다.');
    }
}

function handleLogout() {
    if (confirm('로그아웃 하시겠습니까?')) {
        document.getElementById('login-screen').style.display = 'flex';
        document.getElementById('admin-dashboard').style.display = 'none';
    }
}

// ── 페이지 전환 ────────────────────────────────────────────
function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) item.classList.add('active');
    });
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pg = document.getElementById(`${page}-page`);
    if (pg) pg.classList.add('active');
    if (page === 'dashboard')  loadDashboardData();
    else if (page === 'inquiries') loadInquiries();
    else if (page === 'statistics') loadStatistics();
    else if (page === 'consultants') loadConsultantsAdmin();
    else if (page === 'automation') loadAutomationSettings();
}

// ── 핵심: localStorage에서 문의 데이터 읽기 ──────────────
function getInquiriesFromStorage() {
    // main.js가 'pendingInquiries' 키에 저장
    const pending = lsGet('pendingInquiries') || [];
    // calculationHistory에서도 보완 (before-tab 계산 기록)
    return pending;
}

// ── 대시보드 ───────────────────────────────────────────────
function loadDashboardData() {
    // 먼저 localStorage에서 읽기 시도
    const inquiries = getInquiriesFromStorage();

    if (inquiries.length > 0) {
        renderDashboard(inquiries);
        return;
    }

    // 혹시 백엔드가 연동된 경우 폴백
    fetch('tables/inquiries?limit=1000')
        .then(r => r.json())
        .then(data => {
            if (data.data && data.data.length > 0) renderDashboard(data.data);
            else renderDashboard([]);
        })
        .catch(() => renderDashboard([]));
}

function renderDashboard(inquiries) {
    const today = new Date().toISOString().split('T')[0];
    const todayInq  = inquiries.filter(i => i.created_at && i.created_at.startsWith(today)).length;
    const pending    = inquiries.filter(i => !i.status || i.status === 'pending').length;
    const inprogress = inquiries.filter(i => i.status === 'inprogress').length;
    const completed  = inquiries.filter(i => i.status === 'completed').length;

    const el = id => document.getElementById(id);
    if (el('stat-today'))      el('stat-today').textContent      = todayInq;
    if (el('stat-pending'))    el('stat-pending').textContent    = pending;
    if (el('stat-inprogress')) el('stat-inprogress').textContent = inprogress;
    if (el('stat-completed'))  el('stat-completed').textContent  = completed;
    if (el('perf-total'))      el('perf-total').textContent      = inquiries.length + '건';
    if (el('perf-consultations')) el('perf-consultations').textContent = (inprogress + completed) + '건';
    if (el('perf-contracts'))  el('perf-contracts').textContent  = completed + '건';
    if (el('perf-fees')) {
        const fees = inquiries.filter(i => i.status === 'completed')
                              .reduce((s, i) => s + ((parseInt(i.expected_winning_price || i.expectedPrice || 0)) * 0.005), 0);
        el('perf-fees').textContent = Math.floor(fees).toLocaleString('ko-KR') + '만원 (예상)';
    }
    displayRecentInquiries(inquiries.slice(0, 5));
}

function displayRecentInquiries(inquiries) {
    const container = document.getElementById('recent-inquiries-list');
    if (!container) return;
    if (inquiries.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">최근 문의가 없습니다.</p>';
        return;
    }
    container.innerHTML = inquiries.map(inq => {
        const price = parseInt(inq.expected_winning_price || inq.expectedPrice || 0);
        return `<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:10px;border-left:3px solid #0066cc;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <strong>${inq.name || '이름 없음'}</strong>
                <span class="status-badge ${inq.status || 'pending'}">${getStatusText(inq.status || 'pending')}</span>
            </div>
            <div style="font-size:14px;color:#666;">
                📞 ${inq.phone || 'N/A'} &nbsp;|&nbsp;
                💰 ${price.toLocaleString('ko-KR')}만원 &nbsp;|&nbsp;
                🏠 ${getPropertyTypeText(inq.property_type || inq.propertyType)}
            </div>
        </div>`;
    }).join('');
}

// ── 문의 목록 ─────────────────────────────────────────────
function loadInquiries() {
    const local = getInquiriesFromStorage();
    if (local.length > 0) {
        allInquiries = local;
        filteredInquiries = [...allInquiries];
        displayInquiries(filteredInquiries);
        return;
    }
    // 백엔드 폴백
    fetch('tables/inquiries?limit=1000')
        .then(r => r.json())
        .then(data => {
            allInquiries = data.data || [];
            filteredInquiries = [...allInquiries];
            displayInquiries(filteredInquiries);
        })
        .catch(() => {
            allInquiries = [];
            filteredInquiries = [];
            displayInquiries([]);
        });
}

function applyFilters() {
    const statusFilter = (document.getElementById('filter-status') || {}).value || '';
    const searchTerm   = ((document.getElementById('search-input') || {}).value || '').toLowerCase();
    filteredInquiries = allInquiries.filter(inq => {
        if (statusFilter && (inq.status || 'pending') !== statusFilter) return false;
        if (searchTerm) {
            const fields = [inq.name, inq.phone, inq.case_number || inq.caseNumber].filter(Boolean).map(f => f.toLowerCase());
            if (!fields.some(f => f.includes(searchTerm))) return false;
        }
        return true;
    });
    displayInquiries(filteredInquiries);
}

function displayInquiries(inquiries) {
    const tbody = document.getElementById('inquiries-table-body');
    if (!tbody) return;
    if (inquiries.length === 0) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#999;">문의 내역이 없습니다.<br><small style="color:#aaa;">낙찰 후 신청 탭에서 제출한 데이터가 여기 표시됩니다.</small></td></tr>';
        return;
    }
    tbody.innerHTML = inquiries.map(inq => {
        const price = parseInt(inq.expected_winning_price || inq.expectedPrice || 0);
        const status = inq.status || 'pending';
        const id = inq.id || inq.created_at || Math.random();
        return `<tr>
            <td>${formatDate(inq.created_at)}</td>
            <td><strong>${inq.name || 'N/A'}</strong></td>
            <td>${inq.phone || 'N/A'}</td>
            <td>${getPropertyTypeText(inq.property_type || inq.propertyType)}</td>
            <td>${price.toLocaleString('ko-KR')}만원</td>
            <td><span class="status-badge ${status}">${getStatusText(status)}</span></td>
            <td>${inq.assigned_to === 'unassigned' || !inq.assigned_to ? '미배정' : inq.assigned_to}</td>
            <td><button class="btn btn-primary btn-sm" onclick="viewInquiryDetail('${id}')">
                <i class="fas fa-eye"></i> 자세히 보기
            </button></td>
        </tr>`;
    }).join('');
}

// ── 상세보기 (전체 필드 표시) ──────────────────────────────
function viewInquiryDetail(id) {
    // ID 문자열로 변환하여 비교
    const inquiry = allInquiries.find(i => String(i.id) === String(id) || String(i.created_at) === String(id));
    if (!inquiry) { alert('문의 데이터를 찾을 수 없습니다.'); return; }

    const modal = document.getElementById('inquiry-modal');
    const detailContainer = document.getElementById('inquiry-detail');
    if (!modal || !detailContainer) return;

    const fmt = n => parseInt(n || 0).toLocaleString('ko-KR');

    // 필드 매핑 (낙찰후 탭 field name과 localStorage 저장 키 모두 커버)
    const name         = inquiry.name || '-';
    const phone        = inquiry.phone || '-';
    const email        = inquiry.email || '-';
    const address      = inquiry.address || inquiry.propertyAddress || '-';
    const caseNum      = inquiry.case_number || inquiry.caseNumber || '-';
    const propertyType = getPropertyTypeText(inquiry.property_type || inquiry.propertyType);
    const region       = getRegionText(inquiry.region);
    const homeOwner    = getHomeOwnershipText(inquiry.home_ownership || inquiry.homeOwnership);
    const appraisal    = fmt(inquiry.appraisal_value || inquiry.appraisalPrice || inquiry.appraisalValue);
    const kbPrice      = fmt(inquiry.kb_price || inquiry.kbPrice);
    const winPrice     = fmt(inquiry.expected_winning_price || inquiry.expectedPrice || inquiry.expectedWinningPrice);
    const income       = fmt(inquiry.annual_income || inquiry.annualIncome);
    const debt         = fmt(inquiry.existing_debt || inquiry.existingDebt);
    const credit       = inquiry.credit_score || inquiry.creditScore || '-';
    const status       = inquiry.status || 'pending';
    const createdAt    = formatDate(inquiry.created_at);
    const memo         = inquiry.memo || '';
    const isRegulated  = inquiry.isRegulated !== undefined ? (inquiry.isRegulated === 'non-regulated' ? '비규제지역' : '규제지역') : '-';

    const html = `
    <h2 style="margin-bottom:24px;color:#0066cc;border-bottom:2px solid #e9ecef;padding-bottom:12px;">
        <i class="fas fa-file-alt"></i> 문의 상세 정보
    </h2>

    <!-- 고객 정보 -->
    <div class="inquiry-detail-section" style="background:#f8f9fa;border-radius:10px;padding:18px;margin-bottom:16px;">
        <h3 style="color:#333;margin-bottom:14px;font-size:15px;"><i class="fas fa-user" style="color:#0066cc;"></i> 고객 정보</h3>
        <div class="detail-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">이름</div><div class="detail-value" style="font-weight:600;">${name}</div></div>
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">연락처</div><div class="detail-value">${phone}</div></div>
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">이메일</div><div class="detail-value">${email}</div></div>
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">접수일시</div><div class="detail-value">${createdAt}</div></div>
            <div class="detail-item" style="grid-column:1/-1;"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">상태</div><div class="detail-value"><span class="status-badge ${status}">${getStatusText(status)}</span></div></div>
        </div>
    </div>

    <!-- 물건 정보 -->
    <div class="inquiry-detail-section" style="background:#f8f9fa;border-radius:10px;padding:18px;margin-bottom:16px;">
        <h3 style="color:#333;margin-bottom:14px;font-size:15px;"><i class="fas fa-home" style="color:#28a745;"></i> 물건 정보</h3>
        <div class="detail-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            ${caseNum !== '-' ? `<div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">사건번호</div><div class="detail-value" style="font-family:monospace;color:#0066cc;">${caseNum}</div></div>` : ''}
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">물건 주소</div><div class="detail-value">${address}</div></div>
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">물건 유형</div><div class="detail-value">${propertyType}</div></div>
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">지역 분류</div><div class="detail-value">${region} ${isRegulated !== '-' ? `<small style="color:#888;">(${isRegulated})</small>` : ''}</div></div>
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">감정가</div><div class="detail-value" style="color:#e65100;font-weight:600;">${appraisal}만원</div></div>
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">예상 낙찰가</div><div class="detail-value" style="color:#e65100;font-weight:600;">${winPrice}만원</div></div>
            ${kbPrice !== '0' ? `<div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">KB 시세</div><div class="detail-value">${kbPrice}만원</div></div>` : ''}
        </div>
    </div>

    <!-- 재무 정보 -->
    <div class="inquiry-detail-section" style="background:#f8f9fa;border-radius:10px;padding:18px;margin-bottom:16px;">
        <h3 style="color:#333;margin-bottom:14px;font-size:15px;"><i class="fas fa-won-sign" style="color:#9c27b0;"></i> 재무 정보</h3>
        <div class="detail-grid" style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">주택 보유 현황</div><div class="detail-value" style="font-weight:600;">${homeOwner}</div></div>
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">연간 소득</div><div class="detail-value">${income}만원</div></div>
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">기존 부채 (연간 상환액)</div><div class="detail-value">${debt}만원</div></div>
            <div class="detail-item"><div class="detail-label" style="font-size:12px;color:#888;margin-bottom:4px;">신용점수</div><div class="detail-value">${credit}점</div></div>
        </div>
    </div>

    <!-- 내부 메모 -->
    <div class="inquiry-detail-section" style="margin-bottom:16px;">
        <h3 style="color:#333;margin-bottom:10px;font-size:15px;"><i class="fas fa-sticky-note" style="color:#ff9800;"></i> 내부 메모</h3>
        <textarea id="memo-input-${inquiry.id}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:vertical;font-family:inherit;" rows="3" placeholder="상담 내용, 메모를 입력하세요...">${memo}</textarea>
        <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="saveMemo('${inquiry.id}')">
            <i class="fas fa-save"></i> 메모 저장
        </button>
    </div>

    <!-- 액션 버튼 -->
    <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
        <button class="btn btn-success" onclick="updateInquiryStatus('${inquiry.id}', 'inprogress')">
            <i class="fas fa-phone"></i> 상담중으로 변경
        </button>
        <button class="btn btn-primary" onclick="updateInquiryStatus('${inquiry.id}', 'completed')">
            <i class="fas fa-check"></i> 완료 처리
        </button>
        <button class="btn btn-danger btn-sm" onclick="deleteInquiry('${inquiry.id}')">
            <i class="fas fa-trash"></i> 삭제
        </button>
        <button class="btn btn-secondary" onclick="closeModal()" style="margin-left:auto;">
            닫기
        </button>
    </div>`;

    detailContainer.innerHTML = html;
    modal.classList.add('show');
}

// ── 상태 변경 (localStorage 기반) ─────────────────────────
function updateInquiryStatus(id, status) {
    const inquiries = lsGet('pendingInquiries') || [];
    const idx = inquiries.findIndex(i => String(i.id) === String(id) || String(i.created_at) === String(id));
    if (idx !== -1) {
        inquiries[idx].status = status;
        lsSet('pendingInquiries', inquiries);
        alert('✅ 상태가 변경되었습니다: ' + getStatusText(status));
        closeModal();
        loadInquiries();
        loadDashboardData();
    } else {
        // 백엔드 폴백
        fetch(`tables/inquiries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) })
            .then(r => { if (r.ok) { alert('상태 변경 완료'); closeModal(); loadInquiries(); } else alert('상태 변경 실패'); })
            .catch(() => alert('상태 변경 중 오류가 발생했습니다.'));
    }
}

// ── 메모 저장 ──────────────────────────────────────────────
function saveMemo(id) {
    const memoEl = document.getElementById(`memo-input-${id}`);
    if (!memoEl) return;
    const memo = memoEl.value;
    const inquiries = lsGet('pendingInquiries') || [];
    const idx = inquiries.findIndex(i => String(i.id) === String(id) || String(i.created_at) === String(id));
    if (idx !== -1) {
        inquiries[idx].memo = memo;
        lsSet('pendingInquiries', inquiries);
        alert('✅ 메모가 저장되었습니다.');
    }
}

// ── 문의 삭제 ──────────────────────────────────────────────
function deleteInquiry(id) {
    if (!confirm('이 문의를 삭제하시겠습니까?')) return;
    let inquiries = lsGet('pendingInquiries') || [];
    inquiries = inquiries.filter(i => String(i.id) !== String(id) && String(i.created_at) !== String(id));
    lsSet('pendingInquiries', inquiries);
    alert('삭제되었습니다.');
    closeModal();
    loadInquiries();
    loadDashboardData();
}

function closeModal() {
    const modal = document.getElementById('inquiry-modal');
    if (modal) modal.classList.remove('show');
}

// ── 통계 ──────────────────────────────────────────────────
function loadStatistics() {
    const inquiries = allInquiries;
    const now = new Date();
    const thisMonth = inquiries.filter(i => {
        if (!i.created_at) return false;
        const d = new Date(i.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    const lastMonthInq = inquiries.filter(i => {
        if (!i.created_at) return false;
        const d = new Date(i.created_at);
        return d.getMonth() === lastMonthStart.getMonth() && d.getFullYear() === lastMonthStart.getFullYear();
    });
    const growth = lastMonthInq.length > 0 ? ((thisMonth.length - lastMonthInq.length) / lastMonthInq.length * 100).toFixed(1) : 0;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const completed = thisMonth.filter(i => i.status === 'completed').length;
    const conversion = thisMonth.length > 0 ? ((completed / thisMonth.length) * 100).toFixed(1) : 0;

    const el = id => document.getElementById(id);
    if (el('report-inquiries'))      el('report-inquiries').textContent      = thisMonth.length + '건';
    if (el('report-inquiries-change')) el('report-inquiries-change').textContent = `전월 대비 ${growth}%`;
    if (el('report-daily-avg'))      el('report-daily-avg').textContent      = (thisMonth.length / daysInMonth).toFixed(1) + '건';
    if (el('report-conversion'))     el('report-conversion').textContent     = conversion + '%';
    if (el('report-contracts'))      el('report-contracts').textContent      = completed + '건';

    const totalLoan = thisMonth.filter(i => i.status === 'completed')
        .reduce((s, i) => s + parseInt(i.expected_winning_price || i.expectedPrice || 0), 0);
    const avgLoan = completed > 0 ? Math.floor(totalLoan / completed) : 0;
    if (el('report-avg-loan'))   el('report-avg-loan').textContent   = avgLoan.toLocaleString('ko-KR') + '만원';
    if (el('report-total-loan')) el('report-total-loan').textContent = Math.floor(totalLoan).toLocaleString('ko-KR') + '만원';
}

// ── 상담사 관리 ────────────────────────────────────────────
async function loadConsultants() {}
async function loadConsultantsAdmin() {
    try {
        const r = await fetch('tables/consultants?limit=100');
        const data = await r.json();
        if (data.data) { allConsultants = data.data; displayConsultantsAdmin(allConsultants); }
        else displayConsultantsAdmin([]);
    } catch { displayConsultantsAdmin([]); }
}

function displayConsultantsAdmin(consultants) {
    const container = document.getElementById('consultants-list');
    if (!container) return;
    if (consultants.length === 0) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:40px;">등록된 상담사가 없습니다.<br><small>기본 상담사: 02-853-5875</small></p>';
        return;
    }
    container.innerHTML = consultants.map(c => `
        <div class="consultant-admin-card">
            <div class="consultant-admin-info">
                <div class="consultant-admin-avatar"><i class="fas fa-user-tie"></i></div>
                <div class="consultant-admin-details">
                    <h3>${c.name}</h3>
                    <p>${c.specialty || '경매 대출 전문'} | 📞 ${c.phone}</p>
                    <p style="font-size:13px;color:#999;">상담 ${c.total_consultations || 0}건 · 계약 ${c.total_contracts || 0}건</p>
                </div>
            </div>
            <div class="consultant-admin-actions">
                <button class="btn btn-primary btn-sm"><i class="fas fa-edit"></i> 수정</button>
                <button class="btn ${c.is_active ? 'btn-danger' : 'btn-success'} btn-sm">${c.is_active ? '비활성화' : '활성화'}</button>
            </div>
        </div>`).join('');
}

// ── 자동화 설정 ────────────────────────────────────────────
function loadAutomationSettings() {
    const ids = ['sms-auto', 'email-auto', 'ai-auto'];
    ids.forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.checked = id === 'ai-auto' ? localStorage.getItem(id) !== 'false' : localStorage.getItem(id) === 'true';
            el.addEventListener('change', (e) => localStorage.setItem(id, e.target.checked));
        }
    });
}

// ── Excel 내보내기 ─────────────────────────────────────────
function exportToExcel() {
    if (filteredInquiries.length === 0) { alert('내보낼 데이터가 없습니다.'); return; }
    const header = ['접수일', '이름', '연락처', '이메일', '사건번호', '물건주소', '물건유형', '감정가(만원)', '예상낙찰가(만원)', '지역', '주택보유', '연소득(만원)', '기존부채(만원)', '신용점수', '상태'];
    const rows = filteredInquiries.map(inq => [
        formatDate(inq.created_at),
        inq.name || '',
        inq.phone || '',
        inq.email || '',
        inq.case_number || inq.caseNumber || '',
        inq.address || inq.propertyAddress || '',
        getPropertyTypeText(inq.property_type || inq.propertyType),
        parseInt(inq.appraisal_value || inq.appraisalPrice || 0),
        parseInt(inq.expected_winning_price || inq.expectedPrice || 0),
        getRegionText(inq.region),
        getHomeOwnershipText(inq.home_ownership || inq.homeOwnership),
        parseInt(inq.annual_income || inq.annualIncome || 0),
        parseInt(inq.existing_debt || inq.existingDebt || 0),
        inq.credit_score || inq.creditScore || '',
        getStatusText(inq.status || 'pending')
    ]);
    const csv = [header, ...rows].map(row => row.map(v => `"${v}"`).join(',')).join('\n');
    const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `문의목록_${new Date().toISOString().split('T')[0]}.csv`;
    link.style.display = 'none';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

// ── 유틸 함수 ──────────────────────────────────────────────
function formatDate(ts) {
    if (!ts) return 'N/A';
    try {
        const d = new Date(ts);
        return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')} ${String(d.getHours()).padStart(2,'0')}:${String(d.getMinutes()).padStart(2,'0')}`;
    } catch { return ts; }
}

function getStatusText(s) {
    return { pending: '대기중', inprogress: '상담중', completed: '완료' }[s] || '대기중';
}
function getPropertyTypeText(t) {
    return { apt: '아파트', villa: '빌라/연립', house: '단독주택', officetel: '오피스텔', commercial: '상가/업무시설', land: '토지', residential: '주택' }[t] || (t || '-');
}
function getRegionText(r) {
    return { seoul: '서울', metro: '수도권(경기/인천)', 'metro-city': '광역시', local: '지방', normal: '비조정지역', regulated: '조정대상지역', speculation: '투기과열지구' }[r] || (r || '-');
}
function getHomeOwnershipText(o) {
    return { first: '생애최초 (처음 구입)', none: '무주택', one: '1주택', multiple: '2주택 이상', two_plus: '2주택 이상' }[o] || (o || '-');
}
