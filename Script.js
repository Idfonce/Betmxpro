/**
 * BetWin Pro - Smart Betting Tracker & Calculator
 * @version 1.0.0
 * @description Track bets, build betslips, and calculate compound profit paths
 */

// ===========================================
// DATA MANAGEMENT
// ===========================================
const STORAGE_KEYS = {
    ALL_BETS: 'betwin_all_bets',
    PROFIT_PLAN: 'betwin_profit_plan'
};

let currentSlip = [];
let allBets = [];
let currentTab = 'online';
let profitPlan = {
    stake: 1000,
    odds: 1.5,
    targetProfit: 1000000,
    daysNeeded: 0,
    finalBalance: 0,
    progressPercent: 0
};

/**
 * Load saved data from localStorage
 */
function loadData() {
    try {
        const savedBets = localStorage.getItem(STORAGE_KEYS.ALL_BETS);
        const savedPlan = localStorage.getItem(STORAGE_KEYS.PROFIT_PLAN);
        
        if (savedBets) allBets = JSON.parse(savedBets);
        if (savedPlan) profitPlan = JSON.parse(savedPlan);
    } catch (error) {
        console.error('Error loading data:', error);
    }
}

/**
 * Save data to localStorage
 */
function saveData() {
    try {
        localStorage.setItem(STORAGE_KEYS.ALL_BETS, JSON.stringify(allBets));
        localStorage.setItem(STORAGE_KEYS.PROFIT_PLAN, JSON.stringify(profitPlan));
    } catch (error) {
        console.error('Error saving data:', error);
    }
}

// ===========================================
// UTILITY FUNCTIONS
// ===========================================

/**
 * Format number to Tanzanian Shilling (TZS) currency format
 * @param {number} amount - Amount to format
 * @returns {string} Formatted currency string
 */
function formatTZS(amount) {
    return 'Tzs. ' + Number(amount).toLocaleString('en-TZ', {
        maximumFractionDigits: 0,
        minimumFractionDigits: 0
    });
}

/**
 * Generate unique ID for bets and matches
 * @returns {string} Unique identifier
 */
function generateId() {
    return Date.now().toString(36) + Math.random().toString(36).substr(2, 9);
}

// ===========================================
// NAVIGATION
// ===========================================

/**
 * Navigate to a specific page
 * @param {string} pageName - Page identifier ('dashboard', 'calculator', 'betslip')
 */
function navigateToPage(pageName) {
    // Hide all pages
    document.querySelectorAll('.page').forEach(p => p.classList.remove('active'));
    
    // Show target page
    const pageMap = {
        'dashboard': 'dashboard-page',
        'calculator': 'calculator-page',
        'betslip': 'betslip-page'
    };
    
    const pageId = pageMap[pageName] || 'dashboard-page';
    const targetPage = document.getElementById(pageId);
    if (targetPage) targetPage.classList.add('active');
    
    // Update navigation buttons
    document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
        btn.classList.remove('active');
        if (btn.getAttribute('data-page') === pageName) {
            btn.classList.add('active');
        }
    });
    
    // Close dropdown
    const dropdown = document.getElementById('profile-dropdown');
    if (dropdown) dropdown.classList.remove('show');
    
    refreshAllUI();
}

// ===========================================
// BET TAB MANAGEMENT
// ===========================================

/**
 * Switch between Online/Won/Lost tabs
 * @param {string} tab - Tab identifier ('online', 'won', 'lost')
 */
function switchBetTab(tab) {
    currentTab = tab;
    
    // Update tab button styles
    ['online', 'won', 'lost'].forEach(t => {
        const btn = document.getElementById('tab-' + t);
        if (btn) btn.classList.remove('active');
    });
    
    const activeBtn = document.getElementById('tab-' + tab);
    if (activeBtn) activeBtn.classList.add('active');
    
    displayBets(tab);
}

/**
 * Display bets filtered by status
 * @param {string} status - Bet status to filter ('online', 'won', 'lost')
 */
function displayBets(status) {
    const betsContainer = document.getElementById('bets-list');
    const betsEmpty = document.getElementById('bets-empty');
    
    if (!betsContainer || !betsEmpty) return;
    
    const filteredBets = allBets.filter(bet => bet.status === status);
    
    if (filteredBets.length === 0) {
        betsContainer.style.display = 'none';
        betsEmpty.style.display = 'block';
        return;
    }
    
    betsContainer.style.display = 'block';
    betsEmpty.style.display = 'none';
    
    betsContainer.innerHTML = filteredBets.map(bet => createBetCard(bet)).join('');
}

/**
 * Create HTML for a bet card
 * @param {Object} bet - Bet object
 * @returns {string} HTML string
 */
function createBetCard(bet) {
    const matchDetails = bet.matches.map(m => `
        <div style="font-size: 0.85rem; margin: 3px 0;">
            <strong>${m.match}</strong> · ${m.league}<br>
            <span style="color: #3498db;">${m.option}</span> · Odds: ${m.odds}
        </div>
    `).join('');
    
    const statusBadges = {
        'online': '<span style="background: #3498db; color: white; padding: 3px 12px; border-radius: 15px; font-size: 0.8rem;">📝 Online</span>',
        'won': '<span style="background: #28a745; color: white; padding: 3px 12px; border-radius: 15px; font-size: 0.8rem;">🏆 Won</span>',
        'lost': '<span style="background: #dc3545; color: white; padding: 3px 12px; border-radius: 15px; font-size: 0.8rem;">❌ Lost</span>'
    };
    
    const actionButtons = bet.status === 'online' ? `
        <div style="margin-top: 5px; display: flex; gap: 5px;">
            <button class="success" style="padding: 5px 12px; font-size: 0.8rem;" onclick="updateBetStatus('${bet.id}', 'won')">
                🏆 Won
            </button>
            <button class="danger" style="padding: 5px 12px; font-size: 0.8rem;" onclick="updateBetStatus('${bet.id}', 'lost')">
                ❌ Lost
            </button>
        </div>
    ` : '';
    
    return `
        <div class="transaction-item" style="flex-direction: column; align-items: flex-start; gap: 10px;">
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center;">
                <span style="color: #666; font-size: 0.85rem;">
                    ${new Date(bet.date).toLocaleString('en-TZ')}
                </span>
                ${statusBadges[bet.status] || ''}
            </div>
            <div style="width: 100%;">${matchDetails}</div>
            <div style="width: 100%; display: flex; justify-content: space-between; align-items: center; padding-top: 10px; border-top: 1px solid #eee;">
                <div>
                    <span style="color: #666;">Total Odds: <strong>${bet.totalOdds.toFixed(2)}</strong></span><br>
                    <span style="color: #666;">Stake: <strong>${formatTZS(bet.stake)}</strong></span>
                </div>
                <div style="text-align: right;">
                    <span style="color: #28a745; font-weight: 700; font-size: 1.1rem;">
                        Potential: ${formatTZS(bet.potentialWin)}
                    </span>
                    ${actionButtons}
                </div>
            </div>
        </div>
    `;
}

/**
 * Update a bet's status
 * @param {string} betId - Bet identifier
 * @param {string} newStatus - New status ('won' or 'lost')
 */
function updateBetStatus(betId, newStatus) {
    const bet = allBets.find(b => b.id === betId);
    if (bet) {
        bet.status = newStatus;
        if (newStatus === 'won') {
            bet.wonAmount = bet.potentialWin;
        }
        saveData();
        refreshAllUI();
        showMessage(`Bet marked as ${newStatus.toUpperCase()}! 🎉`);
    }
}

// ===========================================
// BETSLIP BUILDER
// ===========================================

/**
 * Add a match to the current betslip
 */
function addMatchToSlip() {
    const matchInput = document.getElementById('match-name');
    const leagueInput = document.getElementById('match-league');
    const optionSelect = document.getElementById('bet-option');
    const oddsInput = document.getElementById('match-odds');
    
    const match = matchInput.value.trim();
    const league = leagueInput.value.trim();
    const option = optionSelect.value;
    const odds = parseFloat(oddsInput.value);
    
    if (!match) return showMessage('Please enter match teams', false);
    if (!league) return showMessage('Please enter league name', false);
    if (!odds || odds <= 1.0) return showMessage('Please enter valid odds (greater than 1.0)', false);
    
    currentSlip.push({
        id: generateId(),
        match,
        league,
        option,
        odds
    });
    
    // Clear inputs
    matchInput.value = '';
    leagueInput.value = '';
    oddsInput.value = '1.50';
    
    updateSlipUI();
    showMessage('Match added to betslip! ⚽');
}

/**
 * Update the betslip UI
 */
function updateSlipUI() {
    const slipContainer = document.getElementById('current-slip-matches');
    const slipEmpty = document.getElementById('slip-empty');
    const matchCount = document.getElementById('match-count');
    const totalOddsDisplay = document.getElementById('total-odds-display');
    const potentialWin = document.getElementById('potential-win');
    const stakeInput = document.getElementById('slip-stake');
    
    if (!slipContainer || !matchCount || !totalOddsDisplay || !potentialWin) return;
    
    const stake = parseFloat(stakeInput?.value) || 1000;
    matchCount.textContent = `${currentSlip.length} Match${currentSlip.length !== 1 ? 'es' : ''}`;
    
    if (currentSlip.length === 0) {
        if (slipEmpty) slipEmpty.style.display = 'block';
        slipContainer.innerHTML = '';
        totalOddsDisplay.textContent = '0.00';
        potentialWin.textContent = formatTZS(0);
        return;
    }
    
    if (slipEmpty) slipEmpty.style.display = 'none';
    
    slipContainer.innerHTML = currentSlip.map((m, i) => `
        <div style="background: #f8fbff; padding: 12px; border-radius: 8px; margin-bottom: 8px; border-left: 4px solid #3498db; display: flex; justify-content: space-between; align-items: center;">
            <div>
                <strong>${m.match}</strong><br>
                <span style="font-size: 0.85rem; color: #666;">${m.league}</span><br>
                <span style="font-size: 0.85rem; color: #3498db;">${m.option}</span>
            </div>
            <div style="display: flex; align-items: center; gap: 10px;">
                <span style="font-weight: 700; color: #28a745;">${m.odds.toFixed(2)}</span>
                <button class="danger" style="padding: 5px 10px; font-size: 0.75rem;" onclick="removeMatchFromSlip('${m.id}')" title="Remove match">
                    <i class="fas fa-times"></i>
                </button>
            </div>
        </div>
    `).join('');
    
    const totalOdds = currentSlip.reduce((product, m) => product * m.odds, 1);
    totalOddsDisplay.textContent = totalOdds.toFixed(2);
    potentialWin.textContent = formatTZS(stake * totalOdds);
}

/**
 * Remove a match from the current betslip
 * @param {string} matchId - Match identifier to remove
 */
function removeMatchFromSlip(matchId) {
    currentSlip = currentSlip.filter(m => m.id !== matchId);
    updateSlipUI();
}

/**
 * Clear all matches from the current betslip
 */
function clearCurrentSlip() {
    if (currentSlip.length === 0) return;
    currentSlip = [];
    updateSlipUI();
    showMessage('Betslip cleared!');
}

/**
 * Place bet with current slip matches
 */
function placeBet() {
    if (currentSlip.length === 0) {
        return showMessage('Add at least one match to your slip', false);
    }
    
    const stakeInput = document.getElementById('slip-stake');
    const stake = parseFloat(stakeInput?.value) || 1000;
    
    if (stake < 100) {
        return showMessage('Minimum stake is 100 TZS', false);
    }
    
    const totalOdds = currentSlip.reduce((product, m) => product * m.odds, 1);
    
    const bet = {
        id: generateId(),
        matches: [...currentSlip],
        totalOdds,
        stake,
        potentialWin: stake * totalOdds,
        date: new Date().toISOString(),
        status: 'online'
    };
    
    allBets.push(bet);
    currentSlip = [];
    
    saveData();
    updateSlipUI();
    refreshAllUI();
    navigateToPage('dashboard');
    showMessage(`Bet placed successfully! Potential win: ${formatTZS(bet.potentialWin)} 🎯`);
}

// ===========================================
// PROFIT CALCULATOR
// ===========================================

/**
 * Calculate profit path with compound betting
 */
function calculateProfitPath() {
    const stake = parseFloat(document.getElementById('stake-input')?.value) || 1000;
    const odds = parseFloat(document.getElementById('odds-input')?.value) || 1.5;
    const targetProfit = parseFloat(document.getElementById('target-input')?.value) || 1000000;
    
    if (odds <= 1.0) {
        return showMessage('Odds must be greater than 1.0', false);
    }
    
    let balance = stake;
    let days = 0;
    const MAX_DAYS = 10000;
    
    while ((balance - stake) < targetProfit && days < MAX_DAYS) {
        balance *= odds;
        days++;
    }
    
    profitPlan = {
        stake,
        odds,
        targetProfit,
        daysNeeded: days >= MAX_DAYS ? Infinity : days,
        finalBalance: balance,
        progressPercent: days >= MAX_DAYS ? 0 : Math.min(100, ((balance - stake) / targetProfit) * 100)
    };
    
    // Display results
    const resultDiv = document.getElementById('calc-result');
    if (resultDiv) resultDiv.style.display = 'block';
    
    const daysDisplay = document.getElementById('calc-days');
    const balanceDisplay = document.getElementById('calc-balance');
    const progressFill = document.getElementById('calc-progress');
    const profitText = document.getElementById('calc-profit-text');
    const percentText = document.getElementById('calc-percent');
    
    if (profitPlan.daysNeeded === Infinity) {
        if (daysDisplay) daysDisplay.textContent = 'Too Many Days';
        if (balanceDisplay) balanceDisplay.textContent = 'Target unreachable';
        if (progressFill) progressFill.style.width = '0%';
        if (profitText) profitText.textContent = 'Adjust parameters';
        if (percentText) percentText.textContent = 'N/A';
    } else {
        if (daysDisplay) daysDisplay.textContent = `${profitPlan.daysNeeded} Days`;
        if (balanceDisplay) balanceDisplay.textContent = `Final: ${formatTZS(profitPlan.finalBalance)}`;
        if (progressFill) progressFill.style.width = `${profitPlan.progressPercent}%`;
        if (profitText) profitText.textContent = `Profit: ${formatTZS(profitPlan.finalBalance - stake)}`;
        if (percentText) percentText.textContent = `${profitPlan.progressPercent.toFixed(1)}% of target`;
    }
    
    saveData();
}

// ===========================================
// DASHBOARD STATISTICS
// ===========================================

/**
 * Update dashboard statistics
 */
function updateDashboardStats() {
    const online = allBets.filter(b => b.status === 'online').length;
    const won = allBets.filter(b => b.status === 'won').length;
    const lost = allBets.filter(b => b.status === 'lost').length;
    
    const totalProfit = allBets
        .filter(b => b.status === 'won')
        .reduce((sum, b) => sum + (b.wonAmount || b.potentialWin || 0) - (b.stake || 0), 0);
    
    const statOnline = document.getElementById('stat-online');
    const statWon = document.getElementById('stat-won');
    const statLost = document.getElementById('stat-lost');
    const statTotalProfit = document.getElementById('stat-total-profit');
    
    if (statOnline) statOnline.textContent = online;
    if (statWon) statWon.textContent = won;
    if (statLost) statLost.textContent = lost;
    if (statTotalProfit) statTotalProfit.textContent = formatTZS(totalProfit);
}

// ===========================================
// UI HELPERS
// ===========================================

/**
 * Refresh all UI components
 */
function refreshAllUI() {
    updateDashboardStats();
    displayBets(currentTab);
    updateSlipUI();
}

/**
 * Show success/error modal
 * @param {string} msg - Message to display
 * @param {boolean} isSuccess - Whether it's a success message
 */
function showMessage(msg, isSuccess = true) {
    const modal = document.getElementById('success-modal');
    const messageDiv = document.getElementById('success-message');
    
    if (modal && messageDiv) {
        messageDiv.textContent = msg;
        modal.style.display = 'flex';
    }
}

/**
 * Close the success modal
 */
function closeSuccessModal() {
    const modal = document.getElementById('success-modal');
    if (modal) modal.style.display = 'none';
}

// ===========================================
// DATA RESET
// ===========================================

/**
 * Reset all data to defaults
 */
function resetAllData() {
    if (!confirm('Are you sure you want to reset ALL data? This action cannot be undone.')) {
        return;
    }
    
    allBets = [];
    currentSlip = [];
    profitPlan = {
        stake: 1000,
        odds: 1.5,
        targetProfit: 1000000,
        daysNeeded: 0,
        finalBalance: 0,
        progressPercent: 0
    };
    
    localStorage.clear();
    saveData();
    refreshAllUI();
    
    const calcResult = document.getElementById('calc-result');
    if (calcResult) calcResult.style.display = 'none';
    
    showMessage('All data has been reset successfully! 🔄');
}

// ===========================================
// INITIALIZATION
// ===========================================

document.addEventListener('DOMContentLoaded', () => {
    // Load saved data
    loadData();
    
    // Set form values from saved plan
    const stakeInput = document.getElementById('stake-input');
    const oddsInput = document.getElementById('odds-input');
    const targetInput = document.getElementById('target-input');
    
    if (stakeInput) stakeInput.value = profitPlan.stake;
    if (oddsInput) oddsInput.value = profitPlan.odds;
    if (targetInput) targetInput.value = profitPlan.targetProfit;
    
    // Profile dropdown toggle
    const profileToggle = document.getElementById('profile-toggle');
    const profileDropdown = document.getElementById('profile-dropdown');
    
    if (profileToggle && profileDropdown) {
        profileToggle.addEventListener('click', (e) => {
            e.stopPropagation();
            profileDropdown.classList.toggle('show');
        });
        
        document.addEventListener('click', (e) => {
            if (!profileToggle.contains(e.target) && !profileDropdown.contains(e.target)) {
                profileDropdown.classList.remove('show');
            }
        });
    }
    
    // Navigation buttons
    document.querySelectorAll('.nav-btn[data-page]').forEach(btn => {
        btn.addEventListener('click', function() {
            navigateToPage(this.getAttribute('data-page'));
        });
    });
    
    // Live stake update in betslip
    const slipStakeInput = document.getElementById('slip-stake');
    if (slipStakeInput) {
        slipStakeInput.addEventListener('input', updateSlipUI);
    }
    
    // Modal close on overlay click
    const successModal = document.getElementById('success-modal');
    if (successModal) {
        successModal.addEventListener('click', function(e) {
            if (e.target === this) closeSuccessModal();
        });
    }
    
    // Keyboard shortcut to close modal
    document.addEventListener('keydown', function(e) {
        if (e.key === 'Escape') closeSuccessModal();
    });
    
    // Initial render
    refreshAllUI();
    
    console.log('BetWin Pro initialized successfully! 🚀');
});
