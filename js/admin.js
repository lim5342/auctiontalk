const ADMIN_HOME = '/admin/';
let currentPage = 'dashboard';
let allInquiries = [];
let filteredInquiries = [];
let currentAdminUser = null;

function getSupabase() {
    return window.AUCTIONTALK_SUPABASE_READY && window.auctiontalkSupabase
        ? window.auctiontalkSupabase
        : null;
}

function lsGet(key) {
    try {
        const raw = localStorage.getItem(key);
        return raw ? JSON.parse(raw) : null;
    } catch (error) {
        return null;
    }
}

document.addEventListener('DOMContentLoaded', async function () {
    bindEvents();
    await restoreSession();
});

function bindEvents() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);

    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', logout);

    document.querySelectorAll('.nav-item').forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            switchPage(item.getAttribute('data-page'));
        });
    });

    const filterStatus = document.getElementById('filter-status');
    const searchInput = document.getElementById('search-input');
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', applyFilters);

    const modal = document.getElementById('inquiry-modal');
    if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }
}

async function restoreSession() {
    const supabase = getSupabase();
    if (!supabase) {
        setLoginHelp('Supabase 설정이 아직 연결되지 않았습니다. 설정 후 다시 접속해 주세요.');
        return;
    }

    try {
        const { data, error } = await supabase.auth.getSession();
        if (error) throw error;
        if (data.session?.user) {
            await enterAdmin(data.session.user);
        }
    } catch (error) {
        console.error('세션 확인 실패:', error);
    }
}

async function handleLogin(e) {
    e.preventDefault();
    const supabase = getSupabase();
    if (!supabase) {
        alert('Supabase 설정이 연결되지 않았습니다.');
        return;
    }

    const email = document.getElementById('admin-email').value.trim();
    const password = document.getElementById('admin-password').value;

    try {
        const { data, error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        await enterAdmin(data.user);
    } catch (error) {
        alert('로그인 실패: 관리자 이메일 또는 비밀번호를 확인해주세요.');
    }
}

async function enterAdmin(user) {
    currentAdminUser = user;
    document.getElementById('login-screen').style.display = 'none';
    document.getElementById('admin-dashboard').style.display = 'flex';
    await loadDashboardData();
    await loadInquiries();
    loadStatistics();
    loadConsultantsAdmin();
    loadAutomationSettings();
}

async function logout() {
    const supabase = getSupabase();
    if (supabase) await supabase.auth.signOut();
    currentAdminUser = null;
    document.getElementById('login-screen').style.display = 'flex';
    document.getElementById('admin-dashboard').style.display = 'none';
}
window.logout = logout;

function setLoginHelp(text) {
    const el = document.getElementById('login-help');
    if (el) el.textContent = text;
}

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.toggle('active', item.getAttribute('data-page') === page);
    });
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    const pageEl = document.getElementById(`${page}-page`);
    if (pageEl) pageEl.classList.add('active');

    if (page === 'dashboard') loadDashboardData();
    if (page === 'inquiries') loadInquiries();
    if (page === 'statistics') loadStatistics();
    if (page === 'consultants') loadConsultantsAdmin();
    if (page === 'automation') loadAutomationSettings();
}
window.switchPage = switchPage;

async function fetchInquiries() {
    const supabase = getSupabase();
    if (!supabase) return lsGet('pendingInquiries') || [];

    const { data, error } = await supabase
        .from('inquiries')
        .select('*')
        .order('created_at', { ascending: false });

    if (error) {
        console.error('문의 조회 실패:', error);
        return lsGet('pendingInquiries') || [];
    }

    return data || [];
}

async function loadDashboardData() {
    allInquiries = await fetchInquiries();
    filteredInquiries = [...allInquiries];
    renderDashboard(allInquiries);
}
window.loadDashboardData = loadDashboardData;

function renderDashboard(inquiries) {
    const today = new Date().toISOString().split('T')[0];
    const todayInq = inquiries.filter(i => (i.created_at || '').startsWith(today)).length;
    const pending = inquiries.filter(i => !i.status || i.status === 'pending').length;
    const inprogress = inquiries.filter(i => i.status === 'inprogress').length;
    const completed = inquiries.filter(i => i.status === 'completed').length;

    setText('stat-today', todayInq);
    setText('stat-pending', pending);
    setText('stat-inprogress', inprogress);
    setText('stat-completed', completed);
    setText('perf-total', `${inquiries.length}건`);
    setText('perf-consultations', `${inprogress + completed}건`);
    setText('perf-contracts', `${completed}건`);

    const fees = inquiries
        .filter(i => i.status === 'completed')
        .reduce((sum, i) => sum + ((parseInt(i.expected_winning_price || 0, 10) || 0) * 0.005), 0);
    setText('perf-fees', `${Math.floor(fees).toLocaleString('ko-KR')}만원 (예상)`);

    const recent = inquiries.slice(0, 5);
    const container = document.getElementById('recent-inquiries-list');
    if (!container) return;
    if (!recent.length) {
        container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">최근 문의가 없습니다.</p>';
        return;
    }

    container.innerHTML = recent.map(inq => {
        const price = parseInt(inq.expected_winning_price || 0, 10) || 0;
        return `<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:10px;border-left:3px solid #0066cc;">
            <div style="display:flex;justify-content:space-between;margin-bottom:8px;">
                <strong>${escapeHtml(inq.name || '이름 없음')}</strong>
                <span class="status-badge ${inq.status || 'pending'}">${getStatusText(inq.status || 'pending')}</span>
            </div>
            <div style="font-size:14px;color:#666;">
                📞 ${escapeHtml(inq.phone || '-')} &nbsp;|&nbsp;
                💰 ${price.toLocaleString('ko-KR')}만원 &nbsp;|&nbsp;
                🏠 ${getPropertyTypeText(inq.property_type)}
            </div>
        </div>`;
    }).join('');
}

async function loadInquiries() {
    allInquiries = await fetchInquiries();
    filteredInquiries = [...allInquiries];
    displayInquiries(filteredInquiries);
}
window.loadInquiries = loadInquiries;

function applyFilters() {
    const statusFilter = document.getElementById('filter-status')?.value || '';
    const searchTerm = (document.getElementById('search-input')?.value || '').toLowerCase();
    filteredInquiries = allInquiries.filter(inq => {
        if (statusFilter && (inq.status || 'pending') !== statusFilter) return false;
        if (!searchTerm) return true;
        const fields = [inq.name, inq.phone, inq.case_number].filter(Boolean).map(v => String(v).toLowerCase());
        return fields.some(v => v.includes(searchTerm));
    });
    displayInquiries(filteredInquiries);
}

function displayInquiries(inquiries) {
    const tbody = document.getElementById('inquiries-table-body');
    if (!tbody) return;
    if (!inquiries.length) {
        tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#999;">문의 내역이 없습니다.</td></tr>';
        return;
    }

    tbody.innerHTML = inquiries.map(inq => {
        const price = parseInt(inq.expected_winning_price || 0, 10) || 0;
        const status = inq.status || 'pending';
        return `<tr>
            <td>${formatDate(inq.created_at)}</td>
            <td><strong>${escapeHtml(inq.name || '-')}</strong></td>
            <td>${escapeHtml(inq.phone || '-')}</td>
            <td>${getPropertyTypeText(inq.property_type)}</td>
            <td>${price.toLocaleString('ko-KR')}만원</td>
            <td><span class="status-badge ${status}">${getStatusText(status)}</span></td>
            <td>${escapeHtml(inq.assigned_to || '미배정')}</td>
            <td><button class="btn btn-primary btn-sm" onclick="viewInquiryDetail('${inq.id}')"><i class="fas fa-eye"></i> 자세히 보기</button></td>
        </tr>`;
    }).join('');
}

function viewInquiryDetail(id) {
    const inquiry = allInquiries.find(item => String(item.id) === String(id));
    if (!inquiry) {
        alert('문의 데이터를 찾을 수 없습니다.');
        return;
    }

    const fmt = n => (parseInt(n || 0, 10) || 0).toLocaleString('ko-KR');
    const status = inquiry.status || 'pending';
    const detail = `
        <h2 style="margin-bottom:24px;color:#0066cc;border-bottom:2px solid #e9ecef;padding-bottom:12px;"><i class="fas fa-file-alt"></i> 문의 상세 정보</h2>
        <div class="inquiry-detail-section" style="background:#f8f9fa;border-radius:10px;padding:18px;margin-bottom:16px;">
            <h3 style="color:#333;margin-bottom:14px;font-size:15px;"><i class="fas fa-user" style="color:#0066cc;"></i> 고객 정보</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">이름</div><div style="font-weight:600;">${escapeHtml(inquiry.name || '-')}</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">연락처</div><div>${escapeHtml(inquiry.phone || '-')}</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">이메일</div><div>${escapeHtml(inquiry.email || '-')}</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">접수일시</div><div>${formatDate(inquiry.created_at)}</div></div>
                <div style="grid-column:1/-1;"><div style="font-size:12px;color:#888;margin-bottom:4px;">상태</div><div><span class="status-badge ${status}">${getStatusText(status)}</span></div></div>
            </div>
        </div>
        <div class="inquiry-detail-section" style="background:#f8f9fa;border-radius:10px;padding:18px;margin-bottom:16px;">
            <h3 style="color:#333;margin-bottom:14px;font-size:15px;"><i class="fas fa-home" style="color:#28a745;"></i> 물건 정보</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">사건번호</div><div style="font-family:monospace;color:#0066cc;">${escapeHtml(inquiry.case_number || '-')}</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">물건 주소</div><div>${escapeHtml(inquiry.address || '-')}</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">물건 유형</div><div>${getPropertyTypeText(inquiry.property_type)}</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">지역 분류</div><div>${getRegionText(inquiry.region)} ${inquiry.is_regulated ? `<small style="color:#888;">(${escapeHtml(inquiry.is_regulated)})</small>` : ''}</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">감정가</div><div style="color:#e65100;font-weight:600;">${fmt(inquiry.appraisal_value)}만원</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">예상 낙찰가</div><div style="color:#e65100;font-weight:600;">${fmt(inquiry.expected_winning_price)}만원</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">KB 시세</div><div>${fmt(inquiry.kb_price)}만원</div></div>
            </div>
        </div>
        <div class="inquiry-detail-section" style="background:#f8f9fa;border-radius:10px;padding:18px;margin-bottom:16px;">
            <h3 style="color:#333;margin-bottom:14px;font-size:15px;"><i class="fas fa-won-sign" style="color:#9c27b0;"></i> 재무 정보</h3>
            <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;">
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">주택 보유 현황</div><div style="font-weight:600;">${getHomeOwnershipText(inquiry.home_ownership)}</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">연 소득</div><div>${fmt(inquiry.annual_income)}만원</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">기존 부채</div><div>${fmt(inquiry.existing_debt)}만원</div></div>
                <div><div style="font-size:12px;color:#888;margin-bottom:4px;">신용점수</div><div>${escapeHtml(inquiry.credit_score || '-')}</div></div>
            </div>
        </div>
        <div class="inquiry-detail-section" style="margin-bottom:16px;">
            <h3 style="color:#333;margin-bottom:10px;font-size:15px;"><i class="fas fa-sticky-note" style="color:#ff9800;"></i> 내부 메모</h3>
            <textarea id="memo-input-${inquiry.id}" style="width:100%;padding:10px;border:1px solid #ddd;border-radius:8px;font-size:14px;resize:vertical;font-family:inherit;" rows="3" placeholder="상담 내용, 메모를 입력하세요...">${escapeHtml(inquiry.memo || '')}</textarea>
            <button class="btn btn-secondary btn-sm" style="margin-top:8px;" onclick="saveMemo('${inquiry.id}')"><i class="fas fa-save"></i> 메모 저장</button>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px;flex-wrap:wrap;">
            <button class="btn btn-success" onclick="updateInquiryStatus('${inquiry.id}', 'inprogress')"><i class="fas fa-phone"></i> 상담중으로 변경</button>
            <button class="btn btn-primary" onclick="updateInquiryStatus('${inquiry.id}', 'completed')"><i class="fas fa-check"></i> 완료 처리</button>
            <button class="btn btn-danger btn-sm" onclick="deleteInquiry('${inquiry.id}')"><i class="fas fa-trash"></i> 삭제</button>
            <button class="btn btn-secondary" onclick="closeModal()" style="margin-left:auto;">닫기</button>
        </div>`;

    const container = document.getElementById('inquiry-detail');
    const modal = document.getElementById('inquiry-modal');
    if (container) container.innerHTML = detail;
    if (modal) modal.classList.add('show');
}
window.viewInquiryDetail = viewInquiryDetail;

async function updateInquiryStatus(id, status) {
    const supabase = getSupabase();
    if (!supabase) return alert('Supabase 연결이 필요합니다.');
    const { error } = await supabase.from('inquiries').update({ status }).eq('id', id);
    if (error) return alert('상태 변경 실패');
    alert(`상태 변경 완료: ${getStatusText(status)}`);
    closeModal();
    await loadDashboardData();
    await loadInquiries();
    loadStatistics();
}
window.updateInquiryStatus = updateInquiryStatus;

async function saveMemo(id) {
    const supabase = getSupabase();
    if (!supabase) return alert('Supabase 연결이 필요합니다.');
    const memo = document.getElementById(`memo-input-${id}`)?.value || '';
    const { error } = await supabase.from('inquiries').update({ memo }).eq('id', id);
    if (error) return alert('메모 저장 실패');
    alert('메모가 저장되었습니다.');
    await loadInquiries();
}
window.saveMemo = saveMemo;

async function deleteInquiry(id) {
    if (!confirm('이 문의를 삭제하시겠습니까?')) return;
    const supabase = getSupabase();
    if (!supabase) return alert('Supabase 연결이 필요합니다.');
    const { error } = await supabase.from('inquiries').delete().eq('id', id);
    if (error) return alert('삭제 실패');
    alert('삭제되었습니다.');
    closeModal();
    await loadDashboardData();
    await loadInquiries();
    loadStatistics();
}
window.deleteInquiry = deleteInquiry;

function closeModal() {
    const modal = document.getElementById('inquiry-modal');
    if (modal) modal.classList.remove('show');
}
window.closeModal = closeModal;

function loadStatistics() {
    const inquiries = allInquiries || [];
    const now = new Date();
    const thisMonth = inquiries.filter(i => {
        if (!i.created_at) return false;
        const d = new Date(i.created_at);
        return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear();
    });
    const daysInMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
    const completed = thisMonth.filter(i => i.status === 'completed').length;
    const conversion = thisMonth.length ? ((completed / thisMonth.length) * 100).toFixed(1) : '0.0';

    setText('report-inquiries', `${thisMonth.length}건`);
    setText('report-daily-avg', `${(thisMonth.length / daysInMonth).toFixed(1)}건`);
    setText('report-conversion', `${conversion}%`);
    setText('report-contracts', `${completed}건`);
}

function loadConsultantsAdmin() {
    const container = document.getElementById('consultants-list');
    if (!container) return;
    container.innerHTML = `
        <div class="consultant-admin-card">
            <div class="consultant-admin-info">
                <div class="consultant-admin-avatar"><i class="fas fa-shield-alt"></i></div>
                <div class="consultant-admin-details">
                    <h3>운영 안내</h3>
                    <p>문의 DB는 Supabase에 저장됩니다.</p>
                    <p style="font-size:13px;color:#999;">관리자 계정은 Supabase Authentication에서 추가합니다.</p>
                </div>
            </div>
        </div>`;
}

function loadAutomationSettings() {
    const box = document.getElementById('automation-settings');
    if (!box) return;
    box.innerHTML = `
        <div class="setting-card"><div class="setting-header"><h3><i class="fas fa-database"></i> 저장 방식</h3></div><p>고객 신청 데이터는 Supabase inquiries 테이블에 저장됩니다.</p></div>
        <div class="setting-card"><div class="setting-header"><h3><i class="fas fa-user-lock"></i> 관리자 인증</h3></div><p>관리자는 Supabase Authentication 이메일 로그인으로 접속합니다.</p></div>
        <div class="setting-card"><div class="setting-header"><h3><i class="fas fa-link"></i> 접속 주소</h3></div><p>${window.location.origin}${ADMIN_HOME}</p></div>`;
}

function setText(id, value) {
    const el = document.getElementById(id);
    if (el) el.textContent = value;
}

function formatDate(ts) {
    if (!ts) return '-';
    const d = new Date(ts);
    if (Number.isNaN(d.getTime())) return ts;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')} ${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

function getStatusText(value) {
    return { pending: '대기중', inprogress: '상담중', completed: '완료' }[value] || '대기중';
}

function getPropertyTypeText(value) {
    return { apt: '아파트', villa: '빌라/연립', house: '단독주택', officetel: '오피스텔', commercial: '상가/업무시설', land: '토지' }[value] || (value || '-');
}

function getRegionText(value) {
    return { seoul: '서울', metro: '수도권(경기/인천)', 'metro-city': '광역시', local: '지방' }[value] || (value || '-');
}

function getHomeOwnershipText(value) {
    return { first: '생애최초', none: '무주택', one: '1주택', multiple: '2주택 이상' }[value] || (value || '-');
}

function escapeHtml(value) {
    return String(value ?? '')
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/\"/g, '&quot;')
        .replace(/'/g, '&#39;');
}
// ── 접속자 & 계산기 통계 로드 ──
async function loadVisitorStats() {
    try {
        const today = new Date().toISOString().split('T')[0];

        // 오늘 접속자
        const { count: todayVisitors } = await supabase
            .from('visitor_logs')
            .select('*', { count: 'exact', head: true })
            .gte('created_at', today + 'T00:00:00')
            .lte('created_at', today + 'T23:59:59');

        // 누적 접속자
        const { count: totalVisitors } = await supabase
            .from('visitor_logs')
            .select('*', { count: 'exact', head: true });

        // 낙찰 전 계산 횟수
        const { count: calcBefore } = await supabase
            .from('calc_logs')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'before');

        // 낙찰 후 계산 횟수
        const { count: calcAfter } = await supabase
            .from('calc_logs')
            .select('*', { count: 'exact', head: true })
            .eq('type', 'after');

        document.getElementById('stat-visitors-today').textContent = todayVisitors || 0;
        document.getElementById('stat-visitors-total').textContent = totalVisitors || 0;
        document.getElementById('stat-calc-before').textContent = calcBefore || 0;
        document.getElementById('stat-calc-after').textContent = calcAfter || 0;

    } catch (e) {
        console.log('통계 로드 실패:', e);
    }
}

// 대시보드 로드 시 실행
const _origLoadDashboard = typeof loadDashboard === 'function' ? loadDashboard : null;
document.addEventListener('DOMContentLoaded', () => {
    setTimeout(loadVisitorStats, 1000);
});
