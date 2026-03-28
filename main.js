// Scroll to Calculator
function scrollToCalculator() {
    document.getElementById('calculator').scrollIntoView({ behavior: 'smooth' });
}

function toggleKakaoGuide() {
    const guide = document.getElementById('kakao-guide');
    const chevron = document.getElementById('kakao-chevron');
    if (guide.style.display === 'none') {
        guide.style.display = 'block';
        if (chevron) chevron.className = 'fas fa-chevron-up';
    } else {
        guide.style.display = 'none';
        if (chevron) chevron.className = 'fas fa-chevron-down';
    }
}

function togglePrivacy() {
    const detail = document.getElementById('privacy-detail');
    const text = document.getElementById('privacy-toggle-text');
    if (detail.style.display === 'none') {
        detail.style.display = 'block';
        text.textContent = '▼ 약관 접기';
    } else {
        detail.style.display = 'none';
        text.textContent = '▶ 약관 전체 보기';
    }
}

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
        addr.includes('김포') || addr.includes('의정부') || addr.includes('하남') ||
        addr.includes('오산') || addr.includes('양주') || addr.includes('구리') || addr.includes('화성')) {
        return { code: 'metro', name: '수도권 (경기/인천)', isRegulated: true };
    }
    if (addr.includes('부산') || addr.includes('대구') || addr.includes('광주광역') || addr.includes('대전') ||
        addr.includes('울산') || addr.includes('세종')) {
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
    if (formData.annualIncome && formData.existingDebt) {
        const income = parseInt(formData.annualIncome);
        const debt = parseInt(formData.existingDebt);
        if (income > 0) {
            const dsrRatio = (debt / income) * 100;
            if (dsrRatio > 40) warnings.push({ type: 'warning', message: '💡 기존 부채 비율이 높습니다.', detail: `현재 DSR ${dsrRatio.toFixed(1)}% (기준: 40% 이하) - 개인 대출 한도에 영향이 있을 수 있습니다.` });
            else if (dsrRatio > 35) warnings.push({ type: 'info', message: '💡 DSR이 높은 편입니다.', detail: `현재 DSR ${dsrRatio.toFixed(1)}% (여유분 ${(40 - dsrRatio).toFixed(1)}%)` });
        }
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
    if (progressBar) progressBar.style.width = `${progress}%`;
    if (progressText) {
        if (Math.round(progress) >= 100) progressText.textContent = '';
        else if (progress > 0) progressText.textContent = `${Math.round(progress)}%`;
        else progressText.textContent = '';
    }
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

function setupPhoneAutoHyphen(inputId) {
    const input = document.getElementById(inputId);
    if (!input) return;
    input.addEventListener('input', function() {
        let value = this.value.replace(/[^0-9]/g, '');
        if (value.startsWith('02')) {
            if (value.length <= 2) this.value = value;
            else if (value.length <= 6) this.value = value.slice(0,2)+'-'+value.slice(2);
            else if (value.length <= 10) this.value = value.slice(0,2)+'-'+value.slice(2,6)+'-'+value.slice(6);
            else this.value = value.slice(0,2)+'-'+value.slice(2,6)+'-'+value.slice(6,10);
        } else {
            if (value.length <= 3) this.value = value;
            else if (value.length <= 7) this.value = value.slice(0,3)+'-'+value.slice(3);
            else if (value.length <= 11) this.value = value.slice(0,3)+'-'+value.slice(3,7)+'-'+value.slice(7);
            else this.value = value.slice(0,3)+'-'+value.slice(3,7)+'-'+value.slice(7,11);
        }
    });
}

function setupExpectedPriceOnly() {
    const expectedInput = document.getElementById('before-expected-price');
    if (!expectedInput) return;
    expectedInput.addEventListener('input', function() {
        saveFormData(); updateProgress();
        const value = this.value;
        const display = document.getElementById('before-expected-display');
        if (display) {
            if (value) { display.textContent = `💰 ${formatKoreanWon(value)}`; display.style.display = 'block'; }
            else { display.style.display = 'none'; }
        }
    });
}

function saveFormData() {
    const form = document.getElementById('before-form');
    if (!form) return;
    const inputs = form.querySelectorAll('input, select');
    const data = {};
    inputs.forEach(input => { if (input.name) data[input.name] = input.value; });
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
            const displayMap = {
                'appraisalPrice': 'before-appraisal-display',
                'kbPrice': 'before-kb-display',
                'expectedPrice': 'before-expected-display',
                'annualIncome': 'before-income-display',
                'existingDebt': 'before-debt-display'
            };
            if (displayMap[key]) {
                const display = document.getElementById(displayMap[key]);
                if (display && saved.data[key]) {
                    display.textContent = `💰 ${formatKoreanWon(saved.data[key])}`;
                    display.style.display = 'block';
                }
            }
        }
    });
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
    // loadConsultants(); // 전문가 섹션 비활성화
    loadFormData();
    updateProgress();
    updateMoneyDisplay('before-appraisal-price', 'before-appraisal-display');
    updateMoneyDisplay('before-kb-price', 'before-kb-display');
    updateMoneyDisplay('before-annual-income', 'before-income-display');
    updateMoneyDisplay('before-existing-debt', 'before-debt-display');
    updateMoneyDisplay('after-appraisal-value', 'after-appraisal-display');
    updateMoneyDisplay('after-kb-price', 'after-kb-display');
    updateMoneyDisplay('after-expected-price', 'after-expected-display');
    updateMoneyDisplay('after-annual-income', 'after-income-display');
    updateMoneyDisplay('after-existing-debt', 'after-debt-display');
    updateMoneyDisplay('before-expected-price', 'before-expected-display');
    setupExpectedPriceOnly();
    handleAddressInput('before-address', 'before-region', 'before-address-result', 'before-address-region-text');

    const regionSelect = document.getElementById('before-region');
    const regulatedGroup = document.getElementById('before-regulated-zone-group');
    const regulatedSelect = document.getElementById('before-regulated-zone');
    function updateRegulatedZoneVisibility() {
        const val = regionSelect ? regionSelect.value : '';
        if (regulatedGroup) {
            if (val === 'metro') { regulatedGroup.style.display = 'block'; if (regulatedSelect) regulatedSelect.disabled = false; }
            else if (val === 'seoul') { regulatedGroup.style.display = 'block'; if (regulatedSelect) { regulatedSelect.value = 'regulated'; regulatedSelect.disabled = true; } }
            else { regulatedGroup.style.display = 'none'; }
        }
    }
    if (regionSelect) regionSelect.addEventListener('change', updateRegulatedZoneVisibility);
    updateRegulatedZoneVisibility();
    setupPhoneAutoHyphen('after-phone');

    const form = document.getElementById('before-form');
    if (form) {
        form.querySelectorAll('select').forEach(sel => {
            sel.addEventListener('change', function() { saveFormData(); updateProgress(); });
        });
        form.addEventListener('submit', handleBeforeFormSubmit);
    }
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
    const form = e.target;
    const inputs = form.querySelectorAll('input, select');
    const data = {};
    inputs.forEach(input => { if (input.name) data[input.name] = input.value; });
    const warnings = validateInputs(data);
    showWarnings(warnings, 'validation-warnings');
    const expectedWinningPrice = parseInt(data.expectedPrice) || 0;
    const appraisalPrice = parseInt(data.appraisalPrice) || 0;
    const kbPrice = parseInt(data.kbPrice) || 0;
    const annualIncome = parseInt(data.annualIncome) || 0;
    const existingDebt = parseInt(data.existingDebt) || 0;
    if (!expectedWinningPrice) { alert('예상 낙찰가를 입력해주세요.'); return; }
    if (!data.propertyType) { alert('물건 유형을 선택해주세요.'); return; }
    if (!data.region) { alert('지역을 선택해주세요.'); return; }
    if (!data.homeOwnership) { alert('주택 보유 여부를 선택해주세요.'); return; }
    const isRegulatedInput = form.querySelector('[name="isRegulated"]');
    const isRegulated = isRegulatedInput ? (isRegulatedInput.value !== 'non-regulated') : true;
    const result = calculateLoan({ expectedWinningPrice, appraisalPrice, kbPrice, homeOwnership: data.homeOwnership, region: data.region, propertyType: data.propertyType, annualIncome, existingDebt, creditScore: data.creditScore, isRegulated });
    displayResult(result, data);
    saveCalculationToHistory(data, result);
}

function calculateLoan(params) {
    const { expectedWinningPrice, appraisalPrice, kbPrice, homeOwnership, region, propertyType, annualIncome, existingDebt, creditScore, isRegulated } = params;
    const fixedRateMin = 4.2, fixedRateMax = 4.5, stressRatePct = fixedRateMin + 3;
    const isResidential = ['apt', 'villa', 'house', 'officetel'].includes(propertyType);
    const isSudo = region === 'seoul' || region === 'metro';
    const isLocal = region === 'local' || region === 'metro-city';
    const regulatedZone = region === 'seoul' ? true : (isRegulated !== false);
    let finalLimit = 0, calculationMethod = '', ltvReason = '', ltvAdjustmentReason = '';
    let appraisalLtvUsed = 0, winningLtvUsed = 80, isBanned = false, banReason = '';
    let trustSuspended = false, trustSuspensionReason = '', conditions = [], capApplied = false, capLimit = Infinity;
    const refVal = appraisalPrice > 0 ? appraisalPrice : 0;
    const fmt = n => n.toLocaleString('ko-KR');

    if (isSudo) {
        if (homeOwnership === 'multiple') {
            isBanned = true; banReason = '수도권 2주택 이상은 개인 주택담보대출이 중지되었습니다.';
            if (region === 'seoul') { trustSuspended = true; trustSuspensionReason = '기준일 2026년 3월 25일 기준, 서울 2주택 이상 사업자 대출은 상품 변경 및 정책 혼선 가능성으로 잠시 중지되었습니다. 단, 금융사마다 상품이 변경될 수 있으니 추가 궁금한 사항은 전화 상담 바랍니다.'; }
        } else {
            if (homeOwnership === 'first') { appraisalLtvUsed = 70; ltvReason = '생애최초 (수도권 LTV 70%)'; ltvAdjustmentReason = '수도권 생애최초: 규제/비규제 무관 LTV 70% | 낙찰가 80% 한도'; conditions = ['6개월 내 전입 필요']; }
            else if (homeOwnership === 'none') { appraisalLtvUsed = regulatedZone ? 40 : 70; ltvReason = regulatedZone ? '무주택 (수도권 규제지역 LTV 40%)' : '무주택 (수도권 비규제지역 LTV 70%)'; ltvAdjustmentReason = regulatedZone ? '규제지역: 감정가 40%, 낙찰가 80% 중 낮은 금액' : '비규제지역: 감정가 70%, 낙찰가 80% 중 낮은 금액'; conditions = ['6개월 내 전입 필요']; }
            else { appraisalLtvUsed = regulatedZone ? 40 : 70; ltvReason = regulatedZone ? '1주택 (수도권 규제지역 LTV 40%)' : '1주택 (수도권 비규제지역 LTV 70%)'; ltvAdjustmentReason = regulatedZone ? '규제지역: 감정가 40%, 낙찰가 80% 중 낮은 금액' : '비규제지역: 감정가 70%, 낙찰가 80% 중 낮은 금액'; conditions = ['6개월 내 전입 필요', '기존 주택 처분 조건']; }
            const byAppraisal = refVal > 0 ? Math.floor(refVal * appraisalLtvUsed / 100) : 0;
            const byWinning = Math.floor(expectedWinningPrice * 80 / 100);
            if (refVal > 0) { finalLimit = Math.min(byAppraisal, byWinning); const lowerLabel = byAppraisal <= byWinning ? `감정가 기준(${appraisalLtvUsed}%) → ${fmt(byAppraisal)}만원` : `낙찰가 기준(80%) → ${fmt(byWinning)}만원`; calculationMethod = `감정가 ${fmt(refVal)}만원 × ${appraisalLtvUsed}% = ${fmt(byAppraisal)}만원\n낙찰가 ${fmt(expectedWinningPrice)}만원 × 80% = ${fmt(byWinning)}만원\n→ 낮은 금액 적용: ${lowerLabel}`; }
            else { finalLimit = byWinning; calculationMethod = `낙찰가 ${fmt(expectedWinningPrice)}만원 × 80% = ${fmt(byWinning)}만원\n(감정가 미입력 — 감정가 입력 시 더 정확한 계산 가능)`; }
            const capBase = refVal > 0 ? refVal : expectedWinningPrice;
            if (capBase <= 150000) capLimit = 60000; else if (capBase <= 250000) capLimit = 40000; else capLimit = 20000;
            if (finalLimit > capLimit) { finalLimit = capLimit; capApplied = true; calculationMethod += `\n→ 수도권 대출 상한 ${fmt(capLimit)}만원 적용 (감정가 ${capBase <= 150000 ? '15억 이하' : capBase <= 250000 ? '15~25억' : '25억 초과'} 구간)`; }
            if (annualIncome > 0) {
                const maxAnnual = annualIncome * 0.4 - (existingDebt || 0);
                if (maxAnnual > 0) { const r = stressRatePct/100/12, n = 25*12, amort = r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1), dsrMax = Math.floor((maxAnnual/12)/amort); if (dsrMax < finalLimit) { finalLimit = dsrMax; calculationMethod += `\n→ 스트레스 DSR (심사금리 ${stressRatePct}%) 적용: ${fmt(dsrMax)}만원으로 조정`; } }
                else { finalLimit = 0; calculationMethod += '\n→ 기존 부채로 인해 DSR 한도 초과 (대출 불가)'; }
            }
        }
    } else {
        winningLtvUsed = 80;
        if (homeOwnership === 'first') {
            appraisalLtvUsed = 80; ltvReason = '생애최초 (지방 감정가·낙찰가 80%)'; ltvAdjustmentReason = '지방 생애최초: 감정가 80%, 낙찰가 80% 중 낮은 금액';
            const byAppraisal = refVal > 0 ? Math.floor(refVal * 80 / 100) : 0, byWinning = Math.floor(expectedWinningPrice * 80 / 100);
            if (refVal > 0) { finalLimit = Math.min(byAppraisal, byWinning); calculationMethod = `감정가 ${fmt(refVal)}만원 × 80% = ${fmt(byAppraisal)}만원\n낙찰가 ${fmt(expectedWinningPrice)}만원 × 80% = ${fmt(byWinning)}만원\n→ 낮은 금액 적용: ${fmt(finalLimit)}만원`; }
            else { finalLimit = byWinning; calculationMethod = `낙찰가 ${fmt(expectedWinningPrice)}만원 × 80% = ${fmt(byWinning)}만원\n(감정가 미입력)`; }
        } else {
            appraisalLtvUsed = 70; const ownerMap = { none: '무주택', one: '1주택', multiple: '2주택 이상' }; ltvReason = `${ownerMap[homeOwnership]||'1주택이상'} (지방 감정가70%·낙찰가80%)`; ltvAdjustmentReason = '지방 1주택이상: 감정가 70%, 낙찰가 80% 중 낮은 금액';
            const byAppraisal = refVal > 0 ? Math.floor(refVal * 70 / 100) : 0, byWinning = Math.floor(expectedWinningPrice * 80 / 100);
            if (refVal > 0) { finalLimit = Math.min(byAppraisal, byWinning); const lowerLabel = byAppraisal <= byWinning ? `감정가 기준(70%) → ${fmt(byAppraisal)}만원` : `낙찰가 기준(80%) → ${fmt(byWinning)}만원`; calculationMethod = `감정가 ${fmt(refVal)}만원 × 70% = ${fmt(byAppraisal)}만원\n낙찰가 ${fmt(expectedWinningPrice)}만원 × 80% = ${fmt(byWinning)}만원\n→ 낮은 금액 적용: ${lowerLabel}`; }
            else { finalLimit = byWinning; calculationMethod = `낙찰가 ${fmt(expectedWinningPrice)}만원 × 80% = ${fmt(byWinning)}만원\n(감정가 미입력)`; }
        }
        if (annualIncome > 0) {
            const maxAnnual = annualIncome * 0.4 - (existingDebt || 0);
            if (maxAnnual > 0) { const r = stressRatePct/100/12, n = 25*12, amort = r*Math.pow(1+r,n)/(Math.pow(1+r,n)-1), dsrMax = Math.floor((maxAnnual/12)/amort); if (dsrMax < finalLimit) { finalLimit = dsrMax; calculationMethod += `\n→ 스트레스 DSR (심사금리 ${stressRatePct}%) 적용: ${fmt(dsrMax)}만원으로 조정`; } }
            else { finalLimit = 0; calculationMethod += '\n→ 기존 부채로 인해 DSR 한도 초과 (대출 불가)'; }
        }
    }

    if (finalLimit < 0) finalLimit = 0;
    const personalLtvPercent = expectedWinningPrice > 0 ? Math.round((finalLimit / expectedWinningPrice) * 100) : 0;
    const trustLtvRate = isResidential ? 0.80 : 0.90, trustLtvPercent = isResidential ? 80 : 90;
    const trustLimit = Math.floor(expectedWinningPrice * trustLtvRate);
    const personalMonthlyInterest = Math.floor(finalLimit * (fixedRateMin / 100) / 12);
    const trustMonthlyInterest = Math.floor(trustLimit * (4.5 / 100) / 12);
    const maxMonthlyPayment = annualIncome > 0 ? annualIncome / 12 * 0.4 : 0;
    const existingMonthlyPayment = (existingDebt || 0) / 12;
    const availableMonthlyPayment = Math.max(0, maxMonthlyPayment - existingMonthlyPayment);

    return {
        personal: { limit: finalLimit, ltv: personalLtvPercent, appraisalLtvUsed, winningLtvUsed, rate: { min: fixedRateMin, max: fixedRateMax }, monthlyInterest: personalMonthlyInterest, ltvReason, calculationMethod, ltvAdjustment: ltvAdjustmentReason, isLocal, isSudo, isBanned, banReason, conditions, capApplied, capLimit, stressRatePct, regulatedZone },
        trust: { limit: trustLimit, ltv: trustLtvPercent, rate: { min: 4.5, max: 5.5 }, monthlyInterest: trustMonthlyInterest, isResidential, isSuspended: trustSuspended, suspensionReason: trustSuspensionReason, reason: `사업자 신탁대출 (DSR 비규제, 방 빼기 없음) - ${isResidential ? '주택 80%' : '비주택 90%'}` },
        dsr: { maxMonthlyPayment: Math.floor(maxMonthlyPayment), availableMonthlyPayment: Math.floor(availableMonthlyPayment), stressRatePct }
    };
}

function buildTrustCard(result, fmt) {
    const expertCommentTrust = `사업자 대출은 개인과 달리 <strong>DSR 규제 없이</strong> 대출이 가능하며, 방 빼기 절차 없이 바로 실행 가능합니다.<br>${result.trust.isResidential ? '주택 기준 낙찰가의 <strong>최대 80%</strong>' : '비주택(상가/건물) 기준 낙찰가의 <strong>최대 90%</strong>'}까지 대출 가능하며,<br>예상 대출 한도는 최대 <strong>${fmt(result.trust.limit)}만원</strong>이고,<br>월 이자는 약 <strong>${fmt(result.trust.monthlyInterest)}만원</strong>입니다. <span style="color:#888;font-size:12px;">(금리 4.5% 기준)</span><br><small style="color:#999;">※ 사업자 등록 필요 · 신탁 등기비 약 100~150만원</small>`;
    return `<div class="loan-card"><div class="loan-card-header"><div class="loan-card-icon"><i class="fas fa-building"></i></div><h3>사업자 신탁대출</h3></div><div class="loan-detail"><span class="loan-detail-label">예상 대출 한도</span><span class="loan-detail-value highlight">${fmt(result.trust.limit)}만원</span></div><div class="loan-detail"><span class="loan-detail-label">LTV</span><span class="loan-detail-value">${result.trust.ltv}% (낙찰가 기준)</span></div><div class="loan-detail"><span class="loan-detail-label">예상 금리</span><span class="loan-detail-value">${result.trust.rate.min}% ~ ${result.trust.rate.max}%</span></div><div class="loan-detail"><span class="loan-detail-label">월 예상 이자</span><span class="loan-detail-value" style="color:#e65100;font-weight:700;">약 ${fmt(result.trust.monthlyInterest)}만원</span></div><div class="loan-detail"><span class="loan-detail-label" style="color:#28a745;">✅ DSR 규제</span><span class="loan-detail-value" style="color:#28a745;">비규제</span></div><div class="loan-detail"><span class="loan-detail-label" style="color:#28a745;">✅ 방 빼기</span><span class="loan-detail-value" style="color:#28a745;">불필요</span></div><div class="loan-detail"><span class="loan-detail-label">신탁 등기비</span><span class="loan-detail-value">약 100~150만원</span></div><div class="loan-detail"><span class="loan-detail-label">필수 조건</span><span class="loan-detail-value">사업자 등록 필요</span></div><div class="expert-comment" style="margin-top:15px;"><div class="expert-comment-title"><i class="fas fa-user-tie"></i> 전문가 코멘트</div><p>${expertCommentTrust}</p></div></div>`;
}

function buildTrustSuspendedCard(result) {
    return `<div class="loan-card" style="border:2px solid #ef9a9a; background:#fff8f8;"><div class="loan-card-header"><div class="loan-card-icon" style="background:#c62828;"><i class="fas fa-pause-circle"></i></div><h3>사업자 대출 중지</h3></div><div style="background:#fff3f3;border:1px solid #ef9a9a;border-radius:8px;padding:14px;margin-top:10px;font-size:14px;line-height:1.8;color:#7f1d1d;"><p><strong>⚠️ ${result.trust.suspensionReason || '현재 사업자 대출은 잠시 중지되었습니다.'}</strong></p><p style="margin-top:8px;">단, 금융사마다 상품이 변경될 수 있으니 추가 궁금한 사항은 전화 상담 바랍니다.</p></div></div>`;
}

function displayResult(result, formData) {
    const resultSection = document.getElementById('before-result');
    if (!resultSection) return;
    const fmt = (num) => num.toLocaleString('ko-KR');
    const homeText = { 'first': '생애최초', 'none': '무주택', 'one': '1주택', 'multiple': '2주택 이상' };
    const regionText = { 'seoul': '서울', 'metro': '수도권(경기/인천)', 'metro-city': '광역시', 'local': '지방' };
    const propText = { 'apt': '아파트', 'villa': '빌라/연립', 'house': '단독주택', 'officetel': '오피스텔', 'commercial': '상가/업무시설', 'land': '토지' };

    if (result.personal.isBanned) {
        const trustCard = result.trust.isSuspended ? buildTrustSuspendedCard(result) : buildTrustCard(result, fmt);
        const subMessage = result.trust.isSuspended ? `<p><strong>사업자 대출도 현재는 잠시 중지</strong> 상태입니다.</p><p style="margin-top:6px; color:#666;">단, 금융사마다 상품이 변경될 수 있으니 추가 궁금한 사항은 전화 상담 바랍니다.</p>` : `<p>단, <strong>사업자 신탁대출</strong>은 가능합니다. 아래 사업자 대출 한도를 확인하세요.</p>`;
        resultSection.innerHTML = `<div class="result-header" style="background:linear-gradient(135deg,#c62828,#e53935);"><h2><i class="fas fa-ban"></i> 개인 대출 중지</h2></div><div style="background:#fff3f3;border:1px solid #ef9a9a;border-radius:8px;padding:16px;margin:16px 0;font-size:14px;line-height:1.8;"><p><strong>⚠️ ${result.personal.banReason}</strong></p>${subMessage}</div><div class="loan-cards">${trustCard}</div><div class="result-cta"><h3><i class="fas fa-phone-alt"></i> 전문가 상담</h3><button class="btn btn-primary btn-large" onclick="switchToAfterTab()"><i class="fas fa-paper-plane"></i> 대출 문의 신청하기</button></div>`;
        resultSection.style.display = 'block';
        resultSection.scrollIntoView({ behavior: 'smooth' });
        return;
    }

    const conditionBanner = result.personal.conditions && result.personal.conditions.length > 0 ? `<div style="background:#fff8e1;border-left:4px solid #ffc107;padding:10px 14px;border-radius:6px;margin-top:10px;font-size:13px;color:#795548;"><strong>📋 대출 조건:</strong> ${result.personal.conditions.join(' · ')}</div>` : '';
    const capBanner = result.personal.capApplied ? `<div style="background:#e8eaf6;border-left:4px solid #5c6bc0;padding:10px 14px;border-radius:6px;margin-top:8px;font-size:13px;color:#283593;"><strong>🔒 수도권 한도 상한 적용:</strong> 최대 <strong>${fmt(result.personal.capLimit)}만원</strong>으로 제한됨</div>` : '';
    const localNote = result.personal.isLocal ? `<div style="background:#e8f5e9;padding:12px;border-radius:6px;margin-top:10px;border-left:4px solid #4caf50;font-size:13px;color:#2e7d32;"><i class="fas fa-info-circle"></i> <strong>지방 기준 적용</strong><br>생애최초: 감정가·낙찰가 80% 중 낮은 금액 / 그 외: 감정가 70%·낙찰가 80% 중 낮은 금액</div>` : '';
    const dsrNote = `<div style="background:#fafafa;border:1px solid #e0e0e0;border-radius:6px;padding:8px 12px;margin-top:8px;font-size:12px;color:#666;"><i class="fas fa-calculator"></i> 스트레스 DSR 적용 (심사금리 ${result.personal.stressRatePct}% = 고정금리 ${result.personal.rate.min}% + 가산 3%)</div>`;
    const appraisalLtv = result.personal.appraisalLtvUsed, winningLtv = result.personal.winningLtvUsed;
    const expertCommentPersonal = appraisalLtv > 0 ? `감정가 대비 <strong>${appraisalLtv}%</strong> · 낙찰가 대비 <strong>${winningLtv}%</strong> 중 낮은 금액이 대출 승인 기준이 되며,<br>예상 대출 한도는 최대 <strong>${fmt(result.personal.limit)}만원</strong>이고,<br>월 이자는 약 <strong>${fmt(result.personal.monthlyInterest)}만원</strong>입니다. <span style="color:#888;font-size:12px;">(고정금리 ${result.personal.rate.min}% 기준)</span>` : `낙찰가 대비 <strong>${winningLtv}%</strong> 기준으로 대출 승인이 되며,<br>예상 대출 한도는 최대 <strong>${fmt(result.personal.limit)}만원</strong>이고,<br>월 이자는 약 <strong>${fmt(result.personal.monthlyInterest)}만원</strong>입니다. <span style="color:#888;font-size:12px;">(고정금리 ${result.personal.rate.min}% 기준)</span>`;

    const html = `<div class="result-header"><h2><i class="fas fa-check-circle"></i> 대출 한도 계산 완료</h2></div>
        <div class="result-summary">
            ${formData.appraisalPrice ? `<div class="summary-item"><strong>감정가격</strong><span>${fmt(parseInt(formData.appraisalPrice))}만원</span></div>` : ''}
            ${formData.kbPrice ? `<div class="summary-item"><strong>KB 시세 (참고)</strong><span>${fmt(parseInt(formData.kbPrice))}만원</span></div>` : ''}
            <div class="summary-item"><strong>예상 낙찰가</strong><span>${fmt(parseInt(formData.expectedPrice)||0)}만원</span></div>
            <div class="summary-item"><strong>주택 보유</strong><span>${homeText[formData.homeOwnership]||'-'}</span></div>
            <div class="summary-item"><strong>지역</strong><span>${regionText[formData.region]||'-'}${result.personal.isSudo ? (result.personal.regulatedZone ? ' (규제지역)' : ' (비규제지역)') : ''}</span></div>
            <div class="summary-item"><strong>물건 유형</strong><span>${propText[formData.propertyType]||'-'}</span></div>
        </div>
        <div class="loan-cards">
            <div class="loan-card">
                <div class="loan-card-header"><div class="loan-card-icon"><i class="fas fa-home"></i></div><h3>개인 대출 예상 한도</h3></div>
                <div class="loan-detail"><span class="loan-detail-label">예상 대출 한도</span><span class="loan-detail-value highlight">${fmt(result.personal.limit)}만원</span></div>
                <div class="loan-detail"><span class="loan-detail-label">낙찰가 대비 LTV</span><span class="loan-detail-value">${result.personal.ltv}%</span></div>
                <div class="loan-detail"><span class="loan-detail-label">고정 금리</span><span class="loan-detail-value">${result.personal.rate.min}% ~ ${result.personal.rate.max}%</span></div>
                <div class="loan-detail"><span class="loan-detail-label">월 예상 이자</span><span class="loan-detail-value" style="color:#e65100;font-weight:700;">약 ${fmt(result.personal.monthlyInterest)}만원</span></div>
                ${formData.annualIncome ? `<div class="loan-detail"><span class="loan-detail-label">DSR 고려 시 월 상환 가능</span><span class="loan-detail-value">월 ${fmt(result.dsr.availableMonthlyPayment)}만원</span></div>` : ''}
                ${conditionBanner}${capBanner}${localNote}${dsrNote}
                <div style="background:#f0f7ff;padding:15px;border-radius:8px;margin-top:15px;font-size:13px;line-height:1.8;">
                    <strong style="display:block;margin-bottom:8px;color:#0066cc;"><i class="fas fa-calculator"></i> 산출 근거</strong>
                    <p style="margin:5px 0;white-space:pre-line;">${result.personal.calculationMethod}</p>
                    ${result.personal.ltvAdjustment ? `<p style="margin:5px 0;"><strong>주의:</strong> ${result.personal.ltvAdjustment}</p>` : ''}
                    <p style="margin:5px 0;color:#666;font-size:12px;">※ 실제 금리 및 한도는 금융기관 심사에 따라 달라질 수 있습니다.</p>
                </div>
                <div class="expert-comment"><div class="expert-comment-title"><i class="fas fa-user-tie"></i> 전문가 코멘트</div><p>${expertCommentPersonal}</p></div>
            </div>
            ${buildTrustCard(result, fmt)}
        </div>
        <div class="platform-disclaimer"><i class="fas fa-shield-alt"></i><div><strong>⚖️ 법적 고지 및 플랫폼 안내</strong><br>본 플랫폼(경매톡)은 대출을 직접 실행하거나 중개 수수료를 수취하는 대출 중개업자가 아닙니다.<br>경매톡은 경매 대출 정보 제공 및 전문가 연결을 위한 플랫폼 서비스이며, 어떠한 수수료도 요구하지 않습니다.<br>최종 대출 조건 및 승인은 금융기관의 심사 결과에 따라 결정됩니다.</div></div>
        <div class="result-warning"><i class="fas fa-info-circle"></i> 본 계산 결과는 예상치이며, 실제 대출 한도와 금리는 금융기관 심사 후 확정됩니다.</div>
        <div class="result-actions">
            <button class="btn btn-secondary" onclick="saveToFavorites()"><i class="fas fa-star"></i> 이 결과 찜하기</button>
            <button class="btn btn-secondary" onclick="viewFavorites()"><i class="fas fa-list"></i> 찜한 목록 보기</button>
        </div>
        <div class="result-cta"><h3><i class="fas fa-phone-alt"></i> 낙찰 후 1:1 전문가 상담</h3><p>낙찰 받으신 후, 전문가와 1:1 상담을 통해 정확한 대출 한도와 금리를 확인하세요.</p><button class="btn btn-primary btn-large" onclick="switchToAfterTab()"><i class="fas fa-paper-plane"></i> 대출 문의 신청하기</button></div>`;
    resultSection.innerHTML = html;
    resultSection.style.display = 'block';
    resultSection.scrollIntoView({ behavior: 'smooth' });
}

function switchToAfterTab() {
    const afterTabButton = document.querySelector('[data-tab="after"]');
    if (afterTabButton) afterTabButton.click();
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
    const helpContent = { 'credit-score': { title: '💡 신용점수란?', content: `<p>신용점수는 개인의 신용 상태를 숫자로 나타낸 것입니다.</p><br><p><strong>무료 확인 방법:</strong></p><ul><li>카카오톡 앱 → 더보기(···) → 카카오페이 → 내 신용점수</li><li>NICE 신용평가, 올크레딧 앱 이용</li></ul><br><a href="https://m.score.kakao.com/" target="_blank" class="btn btn-primary"><i class="fas fa-comment"></i> 카카오페이 신용점수 확인하기</a>` } };
    const help = helpContent[topic];
    if (!help) return;
    const modal = document.createElement('div');
    modal.className = 'modal show';
    modal.innerHTML = `<div class="modal-content" style="max-width:600px;"><span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span><h2>${help.title}</h2><div class="help-content">${help.content}</div></div>`;
    document.body.appendChild(modal);
}

function getAuctionTalkSupabaseClient() {
    return window.AUCTIONTALK_SUPABASE_READY && window.auctiontalkSupabase ? window.auctiontalkSupabase : null;
}

function buildInquiryPayload(data) {
    return { name: data.name||'', phone: data.phone||'', email: data.email||'', address: data.address||data.propertyAddress||'', case_number: data.caseNumber||'', property_type: data.propertyType||'', region: data.region||'', home_ownership: data.homeOwnership||'', appraisal_value: parseInt(data.appraisalValue||0,10)||0, kb_price: parseInt(data.kbPrice||0,10)||0, expected_winning_price: parseInt(data.expectedPrice||0,10)||0, annual_income: parseInt(data.annualIncome||0,10)||0, existing_debt: parseInt(data.existingDebt||0,10)||0, credit_score: data.creditScore||'', is_regulated: data.isRegulated||'', status: 'pending', assigned_to: 'unassigned', memo: '', source: 'website' };
}

async function handleAfterFormSubmit(e) {
    e.preventDefault();
    const formData = new FormData(e.target);
    const data = Object.fromEntries(formData.entries());
    if (!document.getElementById('privacy-agree').checked) { alert('개인정보 수집 및 이용에 동의해주세요.'); return; }
    const inquiryData = buildInquiryPayload(data);
    const supabase = getAuctionTalkSupabaseClient();
    if (supabase) {
        try { const { error } = await supabase.from('inquiries').insert([inquiryData]); if (error) throw error; showSuccessModal(); e.target.reset(); return; }
        catch (error) { console.error('Supabase 저장 실패, localStorage 폴백:', error); }
    }
    const fallbackInquiry = { ...data, status: 'pending', source: 'website', created_at: new Date().toISOString(), id: Date.now() };
    const inquiries = loadFromLocalStorage('pendingInquiries') || [];
    inquiries.push(fallbackInquiry);
    saveToLocalStorage('pendingInquiries', inquiries);
    showSuccessModal();
    e.target.reset();
}

function showSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.classList.add('show');
}

function closeModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.classList.remove('show');
}

async function loadConsultants() {
    try { const response = await fetch('tables/consultants?limit=100'); const data = await response.json(); if (data.data && data.data.length > 0) displayConsultants(data.data.filter(c => c.is_active)); else displayDefaultConsultants(); } catch (error) { displayDefaultConsultants(); }
}

function displayConsultants(consultants) {
    const container = document.getElementById('consultants-grid');
    if (!container) return;
    const html = consultants.map(c => `<div class="consultant-card"><div class="consultant-avatar"><i class="fas fa-user-tie"></i></div><h3 class="consultant-name">${c.name}</h3><div class="consultant-rating">${'⭐'.repeat(Math.floor(c.rating||5))}</div><p class="consultant-specialty">${c.specialty||'경매 대출 전문'}</p><div class="consultant-stats"><div class="consultant-stat"><span class="consultant-stat-value">${c.total_consultations||0}</span><span class="consultant-stat-label">상담</span></div><div class="consultant-stat"><span class="consultant-stat-value">${c.total_contracts||0}</span><span class="consultant-stat-label">계약</span></div></div>${c.reviews?`<div class="consultant-reviews">"${c.reviews}"</div>`:''}<button class="btn btn-primary btn-block" onclick="contactConsultant('${c.phone}')"><i class="fas fa-phone"></i> 연락하기</button></div>`).join('');
    container.innerHTML = html;
}

function displayDefaultConsultants() {
    displayConsultants([
        { name: '김대출 상담사', rating: 5, specialty: '아파트 경매 대출 전문', total_consultations: 150, total_contracts: 120, reviews: '친절하고 빠른 대출 진행으로 만족스러웠습니다.', phone: '02-853-5875' },
        { name: '박금융 상담사', rating: 5, specialty: '상가·오피스텔 대출 전문', total_consultations: 200, total_contracts: 180, reviews: '복잡한 상가 대출도 깔끔하게 처리해주셨어요.', phone: '02-853-5875' }
    ]);
}

function contactConsultant(phone) {
    alert(`상담사에게 연락하시려면 ${phone}로 전화해주세요.\n\n"대장TV 경매톡 플랫폼"을 통해 연락했다고 말씀해주시면 더욱 빠른 상담이 가능합니다.`);
}
// ── 접속자 & 계산기 사용 트래킹 ──
async function trackVisitor() {
    try {
        await supabase.from('visitor_logs').insert([{
            page: 'main',
            user_agent: navigator.userAgent,
            referrer: document.referrer || 'direct'
        }]);
    } catch(e) {}
}

async function trackCalcUsage(type) {
    try {
        await supabase.from('calc_logs').insert([{
            type: type, // 'before' or 'after'
            page: 'main'
        }]);
    } catch(e) {}
}

// 페이지 로드 시 접속자 기록
document.addEventListener('DOMContentLoaded', function() {
    trackVisitor();

    // 낙찰 전 계산 버튼 트래킹
    const beforeBtn = document.getElementById('before-submit-btn');
    if (beforeBtn) {
        beforeBtn.addEventListener('click', () => trackCalcUsage('before'));
    }

    // 낙찰 후 계산 버튼 트래킹
    const afterBtn = document.getElementById('after-submit-btn');
    if (afterBtn) {
        afterBtn.addEventListener('click', () => trackCalcUsage('after'));
    }
});
