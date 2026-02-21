// Scroll to Calculator
function scrollToCalculator() {
    document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
}

// 주소에서 자동으로 지역 분류
function classifyRegionFromAddress(address) {
    if (!address) return null;
    const addr = address.trim();
    if (addr.includes('서울') || addr.includes('서울특별시') || addr.includes('서울시')) {
        return { code: 'seoul', name: '서울', isRegulated: true };
    }
    if (addr.includes('경기') || addr.includes('경기도') || addr.includes('인천') || addr.includes('인천광역시') ||
        addr.includes('성남') || addr.includes('수원') || addr.includes('안양') || addr.includes('부천') || 
        addr.includes('광명') || addr.includes('평택') || addr.includes('안산') || addr.includes('고양') || 
        addr.includes('남양주') || addr.includes('용인') || addr.includes('시흥') || addr.includes('파주') || 
        addr.includes('김포') || addr.includes('의정부') || addr.includes('광주시') || addr.includes('하남') || 
        addr.includes('오산') || addr.includes('양주') || addr.includes('구리') || addr.includes('화성')) {
        return { code: 'metro', name: '수도권 (경기/인천)', isRegulated: true };
    }
    if (addr.includes('부산') || addr.includes('부산광역시') || addr.includes('대구') || addr.includes('대구광역시') ||
        addr.includes('광주') || addr.includes('광주광역시') || addr.includes('대전') || addr.includes('대전광역시') ||
        addr.includes('울산') || addr.includes('울산광역시') || addr.includes('세종') || addr.includes('세종특별자치시')) {
        return { code: 'metro-city', name: '광역시', isRegulated: false };
    }
    return { code: 'local', name: '지방', isRegulated: false };
}

function handleAddressInput(addressInputId, regionSelectId, resultDivId, resultTextId) {
    const addressInput = document.getElementById(addressInputId);
    const regionSelect = document.getElementById(regionSelectId);
    const resultDiv = document.getElementById(resultDivId);
    const resultText = document.getElementById(resultTextId);
    if (!addressInput || !regionSelect) return;
    addressInput.addEventListener('input', function() {
        const address = this.value;
        if (address.length >= 2) {
            const region = classifyRegionFromAddress(address);
            if (region) {
                regionSelect.value = region.code;
                if (resultDiv && resultText) {
                    resultText.textContent = region.name + (region.isRegulated ? ' (규제지역)' : ' (비규제지역)');
                    resultDiv.style.display = 'block';
                }
                updateProgress();
            }
        } else {
            if (resultDiv) resultDiv.style.display = 'none';
        }
    });
}

function formatKoreanWon(manwon) {
    if (!manwon || isNaN(manwon)) return '';
    const num = parseInt(manwon);
    if (num === 0) return '0원';
    const eok = Math.floor(num / 10000);
    const man = num % 10000;
    let result = [];
    if (eok > 0) result.push(`${eok.toLocaleString('ko-KR')}억`);
    if (man > 0) result.push(`${man.toLocaleString('ko-KR')}만원`);
    else if (eok > 0) result.push('원');
    return result.join(' ');
}

function saveToLocalStorage(key, data) {
    try { localStorage.setItem(key, JSON.stringify(data)); } catch (e) { console.error('localStorage save error:', e); }
}

function loadFromLocalStorage(key) {
    try { const data = localStorage.getItem(key); return data ? JSON.parse(data) : null; } catch (e) { return null; }
}

function validateInputs(formData) {
    const warnings = [];
    if (formData.kbPrice && formData.expectedPrice) {
        const ratio = (parseInt(formData.expectedPrice) / parseInt(formData.kbPrice)) * 100;
        if (ratio > 110) warnings.push({ type: 'warning', message: '💡 낙찰가가 KB 시세보다 10% 이상 높습니다.', detail: '시세보다 높은 금액으로 입찰하시는 것입니다.' });
    }
    if (formData.annualIncome && formData.existingDebt) {
        const income = parseInt(formData.annualIncome);
        const debt = parseInt(formData.existingDebt);
        const dsrRatio = (debt / income) * 100;
        if (dsrRatio > 40) warnings.push({ type: 'warning', message: '💡 기존 부채 비율이 높습니다.', detail: `현재 DSR ${dsrRatio.toFixed(1)}% (기준: 40% 이하) - 대출 승인이 어려울 수 있습니다.` });
        else if (dsrRatio > 35) warnings.push({ type: 'info', message: '💡 DSR이 높은 편입니다.', detail: `현재 DSR ${dsrRatio.toFixed(1)}% (여유분 ${(40 - dsrRatio).toFixed(1)}%)` });
    }
    return warnings;
}

function showWarnings(warnings, containerId) {
    const container = document.getElementById(containerId);
    if (!container) return;
    container.innerHTML = '';
    if (warnings.length === 0) { container.style.display = 'none'; return; }
    warnings.forEach(warning => {
        const div = document.createElement('div');
        div.className = `validation-${warning.type}`;
        div.innerHTML = `<strong>${warning.message}</strong><br><span>${warning.detail}</span>`;
        container.appendChild(div);
    });
    container.style.display = 'block';
}

function updateProgress() {
    const form = document.getElementById('before-form');
    if (!form) return;
    const requiredFields = form.querySelectorAll('[required]');
    let filledCount = 0;
    requiredFields.forEach(field => { if (field.value && field.value.trim() !== '') filledCount++; });
    const progress = (filledCount / requiredFields.length) * 100;
    const progressBar = document.getElementById('progress-bar');
    const progressText = document.getElementById('progress-text');
    if (progressBar && progressText) {
        progressBar.style.width = `${progress}%`;
        progressText.textContent = `${Math.round(progress)}%`;
    }
}

function analyzeApprovalProbability(formData, result) {
    let score = 60;
    const reasons = [], warnings = [], conditions = [];
    if (formData.homeOwnership === 'none') {
        score += 15; reasons.push('✅ 무주택자 - 대출 승인 유리 (+15점)');
    } else if (formData.homeOwnership === 'one') {
        const isRegulated = formData.region === 'seoul' || formData.region === 'metro';
        if (isRegulated) { score -= 15; warnings.push('❌ 규제지역 1주택자 - 대출 거의 불가 (-15점)'); conditions.push('⚠️ 기존 주택 매도 조건부로만 가능'); }
        else { conditions.push('⚠️ 조건부 승인: 기존 주택 6개월 내 매도 조건'); warnings.push('1주택 보유 - 매도 조건부 대출 (0점)'); }
    } else {
        score -= 20; warnings.push('❌ 2주택 이상 - 2금융 대출 거의 불가 (-20점)'); conditions.push('⚠️ 승인 가능성 매우 낮음 (사업자 신탁대출 검토 권장)');
    }
    if (formData.kbPrice && formData.expectedPrice) {
        const kbRatio = (parseInt(formData.expectedPrice) / parseInt(formData.kbPrice)) * 100;
        if (kbRatio <= 70) { score += 15; reasons.push(`✅ KB 시세 대비 ${kbRatio.toFixed(0)}% - 담보 여력 우수 (+15점)`); }
        else if (kbRatio <= 85) { score += 8; reasons.push(`✅ KB 시세 대비 ${kbRatio.toFixed(0)}% - 담보 여력 양호 (+8점)`); }
        else if (kbRatio <= 95) { warnings.push(`⚠️ KB 시세 대비 ${kbRatio.toFixed(0)}% - 담보 여력 보통 (0점)`); }
        else if (kbRatio <= 110) { score -= 8; warnings.push(`⚠️ KB 시세 대비 ${kbRatio.toFixed(0)}% - 담보 부족 우려 (-8점)`); conditions.push('⚠️ 추가 담보 또는 자기자본 확대 필요'); }
        else { score -= 15; warnings.push(`❌ KB 시세 대비 ${kbRatio.toFixed(0)}% - 과도한 고가 낙찰 (-15점)`); conditions.push('❌ 대출 승인 어려움 - 자기자본 비중 확대 필수'); }
    } else if (formData.appraisalPrice && formData.expectedPrice) {
        const ratio = (parseInt(formData.expectedPrice) / parseInt(formData.appraisalPrice)) * 100;
        if (ratio < 70) { score += 8; reasons.push(`✅ 감정가 대비 ${ratio.toFixed(0)}% - 낙찰률 양호 (+8점)`); }
        else if (ratio < 85) { score += 3; reasons.push(`적정 낙찰률 ${ratio.toFixed(0)}% (+3점)`); }
        conditions.push('💡 KB 시세 입력 시 더 정확한 분석 가능');
    }
    const creditScore = parseInt(formData.creditScore);
    if (creditScore >= 900) { score += 15; reasons.push('✅ 신용등급 1등급 - 최우대 금리 적용 (+15점)'); }
    else if (creditScore >= 850) { score += 10; reasons.push('✅ 신용등급 2등급 - 우대 금리 적용 (+10점)'); }
    else if (creditScore >= 800) { score += 5; reasons.push('✅ 신용등급 3등급 - 양호 (+5점)'); }
    else if (creditScore >= 700) { warnings.push('신용등급 4-5등급 - 보통 (0점)'); }
    else if (creditScore >= 650) { score -= 5; warnings.push('⚠️ 신용등급 6등급 - 금리 상승 (-5점)'); conditions.push('⚠️ 금리 0.5~1.0%p 추가 가능'); }
    else if (creditScore >= 600) { score -= 10; warnings.push('⚠️ 신용등급 7등급 - 금리 대폭 상승 (-10점)'); conditions.push('⚠️ 금리 1.5~2.0%p 추가, 한도 축소 가능'); }
    else { score -= 15; warnings.push('❌ 신용등급 8등급 이하 - 대출 어려움 (-15점)'); conditions.push('❌ 2금융권 대출도 승인 어려움'); }
    if (formData.annualIncome && formData.existingDebt) {
        const income = parseInt(formData.annualIncome);
        const debt = parseInt(formData.existingDebt);
        const dsrRatio = (debt / income) * 100;
        if (dsrRatio <= 20) { score += 10; reasons.push(`✅ DSR ${dsrRatio.toFixed(0)}% - 상환 여력 우수 (+10점)`); }
        else if (dsrRatio <= 30) { score += 5; reasons.push(`✅ DSR ${dsrRatio.toFixed(0)}% - 상환 여력 양호 (+5점)`); }
        else if (dsrRatio <= 40) { warnings.push(`⚠️ DSR ${dsrRatio.toFixed(0)}% - 상환 여력 보통 (0점)`); }
        else if (dsrRatio <= 50) { score -= 10; warnings.push(`⚠️ DSR ${dsrRatio.toFixed(0)}% - 상환 부담 높음 (-10점)`); conditions.push('⚠️ 대출 한도 축소 가능'); }
        else { score -= 15; warnings.push(`❌ DSR ${dsrRatio.toFixed(0)}% - 대출 승인 어려움 (-15점)`); conditions.push('❌ DSR 40% 초과 - 승인 거의 불가'); }
    }
    if (formData.propertyType === 'apt') { score += 5; reasons.push('✅ 아파트 - 선호 물건 (+5점)'); }
    else if (formData.propertyType === 'officetel') { score -= 5; warnings.push('⚠️ 오피스텔 - LTV 낮음 (-5점)'); }
    else if (formData.propertyType === 'commercial') { score -= 5; warnings.push('⚠️ 상가 - 사업자 신탁대출 권장 (-5점)'); }
    if (result.personal.ltv >= 70) { score += 5; reasons.push(`✅ 높은 LTV ${result.personal.ltv}% 가능 (+5점)`); }
    else if (result.personal.ltv <= 50) { score -= 5; warnings.push(`⚠️ LTV ${result.personal.ltv}% - 한도 제한 (-5점)`); }
    score = Math.max(0, Math.min(100, score));
    let level, levelText;
    if (score >= 80) { level = 'high'; levelText = '✅ 승인 가능성 높음 (80점 이상)'; }
    else if (score >= 65) { level = 'medium'; levelText = '⚠️ 조건부 승인 가능 (65-79점)'; }
    else if (score >= 50) { level = 'low'; levelText = '⚠️ 승인 어려움 (50-64점)'; }
    else { level = 'very-low'; levelText = '❌ 승인 거의 불가 (50점 미만)'; }
    return { score, level, levelText, reasons, warnings, conditions };
}

function updateMoneyDisplay(inputId, displayId) {
    const input = document.getElementById(inputId);
    const display = document.getElementById(displayId);
    if (!input || !display) return;
    input.addEventListener('input', function() {
        const value = this.value;
        if (value) { display.textContent = `💰 ${formatKoreanWon(value)}`; display.style.display = 'block'; }
        else { display.style.display = 'none'; }
        updateProgress();
        saveFormData();
    });
}

function saveFormData() {
    const form = document.getElementById('before-form');
    if (!form) return;
    const formData = new FormData(form);
    const data = Object.fromEntries(formData.entries());
    saveToLocalStorage('lastCalculation', { data: data, timestamp: Date.now() });
}

function loadFormData() {
    const saved = loadFromLocalStorage('lastCalculation');
    if (!saved || !saved.data) return;
    const form = document.getElementById('before-form');
    if (!form) return;
    const hoursSince = (Date.now() - saved.timestamp) / (1000 * 60 * 60);
    if (hoursSince > 24) return;
    Object.keys(saved.data).forEach(key => {
        const input = form.querySelector(`[name="${key}"]`);
        if (input && saved.data[key]) {
            input.value = saved.data[key];
            const event = new Event('input', { bubbles: true });
            input.dispatchEvent(event);
        }
    });
    showRestoreNotification(saved.timestamp);
}

function showRestoreNotification(timestamp) {
    const date = new Date(timestamp);
    const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    const notification = document.createElement('div');
    notification.className = 'restore-notification';
    notification.innerHTML = `<i class="fas fa-history"></i> 마지막 계산 내용을 불러왔습니다 (${timeStr}) <button onclick="this.parentElement.remove()" style="margin-left: 10px; cursor: pointer;">✕</button>`;
    const calculator = document.getElementById('calculator');
    if (calculator) {
        calculator.insertBefore(notification, calculator.firstChild);
        setTimeout(() => { notification.remove(); }, 10000);
    }
}

document.addEventListener('DOMContentLoaded', function() {
    const tabButtons = document.querySelectorAll('.tab-button');
    const tabContents = document.querySelectorAll('.tab-content');
    tabButtons.forEach(button => {
        button.addEventListener('click', () => {
            const targetTab = button.getAttribute('data-tab');
            tabButtons.forEach(btn => btn.classList.remove('active'));
            tabContents.forEach(content => content.classList.remove('active'));
            button.classList.add('active');
            document.getElementById(`${targetTab}-tab`).classList.add('active');
        });
    });
    loadConsultants();
    loadFormData();
    updateProgress();
    updateMoneyDisplay('before-appraisal-price', 'before-appraisal-display');
    updateMoneyDisplay('before-kb-price', 'before-kb-display');
    updateMoneyDisplay('before-expected-price', 'before-expected-display');
    updateMoneyDisplay('before-annual-income', 'before-income-display');
    updateMoneyDisplay('before-existing-debt', 'before-debt-display');
    updateMoneyDisplay('after-appraisal-value', 'after-appraisal-display');
    updateMoneyDisplay('after-kb-price', 'after-kb-display');
    updateMoneyDisplay('after-expected-price', 'after-expected-display');
    updateMoneyDisplay('after-annual-income', 'after-income-display');
    updateMoneyDisplay('after-existing-debt', 'after-debt-display');
    handleAddressInput('before-address', 'before-region', 'before-address-result', 'before-address-region-text');
    const beforeForm = document.getElementById('before-form');
    if (beforeForm) beforeForm.addEventListener('submit', handleBeforeFormSubmit);
    const afterForm = document.getElementById('after-form');
    if (afterForm) afterForm.addEventListener('submit', handleAfterFormSubmit);
    const modal = document.getElementById('success-modal');
    if (modal) {
        const closeBtn = modal.querySelector('.modal-close');
        if (closeBtn) closeBtn.addEventListener('click', closeModal);
        window.addEventListener('click', (e) => { if (e.target === modal) closeModal(); });
    }
});

function handleBeforeFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    const warnings = validateInputs(data);
    showWarnings(warnings, 'validation-warnings');
    const expectedWinningPrice = parseInt(data.expectedPrice) || 0;
    const appraisalPrice = parseInt(data.appraisalPrice) || 0;
    const annualIncome = parseInt(data.annualIncome) || 0;
    const existingDebt = parseInt(data.existingDebt) || 0;
    const result = calculateLoan({ expectedWinningPrice, appraisalPrice, homeOwnership: data.homeOwnership, region: data.region, propertyType: data.propertyType, annualIncome, existingDebt, creditScore: data.creditScore });
    const approval = analyzeApprovalProbability(data, result);
    displayResult(result, data, approval);
    saveCalculationToHistory(data, result);
}

function calculateLoan(params) {
    const { expectedWinningPrice, appraisalPrice, homeOwnership, region, propertyType, annualIncome, existingDebt, creditScore } = params;
    let personalRateMin = 6.5, personalRateMax = 7.5;
    const score = parseInt(creditScore) || 700;
    if (score >= 900) { personalRateMin = 6.3; personalRateMax = 6.8; }
    else if (score >= 850) { personalRateMin = 6.5; personalRateMax = 7.2; }
    else if (score >= 800) { personalRateMin = 6.8; personalRateMax = 7.5; }
    else if (score >= 750) { personalRateMin = 7.0; personalRateMax = 7.8; }
    else if (score >= 700) { personalRateMin = 7.2; personalRateMax = 8.2; }
    else if (score >= 650) { personalRateMin = 7.5; personalRateMax = 8.5; }
    else { personalRateMin = 8.0; personalRateMax = 9.0; }
    const appraisalVal = parseInt(appraisalPrice) || 0;
    const appraisalBasedLimit = appraisalVal > 0 ? Math.floor(appraisalVal * 0.9) : 0;
    const winningBasedLimit = Math.floor(expectedWinningPrice * 0.7);
    let baseLimit = winningBasedLimit;
    let baseCalculationMethod = `낙찰가 ${expectedWinningPrice.toLocaleString('ko-KR')}만원 × 70% = ${winningBasedLimit.toLocaleString('ko-KR')}만원`;
    if (appraisalVal > 0) {
        if (appraisalBasedLimit < winningBasedLimit) { baseLimit = appraisalBasedLimit; baseCalculationMethod = `감정가 ${appraisalVal.toLocaleString('ko-KR')}만원 × 90% = ${appraisalBasedLimit.toLocaleString('ko-KR')}만원 (감정가 기준이 더 낮아 적용)`; }
        else { baseCalculationMethod = `낙찰가 ${expectedWinningPrice.toLocaleString('ko-KR')}만원 × 70% = ${winningBasedLimit.toLocaleString('ko-KR')}만원\n(감정가 기준 ${appraisalBasedLimit.toLocaleString('ko-KR')}만원보다 낮아 적용)`; }
    }
    let finalLimit = baseLimit, ltvReason = '', ltvAdjustmentReason = '';
    const isResidential = ['apt', 'villa', 'house'].includes(propertyType);
    if (isResidential) {
        if (homeOwnership === 'none') {
            if (baseLimit <= 60000) { finalLimit = Math.floor(baseLimit * 1.1); ltvAdjustmentReason = '무주택자 우대 (DSR 비규제, 6억 이하): 기본 한도 대비 +10% 적용'; ltvReason = '무주택자 경매 대출 (2금융권 우대 조건)'; }
            else { finalLimit = baseLimit; ltvAdjustmentReason = '무주택자 (6억 초과): 기본 한도 적용'; ltvReason = '무주택자 경매 대출'; }
        } else if (homeOwnership === 'one') {
            const isRegulated = region === 'seoul' || region === 'metro';
            if (isRegulated) { finalLimit = Math.floor(baseLimit * 0.7); ltvAdjustmentReason = '1주택 보유 (규제지역): 기본 한도 대비 -30% (매도 조건부 필요)'; ltvReason = '1주택 보유 (규제지역) - 기존 주택 매도 조건부'; }
            else { finalLimit = Math.floor(baseLimit * 0.8); ltvAdjustmentReason = '1주택 보유 (비규제지역): 기본 한도 대비 -20% (6개월 내 매도 조건)'; ltvReason = '1주택 보유 (비규제지역) - 6개월 내 매도 조건부'; }
        } else {
            finalLimit = Math.floor(baseLimit * 0.5); ltvAdjustmentReason = '2주택 이상 보유: 기본 한도 대비 -50% (승인 거의 불가)'; ltvReason = '2주택 이상 보유 - 개인 대출 어려움, 사업자 신탁대출 검토 권장';
        }
    } else { finalLimit = baseLimit; ltvReason = '비주거용 부동산 경매 대출'; ltvAdjustmentReason = '비주거용 부동산: 기본 한도 적용'; }
    let creditAdjustment = '';
    if (score >= 850) { creditAdjustment = '신용등급 우수 (850점 이상) - 한도 조정 없음, 최저 금리 적용 가능'; }
    else if (score >= 700) { creditAdjustment = '신용등급 양호 (700~849점) - 한도 조정 없음, 중간 금리 적용'; }
    else if (score >= 650) { finalLimit = Math.floor(finalLimit * 0.95); creditAdjustment = '신용등급 보통 (650~699점) - 한도 5% 차감, 금리 상승'; }
    else if (score >= 600) { finalLimit = Math.floor(finalLimit * 0.9); creditAdjustment = '신용등급 낮음 (600~649점) - 한도 10% 차감, 금리 대폭 상승'; }
    else { finalLimit = Math.floor(finalLimit * 0.85); creditAdjustment = '신용등급 매우 낮음 (600점 미만) - 한도 15% 차감, 승인 어려움'; }
    const personalLimit = finalLimit;
    const personalLtvPercent = Math.round((personalLimit / expectedWinningPrice) * 100);
    const dsrLimit = (homeOwnership === 'none' && personalLimit <= 60000) ? 9999 : 0.4;
    const maxMonthlyPayment = annualIncome / 12 * Math.min(dsrLimit, 1);
    const existingMonthlyPayment = existingDebt / 12;
    const availableMonthlyPayment = maxMonthlyPayment - existingMonthlyPayment;
    const trustLimit = Math.floor(expectedWinningPrice * 0.85);
    return {
        personal: { limit: personalLimit, ltv: personalLtvPercent, rate: { min: personalRateMin, max: personalRateMax }, ltvReason, calculationMethod: baseCalculationMethod, ltvAdjustment: ltvAdjustmentReason, creditAdjustment, realCaseNote: '이는 최근 실제로 받은 견적(단위농협, 저축은행, 새마을금고 등)을 분석하여 적용한 결과입니다.' },
        trust: { limit: trustLimit, ltv: 85, rate: { min: 7.0, max: 8.5 }, reason: '사업자 신탁대출 (DSR 비규제, 방 빼기 없음)\n금융기관별·지역별·낙찰가·이자상환능력 고려하여 최종 결정', realCaseNote: '이는 최근 실제로 받은 견적을 분석하여 적용한 결과입니다.' },
        dsr: { maxMonthlyPayment: Math.floor(maxMonthlyPayment), availableMonthlyPayment: Math.floor(availableMonthlyPayment), isNonRegulated: (homeOwnership === 'none' && personalLimit <= 60000) }
    };
}

function displayResult(result, formData, approval) {
    const resultSection = document.getElementById('before-result');
    if (!resultSection) return;
    const formatNumber = (num) => num.toLocaleString('ko-KR');
    const homeOwnershipText = { 'none': '무주택', 'one': '1주택', 'multiple': '2주택 이상' };
    const regionText = { 'seoul': '서울', 'metro': '수도권', 'metro-city': '광역시', 'local': '지방' };
    const propertyTypeText = { 'apt': '아파트', 'villa': '빌라/연립', 'house': '단독주택', 'officetel': '오피스텔', 'commercial': '상가/업무시설', 'land': '토지' };
    const approvalHTML = approval ? `
        <div class="ai-approval-section">
            <h3><i class="fas fa-robot"></i> AI 대출 승인 가능성 분석 (2금융권 기준)</h3>
            <div class="approval-score ${approval.level}">
                <div class="score-circle"><span class="score-number">${approval.score}</span><span class="score-label">점</span></div>
                <div class="score-text">${approval.levelText}</div>
            </div>
            ${approval.reasons.length > 0 ? `<div class="approval-reasons"><strong>📈 긍정 요인:</strong><ul>${approval.reasons.map(r => `<li>${r}</li>`).join('')}</ul></div>` : ''}
            ${approval.warnings.length > 0 ? `<div class="approval-warnings"><strong>📉 주의 요인:</strong><ul>${approval.warnings.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
            ${approval.conditions.length > 0 ? `<div class="approval-conditions"><strong>⚠️ 조건부 승인 사항:</strong><ul>${approval.conditions.map(c => `<li>${c}</li>`).join('')}</ul></div>` : ''}
            <p class="approval-note"><i class="fas fa-info-circle"></i> <strong>분석 기준:</strong> KB 시세 대비 낙찰가, 주택 보유 현황, 신용등급, DSR 등 실제 2금융권 심사 기준 적용<br>※ 본 분석은 참고용이며, 실제 승인 여부는 금융기관 심사에 따라 달라집니다.</p>
        </div>` : '';
    const html = `
        <div class="result-header"><h2><i class="fas fa-check-circle"></i> 대출 한도 계산 완료</h2></div>
        <div class="result-summary">
            ${formData.appraisalPrice ? `<div class="summary-item"><strong>감정가격</strong><span>${formatNumber(parseInt(formData.appraisalPrice))}만원</span></div>` : ''}
            ${formData.kbPrice ? `<div class="summary-item"><strong>KB 시세</strong><span>${formatNumber(parseInt(formData.kbPrice))}만원</span></div>` : ''}
            <div class="summary-item"><strong>예상 낙찰가</strong><span>${formatNumber(parseInt(formData.expectedPrice) || 0)}만원</span></div>
            <div class="summary-item"><strong>주택 보유</strong><span>${homeOwnershipText[formData.homeOwnership] || '정보없음'}</span></div>
            <div class="summary-item"><strong>지역 분류</strong><span>${regionText[formData.region] || '정보없음'}</span></div>
            <div class="summary-item"><strong>물건 유형</strong><span>${propertyTypeText[formData.propertyType] || '정보없음'}</span></div>
        </div>
        <div class="loan-cards">
            <div class="loan-card">
                <div class="loan-card-header"><div class="loan-card-icon"><i class="fas fa-home"></i></div><h3>개인 대출</h3></div>
                <div class="loan-detail"><span class="loan-detail-label">예상 대출 한도</span><span class="loan-detail-value highlight">${formatNumber(result.personal.limit)}만원</span></div>
                <div class="loan-detail"><span class="loan-detail-label">예상 금리</span><span class="loan-detail-value">${result.personal.rate.min}% ~ ${result.personal.rate.max}%</span></div>
                ${result.dsr.isNonRegulated ? `<div class="loan-detail"><span class="loan-detail-label" style="color:#28a745;">✅ DSR 규제</span><span class="loan-detail-value" style="color:#28a745;">비규제 (6억 이하 무주택)</span></div>` : `<div class="loan-detail"><span class="loan-detail-label">DSR 고려 시</span><span class="loan-detail-value">월 ${formatNumber(result.dsr.availableMonthlyPayment)}만원 가능</span></div>`}
                <div style="background:#e8f5e9;padding:12px;border-radius:6px;margin-top:12px;border-left:4px solid #4caf50;">
                    <p style="margin:0;font-size:13px;color:#2e7d32;line-height:1.5;"><i class="fas fa-check-circle"></i> <strong>예상 대출 한도는 ${formatNumber(result.personal.limit)}만원, 금리는 ${result.personal.rate.min}~${result.personal.rate.max}%입니다.</strong><br><span style="font-size:12px;">이는 최근 실제로 받은 견적(단위농협, 저축은행, 새마을금고 등)을 분석하여 적용한 결과입니다.</span></p>
                </div>
                <div style="background:#f0f7ff;padding:15px;border-radius:8px;margin-top:15px;font-size:13px;line-height:1.6;">
                    <strong style="display:block;margin-bottom:8px;color:#0066cc;"><i class="fas fa-calculator"></i> 산출 근거 (실제 경매 대출 공식)</strong>
                    <p style="margin:5px 0;background:white;padding:8px;border-radius:4px;"><strong>• 기본 공식:</strong><br>${result.personal.calculationMethod}</p>
                    ${result.personal.ltvAdjustment ? `<p style="margin:5px 0;"><strong>• 주택 보유:</strong> ${result.personal.ltvAdjustment}</p>` : ''}
                    ${result.personal.creditAdjustment ? `<p style="margin:5px 0;"><strong>• 신용 조정:</strong> ${result.personal.creditAdjustment}</p>` : ''}
                    <p style="margin:5px 0;"><strong>• 금리:</strong> 2금융권(단위농협·저축은행·새마을금고 등) 평균 금리 ${result.personal.rate.min}~${result.personal.rate.max}%</p>
                    <p style="margin:5px 0;color:#666;font-size:12px;"><strong>💡 참고:</strong> 개인별 소득, 부채, 신용등급, 물건 위치에 따라 실제 한도와 금리는 달라질 수 있습니다.</p>
                </div>
            </div>
            <div class="loan-card">
                <div class="loan-card-header"><div class="loan-card-icon"><i class="fas fa-building"></i></div><h3>사업자 신탁대출</h3></div>
                <div class="loan-detail"><span class="loan-detail-label">예상 대출 한도</span><span class="loan-detail-value highlight">${formatNumber(result.trust.limit)}만원</span></div>
                <div class="loan-detail"><span class="loan-detail-label">예상 금리</span><span class="loan-detail-value">${result.trust.rate.min}% ~ ${result.trust.rate.max}%</span></div>
                <div class="loan-detail"><span class="loan-detail-label" style="color:#28a745;">✅ DSR 규제</span><span class="loan-detail-value" style="color:#28a745;">비규제 (사업자)</span></div>
                <div class="loan-detail"><span class="loan-detail-label" style="color:#28a745;">✅ 방 빼기</span><span class="loan-detail-value" style="color:#28a745;">불필요</span></div>
                <div class="loan-detail"><span class="loan-detail-label">신탁 등기비</span><span class="loan-detail-value">약 100~150만원</span></div>
                <div class="loan-detail"><span class="loan-detail-label">필수 조건</span><span class="loan-detail-value">사업자 등록 필요</span></div>
                <div style="background:#fff3e0;padding:12px;border-radius:6px;margin-top:12px;border-left:4px solid #ff9800;">
                    <p style="margin:0;font-size:13px;color:#e65100;line-height:1.5;"><i class="fas fa-briefcase"></i> <strong>사업자는 DSR을 고려하지 않습니다. 또한 방 빼기가 없이 대출이 나옵니다.</strong><br><span style="font-size:12px;">다만 금융기관별·지역별·낙찰가·이자상환능력을 고려하여 대출이 결정됩니다.</span></p>
                </div>
                <div style="background:#fff3f0;padding:15px;border-radius:8px;margin-top:15px;font-size:13px;line-height:1.6;">
                    <strong style="display:block;margin-bottom:8px;color:#ff6b35;"><i class="fas fa-calculator"></i> 산출 근거</strong>
                    <p style="margin:5px 0;"><strong>• 기본 공식:</strong> 낙찰가 ${formatNumber(parseInt(formData.expectedPrice))}만원 × LTV ${result.trust.ltv}% = <strong>${formatNumber(result.trust.limit)}만원</strong></p>
                    <p style="margin:5px 0;"><strong>• 금리:</strong> 사업자 신탁대출 평균 금리 ${result.trust.rate.min}~${result.trust.rate.max}%</p>
                    <p style="margin:5px 0;color:#d63031;"><strong>※ 주의:</strong> 신탁등기비용(100~150만원) 별도 발생</p>
                </div>
            </div>
        </div>
        ${approvalHTML}
        <div class="result-warning"><i class="fas fa-info-circle"></i> 실제 대출 한도와 금리는 금융기관 심사 후 확정됩니다.</div>
        <div class="result-actions">
            <button class="btn btn-secondary" onclick="saveToFavorites()"><i class="fas fa-star"></i> 이 결과 찜하기</button>
            <button class="btn btn-secondary" onclick="viewFavorites()"><i class="fas fa-list"></i> 찜한 목록 보기</button>
        </div>
        <div class="result-cta">
            <h3><i class="fas fa-phone-alt"></i> 낙찰 후 1:1 전문가 상담</h3>
            <p>낙찰 받으신 후, 전문가와 1:1 상담을 통해 정확한 대출 한도와 금리를 확인하세요.</p>
            <button class="btn btn-primary btn-large" onclick="switchToAfterTab()"><i class="fas fa-paper-plane"></i> 낙찰 후 전문가 연결 신청하기</button>
        </div>`;
    resultSection.innerHTML = html;
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

function switchToAfterTab() {
    const afterTabButton = document.querySelector('[data-tab="after"]');
    afterTabButton.click();
    document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
}

function saveCalculationToHistory(formData, result) {
    const history = loadFromLocalStorage('calculationHistory') || [];
    const calculation = { id: Date.now(), date: new Date().toISOString(), formData, result, isFavorite: false };
    history.unshift(calculation);
    if (history.length > 50) history.pop();
    saveToLocalStorage('calculationHistory', history);
    window.currentCalculationId = calculation.id;
}

function saveToFavorites() {
    if (!window.currentCalculationId) { alert('계산 결과가 없습니다.'); return; }
    const history = loadFromLocalStorage('calculationHistory') || [];
    const calculation = history.find(c => c.id === window.currentCalculationId);
    if (calculation) { calculation.isFavorite = true; saveToLocalStorage('calculationHistory', history); alert('✅ 찜 목록에 추가되었습니다!'); }
}

function viewFavorites() {
    const history = loadFromLocalStorage('calculationHistory') || [];
    const favorites = history.filter(c => c.isFavorite);
    if (favorites.length === 0) { alert('찜한 결과가 없습니다.'); return; }
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `<div class="modal-content" style="max-width:800px;"><span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span><h2><i class="fas fa-star"></i> 찜한 계산 결과</h2><div class="favorites-list">${favorites.map(fav => { const date = new Date(fav.date); const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`; return `<div class="favorite-item"><div class="favorite-header"><strong>${fav.formData.propertyType||'물건'} - ${parseInt(fav.formData.expectedPrice).toLocaleString()}만원</strong><span class="favorite-date">${dateStr}</span></div><div class="favorite-details"><span>개인 한도: ${fav.result.personal.limit.toLocaleString()}만원</span><span>LTV: ${fav.result.personal.ltv}%</span><span>금리: ${fav.result.personal.rate.min}~${fav.result.personal.rate.max}%</span></div><button class="btn btn-sm" onclick="removeFavorite(${fav.id})"><i class="fas fa-trash"></i> 삭제</button></div>`; }).join('')}</div></div>`;
    document.body.appendChild(modal);
}

function removeFavorite(id) {
    const history = loadFromLocalStorage('calculationHistory') || [];
    const calculation = history.find(c => c.id === id);
    if (calculation) { calculation.isFavorite = false; saveToLocalStorage('calculationHistory', history); document.querySelector('.modal').remove(); viewFavorites(); }
}

function showHelp(topic) {
    const helpContent = {
        'credit-score': { title: '💡 신용점수란?', content: `<p><strong>신용점수</strong>는 개인의 신용 상태를 숫자로 나타낸 것입니다.</p><br><p><strong>확인 방법:</strong></p><ul><li>카카오톡 앱 → 전체 서비스 → 신용점수</li><li>NICE 신용평가, 올크레딧 앱</li><li>은행 앱 (무료 조회 가능)</li></ul><br><p><strong>점수별 영향:</strong></p><ul><li>900점 이상: LTV 최대, 최저 금리</li><li>800~899점: LTV 정상, 우대 금리</li><li>700~799점: LTV 정상, 일반 금리</li><li>700점 미만: LTV 감소, 금리 상승</li></ul><br><a href="https://m.score.kakao.com/" target="_blank" class="btn btn-primary"><i class="fas fa-comment"></i> 카카오톡에서 확인하기</a>` }
    };
    const help = helpContent[topic];
    if (!help) return;
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `<div class="modal-content" style="max-width:600px;"><span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span><h2>${help.title}</h2><div class="help-content">${help.content}</div></div>`;
    document.body.appendChild(modal);
}

async function handleAfterFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    if (!document.getElementById('privacy-agree').checked) { alert('개인정보 수집 및 이용에 동의해주세요.'); return; }
    const inquiryData = { case_number: data.caseNumber||'', appraisal_value: parseInt(data.appraisalValue)*10000, kb_price: data.kbPrice?parseInt(data.kbPrice)*10000:null, expected_winning_price: parseInt(data.expectedPrice)*10000, home_ownership: data.homeOwnership, region: data.region, property_type: data.propertyType, annual_income: parseInt(data.annualIncome)*10000, existing_debt: parseInt(data.existingDebt)*10000, credit_score: data.creditScore, name: data.name, phone: data.phone, email: data.email||'', status: 'pending', assigned_to: 'unassigned', source: 'website', created_at: Date.now() };
    try {
        const response = await fetch('tables/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inquiryData) });
        if (response.ok) { showSuccessModal(); e.target.reset(); }
        else { alert('신청 중 오류가 발생했습니다. 다시 시도해주세요.'); }
    } catch (error) { console.error('Error:', error); alert('신청 중 오류가 발생했습니다. 다시 시도해주세요.'); }
}

function showSuccessModal() { const modal = document.getElementById('success-modal'); if (modal) modal.classList.add('show'); }
function closeModal() { const modal = document.getElementById('success-modal'); if (modal) modal.classList.remove('show'); }

async function loadConsultants() {
    try {
        const response = await fetch('tables/consultants?limit=100');
        const data = await response.json();
        if (data.data && data.data.length > 0) displayConsultants(data.data.filter(c => c.is_active));
        else displayDefaultConsultants();
    } catch (error) { displayDefaultConsultants(); }
}

function displayConsultants(consultants) {
    const container = document.getElementById('consultants-grid');
    if (!container) return;
    const html = consultants.map(consultant => `<div class="consultant-card"><div class="consultant-avatar"><i class="fas fa-user-tie"></i></div><h3 class="consultant-name">${consultant.name}</h3><div class="consultant-rating">${'⭐'.repeat(Math.floor(consultant.rating||5))}</div><p class="consultant-specialty">${consultant.specialty||'경매 대출 전문'}</p><div class="consultant-stats"><div class="consultant-stat"><span class="consultant-stat-value">${consultant.total_consultations||0}</span><span class="consultant-stat-label">상담</span></div><div class="consultant-stat"><span class="consultant-stat-value">${consultant.total_contracts||0}</span><span class="consultant-stat-label">계약</span></div><div class="consultant-stat"><span class="consultant-stat-value">${Math.floor((consultant.total_contracts/Math.max(consultant.total_consultations,1))*100)||0}%</span><span class="consultant-stat-label">성공률</span></div></div>${consultant.reviews?`<div class="consultant-reviews">"${consultant.reviews}"</div>`:''}<button class="btn btn-primary btn-block" onclick="contactConsultant('${consultant.phone}')"><i class="fas fa-phone"></i> 연락하기</button></div>`).join('');
    container.innerHTML = html;
}

function displayDefaultConsultants() {
    displayConsultants([{ name: '김대출 상담사', rating: 5, specialty: '아파트 경매 대출 전문', total_consultations: 150, total_contracts: 120, reviews: '친절하고 빠른 대출 진행으로 만족스러웠습니다.', phone: '010-1234-5678' }, { name: '박금융 상담사', rating: 5, specialty: '상가·오피스텔 대출 전문', total_consultations: 200, total_contracts: 180, reviews: '복잡한 상가 대출도 깔끔하게 처리해주셨어요.', phone: '010-2345-6789' }]);
}

function contactConsultant(phone) { alert(`상담사에게 연락하시려면 ${phone}로 전화해주세요.\n\n"대장TV 경매톡 플랫폼"을 통해 연락했다고 말씀해주시면 더욱 빠른 상담이 가능합니다.`); }
