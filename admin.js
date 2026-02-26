// Demo Credentials
const ADMIN_USERNAME = 'admin';
const ADMIN_PASSWORD = 'admin1234';

// Global State
let currentPage = 'dashboard';
let allInquiries = [];
let allConsultants = [];
let filteredInquiries = [];

document.addEventListener('DOMContentLoaded', function() {
    const loginForm = document.getElementById('login-form');
    if (loginForm) loginForm.addEventListener('submit', handleLogin);
    const logoutBtn = document.getElementById('logout-btn');
    if (logoutBtn) logoutBtn.addEventListener('click', handleLogout);
    const navItems = document.querySelectorAll('.nav-item');
    navItems.forEach(item => {
        item.addEventListener('click', (e) => {
            e.preventDefault();
            const page = item.getAttribute('data-page');
            switchPage(page);
        });
    });
    const filterStatus = document.getElementById('filter-status');
    const filterType = document.getElementById('filter-type');
    const filterAssigned = document.getElementById('filter-assigned');
    const searchInput = document.getElementById('search-input');
    if (filterStatus) filterStatus.addEventListener('change', applyFilters);
    if (filterType) filterType.addEventListener('change', applyFilters);
    if (filterAssigned) filterAssigned.addEventListener('change', applyFilters);
    if (searchInput) searchInput.addEventListener('input', applyFilters);
    const excelBtn = document.getElementById('excel-export-btn');
    if (excelBtn) excelBtn.addEventListener('click', exportToExcel);
    const modal = document.getElementById('inquiry-modal');
    if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        closeBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }
});

function handleLogin(e) {
    e.preventDefault();
    const username = document.getElementById('admin-username').value;
    const password = document.getElementById('admin-password').value;
    if (username === ADMIN_USERNAME && password === ADMIN_PASSWORD) {
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

function switchPage(page) {
    currentPage = page;
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-page') === page) item.classList.add('active');
    });
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    document.getElementById(`${page}-page`).classList.add('active');
    if (page === 'dashboard') loadDashboardData();
    else if (page === 'inquiries') loadInquiries();
    else if (page === 'statistics') loadStatistics();
    else if (page === 'consultants') loadConsultantsAdmin();
    else if (page === 'automation') loadAutomationSettings();
}

async function loadDashboardData() {
    try {
        const response = await fetch('tables/inquiries?limit=1000');
        const data = await response.json();
        if (data.data) {
            const inquiries = data.data;
            const today = new Date().toISOString().split('T')[0];
            const todayInquiries = inquiries.filter(i => i.created_at && new Date(i.created_at).toISOString().split('T')[0] === today).length;
            const pending = inquiries.filter(i => i.status === 'pending').length;
            const inprogress = inquiries.filter(i => i.status === 'inprogress').length;
            const completed = inquiries.filter(i => i.status === 'completed').length;
            document.getElementById('stat-today').textContent = todayInquiries;
            document.getElementById('stat-pending').textContent = pending;
            document.getElementById('stat-inprogress').textContent = inprogress;
            document.getElementById('stat-completed').textContent = completed;
            document.getElementById('perf-total').textContent = inquiries.length + '건';
            document.getElementById('perf-consultations').textContent = inprogress + completed + '건';
            document.getElementById('perf-contracts').textContent = completed + '건';
            const totalFees = inquiries.filter(i => i.status === 'completed').reduce((sum, i) => sum + (i.desired_amount || 0) * 0.005, 0);
            document.getElementById('perf-fees').textContent = Math.floor(totalFees).toLocaleString('ko-KR') + '원';
            displayRecentInquiries(inquiries.slice(0, 5));
        }
    } catch (error) { console.error('Error loading dashboard:', error); }
}

function displayRecentInquiries(inquiries) {
    const container = document.getElementById('recent-inquiries-list');
    if (inquiries.length === 0) { container.innerHTML = '<p style="text-align:center;color:#999;padding:20px;">최근 문의가 없습니다.</p>'; return; }
    const html = inquiries.map(inq => `<div style="background:#f8f9fa;padding:15px;border-radius:8px;margin-bottom:10px;border-left:3px solid #0066cc;"><div style="display:flex;justify-content:space-between;margin-bottom:8px;"><strong>${inq.name||'이름 없음'}</strong><span class="status-badge ${inq.status}">${getStatusText(inq.status)}</span></div><div style="font-size:14px;color:#666;">📞 ${inq.phone||'N/A'} | 💰 ${(inq.desired_amount/10000).toLocaleString('ko-KR')}만원</div></div>`).join('');
    container.innerHTML = html;
}

async function loadInquiries() {
    try {
        const response = await fetch('tables/inquiries?limit=1000');
        const data = await response.json();
        if (data.data) { allInquiries = data.data; filteredInquiries = [...allInquiries]; displayInquiries(filteredInquiries); }
    } catch (error) { allInquiries = []; filteredInquiries = []; displayInquiries([]); }
}

function applyFilters() {
    const statusFilter = document.getElementById('filter-status').value;
    const typeFilter = document.getElementById('filter-type').value;
    const assignedFilter = document.getElementById('filter-assigned').value;
    const searchTerm = document.getElementById('search-input').value.toLowerCase();
    filteredInquiries = allInquiries.filter(inq => {
        if (statusFilter && inq.status !== statusFilter) return false;
        if (typeFilter) { if (typeFilter === 'before' && inq.case_number) return false; if (typeFilter === 'after' && !inq.case_number) return false; }
        if (assignedFilter === 'unassigned' && inq.assigned_to !== 'unassigned') return false;
        if (searchTerm) { const searchFields = [inq.name, inq.phone, inq.case_number].filter(Boolean).map(f => f.toLowerCase()); if (!searchFields.some(field => field.includes(searchTerm))) return false; }
        return true;
    });
    displayInquiries(filteredInquiries);
}

function displayInquiries(inquiries) {
    const tbody = document.getElementById('inquiries-table-body');
    if (inquiries.length === 0) { tbody.innerHTML = '<tr><td colspan="8" style="text-align:center;padding:40px;color:#999;">문의 내역이 없습니다.</td></tr>'; return; }
    const html = inquiries.map(inq => `<tr><td>${formatDate(inq.created_at)}</td><td>${inq.name||'N/A'}</td><td>${inq.phone||'N/A'}</td><td>${getPropertyTypeText(inq.property_type)}</td><td>${(inq.expected_winning_price/10000).toLocaleString('ko-KR')}만원</td><td><span class="status-badge ${inq.status}">${getStatusText(inq.status)}</span></td><td>${inq.assigned_to==='unassigned'?'미배정':inq.assigned_to}</td><td><button class="btn btn-primary btn-sm" onclick="viewInquiryDetail('${inq.id}')"><i class="fas fa-eye"></i> 상세</button></td></tr>`).join('');
    tbody.innerHTML = html;
}

function viewInquiryDetail(id) {
    const inquiry = allInquiries.find(i => i.id === id);
    if (!inquiry) return;
    const modal = document.getElementById('inquiry-modal');
    const detailContainer = document.getElementById('inquiry-detail');
    const html = `<h2 style="margin-bottom:20px;">문의 상세 정보</h2>
        <div class="inquiry-detail-section"><h3>고객 정보</h3><div class="detail-grid">
        <div class="detail-item"><div class="detail-label">이름</div><div class="detail-value">${inquiry.name||'N/A'}</div></div>
        <div class="detail-item"><div class="detail-label">연락처</div><div class="detail-value">${inquiry.phone||'N/A'}</div></div>
        <div class="detail-item"><div class="detail-label">접수일</div><div class="detail-value">${formatDate(inquiry.created_at)}</div></div>
        <div class="detail-item"><div class="detail-label">상태</div><div class="detail-value"><span class="status-badge ${inquiry.status}">${getStatusText(inquiry.status)}</span></div></div>
        </div></div>
        <div class="inquiry-detail-section"><h3>물건 정보</h3><div class="detail-grid">
        ${inquiry.case_number?`<div class="detail-item"><div class="detail-label">사건번호</div><div class="detail-value">${inquiry.case_number}</div></div>`:''}
        <div class="detail-item"><div class="detail-label">감정가</div><div class="detail-value">${(inquiry.appraisal_value/10000).toLocaleString('ko-KR')}만원</div></div>
        <div class="detail-item"><div class="detail-label">예상낙찰가</div><div class="detail-value">${(inquiry.expected_winning_price/10000).toLocaleString('ko-KR')}만원</div></div>
        <div class="detail-item"><div class="detail-label">물건유형</div><div class="detail-value">${getPropertyTypeText(inquiry.property_type)}</div></div>
        <div class="detail-item"><div class="detail-label">지역분류</div><div class="detail-value">${getRegionText(inquiry.region)}</div></div>
        </div></div>
        <div class="inquiry-detail-section"><h3>재무 정보</h3><div class="detail-grid">
        <div class="detail-item"><div class="detail-label">주택보유</div><div class="detail-value">${getHomeOwnershipText(inquiry.home_ownership)}</div></div>
        <div class="detail-item"><div class="detail-label">연소득</div><div class="detail-value">${(inquiry.annual_income/10000).toLocaleString('ko-KR')}만원</div></div>
        <div class="detail-item"><div class="detail-label">기존부채</div><div class="detail-value">${(inquiry.existing_debt/10000).toLocaleString('ko-KR')}만원</div></div>
        <div class="detail-item"><div class="detail-label">신용등급</div><div class="detail-value">${inquiry.credit_score}</div></div>
        </div></div>
        <div class="inquiry-detail-section"><h3>내부 메모</h3>
        <textarea style="width:100%;padding:10px;border:1px solid #ddd;border-radius:6px;font-size:14px;" rows="3" placeholder="내부 메모를 입력하세요...">${inquiry.memo||''}</textarea>
        </div>
        <div style="display:flex;gap:10px;margin-top:20px;">
        <button class="btn btn-success" onclick="updateInquiryStatus('${inquiry.id}', 'inprogress')"><i class="fas fa-phone"></i> 상담중으로 변경</button>
        <button class="btn btn-primary" onclick="updateInquiryStatus('${inquiry.id}', 'completed')"><i class="fas fa-check"></i> 완료 처리</button>
        <button class="btn btn-secondary" onclick="closeModal()">닫기</button>
        </div>`;
    detailContainer.innerHTML = html;
    modal.classList.add('show');
}

async function updateInquiryStatus(id, status) {
    try {
        const response = await fetch(`tables/inquiries/${id}`, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ status }) });
        if (response.ok) { alert('상태가 변경되었습니다.'); closeModal(); loadInquiries(); loadDashboardData(); }
        else { alert('상태 변경에 실패했습니다.'); }
    } catch (error) { alert('상태 변경 중 오류가 발생했습니다.'); }
}

function closeModal() { const modal = document.getElementById('inquiry-modal'); modal.classList.remove('show'); }

function loadStatistics() {
    const inquiries = allInquiries;
    const now = new Date();
    const thisMonth = inquiries.filter(i => { const date = new Date(i.created_at); return date.getMonth()===now.getMonth()&&date.getFullYear()===now.getFullYear(); });
    const lastMonth = new Date(now.getFullYear(), now.getMonth()-1, 1);
    const lastMonthInquiries = inquiries.filter(i => { const date = new Date(i.created_at); return date.getMonth()===lastMonth.getMonth()&&date.getFullYear()===lastMonth.getFullYear(); });
    const growth = lastMonthInquiries.length>0?((thisMonth.length-lastMonthInquiries.length)/lastMonthInquiries.length*100).toFixed(1):0;
    document.getElementById('report-inquiries').textContent = thisMonth.length+'건';
    document.getElementById('report-inquiries-change').textContent = `전월 대비 ${growth}%`;
    const daysInMonth = new Date(now.getFullYear(), now.getMonth()+1, 0).getDate();
    document.getElementById('report-daily-avg').textContent = (thisMonth.length/daysInMonth).toFixed(1)+'건';
    const completed = thisMonth.filter(i => i.status==='completed').length;
    const conversion = thisMonth.length>0?((completed/thisMonth.length)*100).toFixed(1):0;
    document.getElementById('report-conversion').textContent = conversion+'%';
    document.getElementById('report-contracts').textContent = completed+'건';
    const totalLoan = completed>0?thisMonth.filter(i=>i.status==='completed').reduce((sum,i)=>sum+(i.desired_amount/10000),0):0;
    const avgLoan = completed>0?Math.floor(totalLoan/completed):0;
    document.getElementById('report-avg-loan').textContent = avgLoan.toLocaleString('ko-KR')+'만원';
    document.getElementById('report-total-loan').textContent = Math.floor(totalLoan).toLocaleString('ko-KR')+'만원';
}

async function loadConsultantsAdmin() {
    try {
        const response = await fetch('tables/consultants?limit=100');
        const data = await response.json();
        if (data.data) { allConsultants = data.data; displayConsultantsAdmin(allConsultants); }
    } catch (error) { displayConsultantsAdmin([]); }
}

function displayConsultantsAdmin(consultants) {
    const container = document.getElementById('consultants-list');
    if (consultants.length===0) { container.innerHTML='<p style="text-align:center;color:#999;padding:40px;">등록된 상담사가 없습니다.</p>'; return; }
    const html = consultants.map(c => `<div class="consultant-admin-card"><div class="consultant-admin-info"><div class="consultant-admin-avatar"><i class="fas fa-user-tie"></i></div><div class="consultant-admin-details"><h3>${c.name}</h3><p>${c.specialty||'경매 대출 전문'} | 📞 ${c.phone}</p><p style="font-size:13px;color:#999;">상담 ${c.total_consultations||0}건 · 계약 ${c.total_contracts||0}건</p></div></div><div class="consultant-admin-actions"><button class="btn btn-primary btn-sm"><i class="fas fa-edit"></i> 수정</button><button class="btn ${c.is_active?'btn-danger':'btn-success'} btn-sm">${c.is_active?'비활성화':'활성화'}</button></div></div>`).join('');
    container.innerHTML = html;
}

function loadAutomationSettings() {
    const smsAuto = localStorage.getItem('sms-auto')==='true';
    const emailAuto = localStorage.getItem('email-auto')==='true';
    const aiAuto = localStorage.getItem('ai-auto')!=='false';
    document.getElementById('sms-auto').checked = smsAuto;
    document.getElementById('email-auto').checked = emailAuto;
    document.getElementById('ai-auto').checked = aiAuto;
    document.getElementById('sms-auto').addEventListener('change', (e) => { localStorage.setItem('sms-auto', e.target.checked); });
    document.getElementById('email-auto').addEventListener('change', (e) => { localStorage.setItem('email-auto', e.target.checked); });
    document.getElementById('ai-auto').addEventListener('change', (e) => { localStorage.setItem('ai-auto', e.target.checked); });
}

function exportToExcel() {
    if (filteredInquiries.length===0) { alert('내보낼 데이터가 없습니다.'); return; }
    const header = ['접수일','이름','연락처','사건번호','물건유형','예상낙찰가','희망대출액','상태','담당자'];
    const rows = filteredInquiries.map(inq => [formatDate(inq.created_at),inq.name||'',inq.phone||'',inq.case_number||'',getPropertyTypeText(inq.property_type),(inq.expected_winning_price/10000)+'만원',(inq.desired_amount/10000)+'만원',getStatusText(inq.status),inq.assigned_to==='unassigned'?'미배정':inq.assigned_to]);
    const csv = [header,...rows].map(row=>row.join(',')).join('\n');
    const BOM = '\uFEFF';
    const blob = new Blob([BOM+csv], {type:'text/csv;charset=utf-8;'});
    const link = document.createElement('a');
    const url = URL.createObjectURL(blob);
    link.setAttribute('href', url);
    link.setAttribute('download', `inquiries_${new Date().toISOString().split('T')[0]}.csv`);
    link.style.visibility = 'hidden';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

function formatDate(timestamp) {
    if (!timestamp) return 'N/A';
    const date = new Date(timestamp);
    return `${date.getFullYear()}-${String(date.getMonth()+1).padStart(2,'0')}-${String(date.getDate()).padStart(2,'0')}`;
}

function getStatusText(status) { return {'pending':'대기중','inprogress':'상담중','completed':'완료'}[status]||status; }
function getPropertyTypeText(type) { return {'apt':'아파트','villa':'빌라/연립','house':'단독주택','officetel':'오피스텔','commercial':'상가/업무시설','land':'토지','residential':'주택'}[type]||type; }
function getRegionText(region) { return {'seoul':'서울','metro':'수도권','metro-city':'광역시','local':'지방','normal':'비조정지역','regulated':'조정대상지역','speculation':'투기과열지구'}[region]||region; }
function getHomeOwnershipText(ownership) { return {'none':'무주택','one':'1주택','multiple':'2주택 이상','two_plus':'2주택 이상'}[ownership]||ownership; }

async function loadConsultants() {}
