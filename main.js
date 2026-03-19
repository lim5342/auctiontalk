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
    const isLocal = formData.region === 'local' || formData.region === 'metro-city';

    if (formData.homeOwnership === 'none') {
        score += 15; reasons.push('✅ 무주택자 - 대출 승인 유리 (+15점)');
    } else if (formData.homeOwnership === 'one') {
        const isRegulated = formData.region === 'seoul' || formData.region === 'metro';
        if (isRegulated) { score -= 10; warnings.push('⚠️ 규제지역 1주택자 - 전입 조건 필수 (-10점)'); conditions.push('⚠️ 6개월 내 전입 의무 (미이행 시 불이익)'); }
        else { conditions.push('⚠️ 6개월 내 전입 의무 (무주택자와 동일 조건)'); warnings.push('1주택 보유 - 전입 조건부 대출 (0점)'); }
    } else if (formData.homeOwnership === 'multiple') {
        if (isLocal) { conditions.push('⚠️ 지방 2주택 - 전입 조건부 승인 가능'); warnings.push('2주택 보유 (지방) - 조건부 승인 (0점)'); }
        else { score -= 20; warnings.push('❌ 2주택 이상 - 개인 대출 어려움 (-20점)'); conditions.push('⚠️ 사업자 신탁대출 검토 권장'); }
    }

    if (formData.kbPrice && formData.expectedPrice) {
        const kbRatio = (parseInt(formData.expectedPrice) / parseInt(formData.kbPrice)) * 100;
        if (kbRatio <= 70) { score += 15; reasons.push(`✅ KB 시세 대비 ${kbRatio.toFixed(0)}% - 담보 여력 우수 (+15점)`); }
        else if (kbRatio <= 85) { score += 8; reasons.push(`✅ KB 시세 대비 ${kbRatio.toFixed(0)}% - 담보 여력 양호 (+8점)`); }
        else if (kbRatio <= 95) { warnings.push(`⚠️ KB 시세 대비 ${kbRatio.toFixed(0)}% - 담보 여력 보통 (0점)`); }
        else if (kbRatio <= 110) { score -= 8; warnings.push(`⚠️ KB 시세 대비 ${kbRatio.toFixed(0)}% - 담보 부족 우려 (-8점)`); }
        else { score -= 15; warnings.push(`❌ KB 시세 대비 ${kbRatio.toFixed(0)}% - 과도한 고가 낙찰 (-15점)`); }
    }

    const creditScore = parseInt(formData.creditScore);
    if (creditScore >= 900) { score += 15; reasons.push('✅ 신용등급 1등급 (+15점)'); }
    else if (creditScore >= 850) { score += 10; reasons.push('✅ 신용등급 2등급 (+10점)'); }
    else if (creditScore >= 800) { score += 5; reasons.push('✅ 신용등급 3등급 (+5점)'); }
    else if (creditScore >= 700) { warnings.push('신용등급 4-5등급 (0점)'); }
    else if (creditScore >= 650) { score -= 5; warnings.push('⚠️ 신용등급 6등급 (-5점)'); conditions.push('⚠️ 금리 0.5~1.0%p 추가 가능'); }
    else { score -= 15; warnings.push('❌ 신용등급 낮음 - 대출 어려움 (-15점)'); }

    if (formData.annualIncome && formData.existingDebt) {
        const income = parseInt(formData.annualIncome);
        const debt = parseInt(formData.existingDebt);
        const dsrRatio = (debt / income) * 100;
        if (dsrRatio <= 20) { score += 10; reasons.push(`✅ DSR ${dsrRatio.toFixed(0)}% - 상환 여력 우수 (+10점)`); }
        else if (dsrRatio <= 30) { score += 5; reasons.push(`✅ DSR ${dsrRatio.toFixed(0)}% - 상환 여력 양호 (+5점)`); }
        else if (dsrRatio <= 40) { warnings.push(`⚠️ DSR ${dsrRatio.toFixed(0)}% - 상환 여력 보통`); }
        else { score -= 15; warnings.push(`❌ DSR ${dsrRatio.toFixed(0)}% - 대출 승인 어려움`); }
    }

    score = Math.max(0, Math.min(100, score));
    let level, levelText;
    if (score >= 80) { level = 'high'; levelText = '✅ 승인 가능성 높음'; }
    else if (score >= 65) { level = 'medium'; levelText = '⚠️ 조건부 승인 가능'; }
    else if (score >= 50) { level = 'low'; levelText = '⚠️ 승인 어려움'; }
    else { level = 'very-low'; levelText = '❌ 승인 거의 불가'; }
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

// 낙찰가만 변경 시 다른 필드 유지
function setupExpectedPriceOnly() {
    const expectedInput = document.getElementById('before-expected-price');
    if (!expectedInput) return;
    expectedInput.addEventListener('input', function() {
        // 낙찰가 변경 시 다른 필드 건드리지 않고 저장만
        saveFormData();
        updateProgress();
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
            // money display 업데이트
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
    showRestoreNotification(saved.timestamp);
}

function showRestoreNotification(timestamp) {
    const date = new Date(timestamp);
    const timeStr = `${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`;
    const notification = document.createElement('div');
    notification.className = 'restore-notification';
    notification.innerHTML = `<i class="fas fa-history"></i> 마지막 입력 내용을 불러왔습니다 (${timeStr}) <button onclick="this.parentElement.remove()" style="margin-left:10px;cursor:pointer;background:transparent;border:1px solid white;color:white;border-radius:4px;padding:2px 8px;">✕</button>`;
    const calculator = document.getElementById('calculator');
    if (calculator) {
        calculator.insertBefore(notification, calculator.firstChild);
        setTimeout(() => { if (notification.parentElement) notification.remove(); }, 10000);
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

    // money display (낙찰가 제외 - setupExpectedPriceOnly에서 처리)
    updateMoneyDisplay('before-appraisal-price', 'before-appraisal-display');
    updateMoneyDisplay('before-kb-price', 'before-kb-display');
    updateMoneyDisplay('before-annual-income', 'before-income-display');
    updateMoneyDisplay('before-existing-debt', 'before-debt-display');
    updateMoneyDisplay('after-appraisal-value', 'after-appraisal-display');
    updateMoneyDisplay('after-kb-price', 'after-kb-display');
    updateMoneyDisplay('after-expected-price', 'after-expected-display');
    updateMoneyDisplay('after-annual-income', 'after-income-display');
    updateMoneyDisplay('after-existing-debt', 'after-debt-display');

    setupExpectedPriceOnly();
    handleAddressInput('before-address', 'before-region', 'before-address-result', 'before-address-region-text');

    // select 변경 시 저장
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

    const result = calculateLoan({
        expectedWinningPrice, appraisalPrice, kbPrice,
        homeOwnership: data.homeOwnership,
        region: data.region,
        propertyType: data.propertyType,
        annualIncome, existingDebt,
        creditScore: data.creditScore
    });
    const approval = analyzeApprovalProbability(data, result);
    displayResult(result, data, approval);
    saveCalculationToHistory(data, result);
}

// =============================================
// 핵심 대출 계산 로직 (지방/수도권/서울 구분)
// =============================================
function calculateLoan(params) {
    const { expectedWinningPrice, appraisalPrice, kbPrice, homeOwnership, region, propertyType, annualIncome, existingDebt, creditScore } = params;

    // 금리 계산
    let personalRateMin = 6.5, personalRateMax = 7.5;
    const score = parseInt(creditScore) || 700;
    if (score >= 900) { personalRateMin = 6.3; personalRateMax = 6.8; }
    else if (score >= 850) { personalRateMin = 6.5; personalRateMax = 7.2; }
    else if (score >= 800) { personalRateMin = 6.8; personalRateMax = 7.5; }
    else if (score >= 750) { personalRateMin = 7.0; personalRateMax = 7.8; }
    else if (score >= 700) { personalRateMin = 7.2; personalRateMax = 8.2; }
    else if (score >= 650) { personalRateMin = 7.5; personalRateMax = 8.5; }
    else { personalRateMin = 8.0; personalRateMax = 9.0; }

    const isResidential = ['apt', 'villa', 'house', 'officetel'].includes(propertyType);
    const isNonResidential = ['commercial', 'land'].includes(propertyType);
    const isLocal = region === 'local' || region === 'metro-city'; // 지방 = 서울/경기/인천 제외

    let finalLimit = 0;
    let calculationMethod = '';
    let ltvReason = '';
    let ltvAdjustmentReason = '';

    if (isLocal) {
        // ======== 지방 대출 계산 ========
        // 생초/무주택/1주택/2주택 모두 동일: 감정가 60%, 낙찰가 90% 중 낮은 금액
        // 비주거용: 낙찰가 90%
        if (isNonResidential) {
            // 비주거용(상가 등) 지방: 낙찰가의 90%
            const byWinning = Math.floor(expectedWinningPrice * 0.9);
            finalLimit = byWinning;
            calculationMethod = `[지방 비주거용] 낙찰가 ${expectedWinningPrice.toLocaleString('ko-KR')}만원 × 90% = ${byWinning.toLocaleString('ko-KR')}만원`;
            ltvReason = '지방 비주거용 부동산 (낙찰가 90%)';
        } else {
            // 주거용 지방: 감정가 60% vs 낙찰가 90% 중 낮은 금액 → 보통 80% 수준
            const byAppraisal = appraisalPrice > 0 ? Math.floor(appraisalPrice * 0.6) : 0;
            const byWinning = Math.floor(expectedWinningPrice * 0.9);

            if (appraisalPrice > 0) {
                finalLimit = Math.min(byAppraisal, byWinning);
                if (byAppraisal <= byWinning) {
                    calculationMethod = `[지방] 감정가 ${appraisalPrice.toLocaleString('ko-KR')}만원 × 60% = ${byAppraisal.toLocaleString('ko-KR')}만원\n낙찰가 ${expectedWinningPrice.toLocaleString('ko-KR')}만원 × 90% = ${byWinning.toLocaleString('ko-KR')}만원\n→ 감정가 기준 ${byAppraisal.toLocaleString('ko-KR')}만원 적용 (낮은 금액)`;
                } else {
                    calculationMethod = `[지방] 낙찰가 ${expectedWinningPrice.toLocaleString('ko-KR')}만원 × 90% = ${byWinning.toLocaleString('ko-KR')}만원\n감정가 ${appraisalPrice.toLocaleString('ko-KR')}만원 × 60% = ${byAppraisal.toLocaleString('ko-KR')}만원\n→ 낙찰가 기준 ${byWinning.toLocaleString('ko-KR')}만원 적용 (낮은 금액)`;
                }
            } else {
                finalLimit = byWinning;
                calculationMethod = `[지방] 낙찰가 ${expectedWinningPrice.toLocaleString('ko-KR')}만원 × 90% = ${byWinning.toLocaleString('ko-KR')}만원\n(감정가 미입력 - 실제 보통 80% 수준으로 실행됨)`;
            }

            // 주택 보유에 따른 조건 안내
            if (homeOwnership === 'none') {
                ltvReason = '지방 무주택 (생초/무주택 포함)';
                ltvAdjustmentReason = '지방 무주택: 감정가 60% vs 낙찰가 90% 중 낮은 금액';
            } else if (homeOwnership === 'one') {
                ltvReason = '지방 1주택';
                ltvAdjustmentReason = '지방 1주택: 무주택과 동일 조건 + 6개월 내 전입 의무';
            } else {
                ltvReason = '지방 2주택 이상';
                ltvAdjustmentReason = '지방 2주택: 조건부 승인 가능 (전입 조건)';
            }
        }

        // 신용점수 조정
        if (score >= 700) { /* 한도 조정 없음 */ }
        else if (score >= 650) { finalLimit = Math.floor(finalLimit * 0.95); }
        else { finalLimit = Math.floor(finalLimit * 0.9); }

    } else {
        // ======== 수도권/서울 대출 계산 ========
        // 기본: 감정가 70%, 낙찰가 80% 중 낮은 금액
        // 생초: 감정가 40%, 낙찰가 80% (무주택과 동일)
        // 무주택 = 1주택: 감정가 40%, 낙찰가 80%

        const kbVal = kbPrice > 0 ? kbPrice : appraisalPrice;
        const refVal = kbVal > 0 ? kbVal : expectedWinningPrice;

        let appraisalLtv = 0.7; // 기본 감정가 LTV
        let winningLtv = 0.8;   // 기본 낙찰가 LTV

        if (homeOwnership === 'none' || homeOwnership === 'one') {
            // 무주택/1주택: 감정가 40%, 낙찰가 80%
            appraisalLtv = 0.4;
            winningLtv = 0.8;
            ltvReason = homeOwnership === 'none' ? '무주택 (생초 포함)' : '1주택 (전입 조건)';
            ltvAdjustmentReason = homeOwnership === 'one' ? '1주택: 무주택과 동일 조건 + 6개월 내 전입 의무' : '무주택: 감정가 40%, 낙찰가 80%';
        } else {
            // 2주택+: 감정가 70%, 낙찰가 80%
            appraisalLtv = 0.7;
            winningLtv = 0.8;
            ltvReason = '2주택 이상 (사업자 신탁대출 권장)';
            ltvAdjustmentReason = '2주택 이상: 개인 대출 어려움, 사업자 신탁대출 검토';
        }

        const byAppraisal = refVal > 0 ? Math.floor(refVal * appraisalLtv) : 0;
        const byWinning = Math.floor(expectedWinningPrice * winningLtv);

        if (refVal > 0) {
            finalLimit = Math.min(byAppraisal, byWinning);
            const refLabel = kbPrice > 0 ? 'KB시세' : '감정가';
            calculationMethod = `${refLabel} ${refVal.toLocaleString('ko-KR')}만원 × ${(appraisalLtv*100).toFixed(0)}% = ${byAppraisal.toLocaleString('ko-KR')}만원\n낙찰가 ${expectedWinningPrice.toLocaleString('ko-KR')}만원 × ${(winningLtv*100).toFixed(0)}% = ${byWinning.toLocaleString('ko-KR')}만원\n→ ${finalLimit.toLocaleString('ko-KR')}만원 적용 (낮은 금액)`;
        } else {
            finalLimit = byWinning;
            calculationMethod = `낙찰가 ${expectedWinningPrice.toLocaleString('ko-KR')}만원 × ${(winningLtv*100).toFixed(0)}% = ${byWinning.toLocaleString('ko-KR')}만원`;
        }

        // 신용점수 조정
        if (score >= 700) { /* 조정 없음 */ }
        else if (score >= 650) { finalLimit = Math.floor(finalLimit * 0.95); }
        else { finalLimit = Math.floor(finalLimit * 0.9); }
    }

    const personalLtvPercent = Math.round((finalLimit / expectedWinningPrice) * 100);
    const trustLimit = Math.floor(expectedWinningPrice * 0.85);

    // DSR 계산
    const maxMonthlyPayment = annualIncome > 0 ? annualIncome / 12 * 0.4 : 0;
    const existingMonthlyPayment = existingDebt / 12;
    const availableMonthlyPayment = Math.max(0, maxMonthlyPayment - existingMonthlyPayment);
    const isNonRegulatedDsr = homeOwnership === 'none' && finalLimit <= 60000;

    return {
        personal: {
            limit: finalLimit, ltv: personalLtvPercent,
            rate: { min: personalRateMin, max: personalRateMax },
            ltvReason, calculationMethod, ltvAdjustment: ltvAdjustmentReason,
            isLocal
        },
        trust: {
            limit: trustLimit, ltv: 85,
            rate: { min: 7.0, max: 8.5 },
            reason: '사업자 신탁대출 (DSR 비규제, 방 빼기 없음)'
        },
        dsr: { maxMonthlyPayment: Math.floor(maxMonthlyPayment), availableMonthlyPayment: Math.floor(availableMonthlyPayment), isNonRegulated: isNonRegulatedDsr }
    };
}

function displayResult(result, formData, approval) {
    const resultSection = document.getElementById('before-result');
    if (!resultSection) return;
    const fmt = (num) => num.toLocaleString('ko-KR');
    const homeText = { 'none': '무주택', 'one': '1주택', 'multiple': '2주택 이상' };
    const regionText = { 'seoul': '서울', 'metro': '수도권', 'metro-city': '광역시', 'local': '지방' };
    const propText = { 'apt': '아파트', 'villa': '빌라/연립', 'house': '단독주택', 'officetel': '오피스텔', 'commercial': '상가/업무시설', 'land': '토지' };

    const localNote = result.personal.isLocal
        ? `<div style="background:#e8f5e9;padding:12px;border-radius:6px;margin-top:10px;border-left:4px solid #4caf50;font-size:13px;color:#2e7d32;">
            <i class="fas fa-info-circle"></i> <strong>지방 기준 적용</strong><br>
            생초/무주택/1주택/2주택 모두 동일: 감정가 60% vs 낙찰가 90% 중 낮은 금액<br>
            (비주거용 건물·상가: 낙찰가 90% 적용)<br>
            ※ 실제 보통 <strong>80% 수준</strong>으로 실행됩니다.
          </div>`
        : '';

    const approvalHTML = approval ? `
        <div class="ai-approval-section">
            <h3><i class="fas fa-robot"></i> AI 대출 승인 가능성 분석</h3>
            <div class="approval-score ${approval.level}">
                <div class="score-circle"><span class="score-number">${approval.score}</span><span class="score-label">점</span></div>
                <div class="score-text">${approval.levelText}</div>
            </div>
            ${approval.reasons.length > 0 ? `<div class="approval-reasons"><strong>📈 긍정 요인:</strong><ul>${approval.reasons.map(r => `<li>${r}</li>`).join('')}</ul></div>` : ''}
            ${approval.warnings.length > 0 ? `<div class="approval-warnings"><strong>📉 주의 요인:</strong><ul>${approval.warnings.map(w => `<li>${w}</li>`).join('')}</ul></div>` : ''}
            ${approval.conditions.length > 0 ? `<div class="approval-conditions"><strong>⚠️ 조건부 승인 사항:</strong><ul>${approval.conditions.map(c => `<li>${c}</li>`).join('')}</ul></div>` : ''}
            <p class="approval-note"><i class="fas fa-info-circle"></i> 본 분석은 참고용이며, 실제 승인 여부는 금융기관 심사에 따라 달라집니다.</p>
        </div>` : '';

    const html = `
        <div class="result-header"><h2><i class="fas fa-check-circle"></i> 대출 한도 계산 완료</h2></div>
        <div class="result-summary">
            ${formData.appraisalPrice ? `<div class="summary-item"><strong>감정가격</strong><span>${fmt(parseInt(formData.appraisalPrice))}만원</span></div>` : ''}
            ${formData.kbPrice ? `<div class="summary-item"><strong>KB 시세</strong><span>${fmt(parseInt(formData.kbPrice))}만원</span></div>` : ''}
            <div class="summary-item"><strong>예상 낙찰가</strong><span>${fmt(parseInt(formData.expectedPrice)||0)}만원</span></div>
            <div class="summary-item"><strong>주택 보유</strong><span>${homeText[formData.homeOwnership]||'-'}</span></div>
            <div class="summary-item"><strong>지역</strong><span>${regionText[formData.region]||'-'}</span></div>
            <div class="summary-item"><strong>물건 유형</strong><span>${propText[formData.propertyType]||'-'}</span></div>
        </div>
        <div class="loan-cards">
            <div class="loan-card">
                <div class="loan-card-header"><div class="loan-card-icon"><i class="fas fa-home"></i></div><h3>개인 대출 예상 한도</h3></div>
                <div class="loan-detail"><span class="loan-detail-label">예상 대출 한도</span><span class="loan-detail-value highlight">${fmt(result.personal.limit)}만원</span></div>
                <div class="loan-detail"><span class="loan-detail-label">LTV</span><span class="loan-detail-value">${result.personal.ltv}%</span></div>
                <div class="loan-detail"><span class="loan-detail-label">예상 금리</span><span class="loan-detail-value">${result.personal.rate.min}% ~ ${result.personal.rate.max}%</span></div>
                ${result.dsr.isNonRegulated
                    ? `<div class="loan-detail"><span class="loan-detail-label" style="color:#28a745;">✅ DSR 규제</span><span class="loan-detail-value" style="color:#28a745;">비규제 (6억 이하 무주택)</span></div>`
                    : (formData.annualIncome ? `<div class="loan-detail"><span class="loan-detail-label">DSR 고려 시</span><span class="loan-detail-value">월 ${fmt(result.dsr.availableMonthlyPayment)}만원 가능</span></div>` : '')}
                ${localNote}
                <div style="background:#f0f7ff;padding:15px;border-radius:8px;margin-top:15px;font-size:13px;line-height:1.8;">
                    <strong style="display:block;margin-bottom:8px;color:#0066cc;"><i class="fas fa-calculator"></i> 산출 근거</strong>
                    <p style="margin:5px 0;white-space:pre-line;">${result.personal.calculationMethod}</p>
                    ${result.personal.ltvAdjustment ? `<p style="margin:5px 0;"><strong>주의:</strong> ${result.personal.ltvAdjustment}</p>` : ''}
                    <p style="margin:5px 0;color:#666;font-size:12px;">※ DSR/부채 미포함 금액, 개인 상황에 따라 달라질 수 있습니다.</p>
                </div>
            </div>
            <div class="loan-card">
                <div class="loan-card-header"><div class="loan-card-icon"><i class="fas fa-building"></i></div><h3>사업자 신탁대출</h3></div>
                <div class="loan-detail"><span class="loan-detail-label">예상 대출 한도</span><span class="loan-detail-value highlight">${fmt(result.trust.limit)}만원</span></div>
                <div class="loan-detail"><span class="loan-detail-label">LTV</span><span class="loan-detail-value">85%</span></div>
                <div class="loan-detail"><span class="loan-detail-label">예상 금리</span><span class="loan-detail-value">${result.trust.rate.min}% ~ ${result.trust.rate.max}%</span></div>
                <div class="loan-detail"><span class="loan-detail-label" style="color:#28a745;">✅ DSR 규제</span><span class="loan-detail-value" style="color:#28a745;">비규제</span></div>
                <div class="loan-detail"><span class="loan-detail-label" style="color:#28a745;">✅ 방 빼기</span><span class="loan-detail-value" style="color:#28a745;">불필요</span></div>
                <div class="loan-detail"><span class="loan-detail-label">신탁 등기비</span><span class="loan-detail-value">약 100~150만원</span></div>
                <div class="loan-detail"><span class="loan-detail-label">필수 조건</span><span class="loan-detail-value">사업자 등록 필요</span></div>
                <div style="background:#fff3e0;padding:12px;border-radius:6px;margin-top:12px;border-left:4px solid #ff9800;font-size:13px;color:#e65100;">
                    <i class="fas fa-briefcase"></i> <strong>사업자는 DSR 비규제, 방 빼기 없이 대출 가능</strong><br>
                    금융기관별·지역별·낙찰가·이자상환능력에 따라 최종 결정
                </div>
            </div>
        </div>
        ${approvalHTML}
        <div class="result-warning"><i class="fas fa-info-circle"></i> 실제 대출 한도와 금리는 금융기관 심사 후 확정됩니다. DSR 및 부채 미반영 금액입니다.</div>
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
    modal.innerHTML = `<div class="modal-content" style="max-width:800px;"><span class="modal-close" onclick="this.closest('.modal').remove()">&times;</span><h2><i class="fas fa-star"></i> 찜한 계산 결과</h2><div class="favorites-list">${favorites.map(fav => {
        const date = new Date(fav.date);
        const dateStr = `${date.getMonth()+1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2,'0')}`;
        return `<div class="favorite-item"><div class="favorite-header"><strong>${fav.formData.propertyType||'물건'} - ${parseInt(fav.formData.expectedPrice).toLocaleString()}만원</strong><span class="favorite-date">${dateStr}</span></div><div class="favorite-details"><span>개인 한도: ${fav.result.personal.limit.toLocaleString()}만원</span><span>LTV: ${fav.result.personal.ltv}%</span><span>금리: ${fav.result.personal.rate.min}~${fav.result.personal.rate.max}%</span></div><button class="btn btn-sm" onclick="removeFavorite(${fav.id})"><i class="fas fa-trash"></i> 삭제</button></div>`;
    }).join('')}</div></div>`;
    document.body.appendChild(modal);
}

function removeFavorite(id) {
    const history = loadFromLocalStorage('calculationHistory') || [];
    const calculation = history.find(c => c.id === id);
    if (calculation) { calculation.isFavorite = false; saveToLocalStorage('calculationHistory', history); document.querySelector('.modal').remove(); viewFavorites(); }
}

function showHelp(topic) {
    const helpContent = { 'credit-score': { title: '💡 신용점수란?', content: `<p>신용점수는 개인의 신용 상태를 숫자로 나타낸 것입니다.</p><br><p><strong>확인 방법:</strong></p><ul><li>카카오톡 앱 → 전체 서비스 → 신용점수</li><li>NICE 신용평가, 올크레딧 앱</li></ul><br><a href="https://m.score.kakao.com/" target="_blank" class="btn btn-primary"><i class="fas fa-comment"></i> 카카오톡에서 확인하기</a>` } };
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
    const inquiryData = {
        case_number: data.caseNumber||'', appraisal_value: parseInt(data.appraisalValue)*10000,
        kb_price: data.kbPrice ? parseInt(data.kbPrice)*10000 : null,
        expected_winning_price: parseInt(data.expectedPrice)*10000,
        home_ownership: data.homeOwnership, region: data.region, property_type: data.propertyType,
        annual_income: parseInt(data.annualIncome)*10000, existing_debt: parseInt(data.existingDebt)*10000,
        credit_score: data.creditScore, name: data.name, phone: data.phone, email: data.email||'',
        status: 'pending', assigned_to: 'unassigned', source: 'website', created_at: Date.now()
    };
    try {
        const response = await fetch('tables/inquiries', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(inquiryData) });
        if (response.ok) { showSuccessModal(); e.target.reset(); }
        else { alert('신청 중 오류가 발생했습니다. 다시 시도해주세요.'); }
    } catch (error) { alert('신청 중 오류가 발생했습니다. 다시 시도해주세요.'); }
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
    const html = consultants.map(c => `<div class="consultant-card"><div class="consultant-avatar"><i class="fas fa-user-tie"></i></div><h3 class="consultant-name">${c.name}</h3><div class="consultant-rating">${'⭐'.repeat(Math.floor(c.rating||5))}</div><p class="consultant-specialty">${c.specialty||'경매 대출 전문'}</p><div class="consultant-stats"><div class="consultant-stat"><span class="consultant-stat-value">${c.total_consultations||0}</span><span class="consultant-stat-label">상담</span></div><div class="consultant-stat"><span class="consultant-stat-value">${c.total_contracts||0}</span><span class="consultant-stat-label">계약</span></div></div>${c.reviews?`<div class="consultant-reviews">"${c.reviews}"</div>`:''}<button class="btn btn-primary btn-block" onclick="contactConsultant('${c.phone}')"><i class="fas fa-phone"></i> 연락하기</button></div>`).join('');
    container.innerHTML = html;
}

function displayDefaultConsultants() {
    displayConsultants([
        { name: '김대출 상담사', rating: 5, specialty: '아파트 경매 대출 전문', total_consultations: 150, total_contracts: 120, reviews: '친절하고 빠른 대출 진행으로 만족스러웠습니다.', phone: '010-1234-5678' },
        { name: '박금융 상담사', rating: 5, specialty: '상가·오피스텔 대출 전문', total_consultations: 200, total_contracts: 180, reviews: '복잡한 상가 대출도 깔끔하게 처리해주셨어요.', phone: '010-2345-6789' }
    ]);
}

function contactConsultant(phone) {
    alert(`상담사에게 연락하시려면 ${phone}로 전화해주세요.\n\n"대장TV 경매톡 플랫폼"을 통해 연락했다고 말씀해주시면 더욱 빠른 상담이 가능합니다.`);
}
