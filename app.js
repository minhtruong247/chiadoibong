/**
 * FOOTBALL PAIR MATCHER
 * Thuật toán ghép cặp tương đương và phân bổ 2 đội cân bằng
 */

// Danh sách 12 cầu thủ chính thức mặc định của đội
const DEFAULT_PLAYERS = [
  { id: 'p1', name: 'Thiên Nhựt', skill: 5, pos: 'ALL', attending: true },
  { id: 'p2', name: 'Trương Thuận', skill: 5, pos: 'ALL', attending: true },
  { id: 'p3', name: 'Mai Con', skill: 5, pos: 'GK', attending: true, isMvp: true },
  { id: 'p4', name: 'Mai Kiên', skill: 3, pos: 'ALL', attending: true },
  { id: 'p5', name: 'Nhựt Tiến', skill: 4, pos: 'ALL', attending: true },
  { id: 'p6', name: 'Trung Trí', skill: 4, pos: 'MF', attending: true },
  { id: 'p7', name: 'Sơn Đại Ca', skill: 3, pos: 'DF', attending: true },
  { id: 'p8', name: 'Nhứt Đạt', skill: 3, pos: 'DF', attending: true },
  { id: 'p9', name: 'Minh Trường', skill: 4, pos: 'ALL', attending: true },
  { id: 'p10', name: 'Trí Dũng', skill: 4, pos: 'ALL', attending: true },
  { id: 'p11', name: 'Trâu Đen', skill: 3, pos: 'GK', attending: true },
  { id: 'p12', name: 'Anh Lượng', skill: 3, pos: 'ALL', attending: true }
];

const firebaseConfig = {
  apiKey: "AIzaSyAeOe2W1F0wSsYYooQdCtRPMUdCyXpjbWE",
  authDomain: "chia-doi-bong.firebaseapp.com",
  databaseURL: "https://chia-doi-bong-default-rtdb.asia-southeast1.firebasedatabase.app",
  projectId: "chia-doi-bong",
  storageBucket: "chia-doi-bong.firebasestorage.app",
  messagingSenderId: "539410880572",
  appId: "1:539410880572:web:2b318dc28f35dacfe54b39"
};

const SKILL_SCORES = { 5: 95, 4: 80, 3: 65, 2: 50, 1: 35 };

class FootballTeamApp {
  constructor() {
    this.players = this.loadPlayersLocal();
    this.customPairs = this.loadCustomPairsLocal();
    this.matchHistory = this.loadMatchHistoryLocal();
    this.currentResult = null;
    this.selectedWinner = null;
    this.db = null;

    this.initElements();
    this.bindEvents();
    this.render();
    this.initFirebase();
  }

  // LocalStorage Helpers (Dự phòng khi offline)
  loadPlayersLocal() {
    const saved = localStorage.getItem('fb_players_v5');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
  }

  savePlayersLocal() {
    localStorage.setItem('fb_players_v5', JSON.stringify(this.players));
  }

  loadCustomPairsLocal() {
    const saved = localStorage.getItem('fb_custom_pairs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  }

  saveCustomPairsLocal() {
    localStorage.setItem('fb_custom_pairs', JSON.stringify(this.customPairs));
  }

  sanitizeMatchRecord(m) {
    if (!m || typeof m !== 'object') return null;
    return {
      ...m,
      goalScoreBlue: (typeof m.goalScoreBlue === 'number' && !isNaN(m.goalScoreBlue)) ? m.goalScoreBlue : null,
      goalScoreRed: (typeof m.goalScoreRed === 'number' && !isNaN(m.goalScoreRed)) ? m.goalScoreRed : null
    };
  }

  loadMatchHistoryLocal() {
    const saved = localStorage.getItem('fb_match_history');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed)) {
          return parsed.map(m => this.sanitizeMatchRecord(m)).filter(Boolean);
        }
      } catch (e) {}
    }
    return [];
  }

  saveMatchHistoryLocal() {
    localStorage.setItem('fb_match_history', JSON.stringify(this.matchHistory));
  }

  // Lưu trữ đồng bộ lên Firebase Realtime
  savePlayers() {
    this.savePlayersLocal();
    if (this.db) {
      this.db.ref('football/players').set(this.players).catch(e => console.warn('Lỗi ghi Firebase:', e));
    }
  }

  saveCustomPairs() {
    this.saveCustomPairsLocal();
    if (this.db) {
      this.db.ref('football/customPairs').set(this.customPairs).catch(e => console.warn('Lỗi ghi Firebase:', e));
    }
  }

  saveMatchHistory() {
    this.saveMatchHistoryLocal();
    if (this.db) {
      this.db.ref('football/matchHistory').set(this.matchHistory).catch(e => console.warn('Lỗi ghi Firebase:', e));
    }
  }

  initFirebase() {
    try {
      if (typeof firebase !== 'undefined' && firebaseConfig && firebaseConfig.databaseURL) {
        if (!firebase.apps.length) {
          firebase.initializeApp(firebaseConfig);
        }
        this.db = firebase.database();

        // 1. Kiểm tra trạng thái mạng
        const connectedRef = this.db.ref('.info/connected');
        connectedRef.on('value', snap => {
          if (snap.val() === true) {
            this.updateCloudStatus(true, 'Đồng bộ Realtime');
          } else {
            this.updateCloudStatus(false, 'Đang kết nối...');
          }
        });

        // 2. Lắng nghe danh sách cầu thủ thời gian thực
        const playersRef = this.db.ref('football/players');
        playersRef.on('value', snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const list = Array.isArray(data) ? data : Object.values(data);
            this.players = list.filter(p => p && p.id);
            this.savePlayersLocal();
            this.render();
          } else {
            // Lần đầu mở Database: Tự động khởi tạo danh sách 12 cầu thủ lên Cloud
            playersRef.set(DEFAULT_PLAYERS);
          }
        });

        // 3. Lắng nghe cặp cố định
        const pairsRef = this.db.ref('football/customPairs');
        pairsRef.on('value', snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const list = Array.isArray(data) ? data : Object.values(data);
            this.customPairs = list.filter(p => p && p.id);
            this.saveCustomPairsLocal();
            this.render();
          } else {
            this.customPairs = [];
            this.render();
          }
        });

        // 4. Lắng nghe kết quả chia đội
        const resultRef = this.db.ref('football/currentResult');
        resultRef.on('value', snapshot => {
          if (snapshot.exists()) {
            this.currentResult = snapshot.val();
            this.renderResult();
          }
        });

        // 5. Lắng nghe lịch sử trận đấu
        const historyRef = this.db.ref('football/matchHistory');
        historyRef.on('value', snapshot => {
          if (snapshot.exists()) {
            const data = snapshot.val();
            const list = Array.isArray(data) ? data : Object.values(data);
            this.matchHistory = list
              .filter(m => m && m.matchId)
              .map(m => this.sanitizeMatchRecord(m));
            this.saveMatchHistoryLocal();
            this.renderHistory();
            this.renderPlayerStats();
            this.updateMatchActionUI();
          } else {
            this.matchHistory = [];
            this.renderHistory();
            this.renderPlayerStats();
            this.updateMatchActionUI();
          }
        });
      } else {
        this.updateCloudStatus(false, 'Ngoại tuyến (Offline)');
      }
    } catch (err) {
      console.warn('Lỗi kết nối Firebase:', err);
      this.updateCloudStatus(false, 'Ngoại tuyến');
    }
  }

  updateCloudStatus(isOnline, text) {
    if (!this.cloudStatusEl) return;
    this.cloudStatusEl.className = isOnline ? 'cloud-sync-status' : 'cloud-sync-status offline';
    const textEl = this.cloudStatusEl.querySelector('.status-text');
    if (textEl) textEl.textContent = text;
  }

  initElements() {
    // Form & List
    this.cloudStatusEl = document.getElementById('cloud-status');
    this.playersListEl = document.getElementById('players-list');
    this.addPlayerForm = document.getElementById('add-player-form');
    this.newPlayerNameInput = document.getElementById('new-player-name');
    this.newPlayerSkillSelect = document.getElementById('new-player-skill');
    this.newPlayerPosSelect = document.getElementById('new-player-pos');
    this.attendingCountBadge = document.getElementById('attending-count-badge');
    this.btnSelectAll = document.getElementById('btn-select-all');
    this.btnResetDefault = document.getElementById('btn-reset-default');

    // Custom Pairs
    this.customPairsCount = document.getElementById('custom-pairs-count');
    this.customPairsListEl = document.getElementById('custom-pairs-list');
    this.pairP1Select = document.getElementById('pair-p1');
    this.pairP2Select = document.getElementById('pair-p2');
    this.btnAddPair = document.getElementById('btn-add-pair');

    // Pitch & Balance
    this.btnGenerate = document.getElementById('btn-generate');
    this.btnReroll = document.getElementById('btn-reroll');
    this.btnCopyZalo = document.getElementById('btn-copy-zalo');
    this.pitchBlueZone = document.getElementById('pitch-blue-zone');
    this.pitchRedZone = document.getElementById('pitch-red-zone');
    this.teamBlueScoreEl = document.getElementById('team-blue-score');
    this.teamRedScoreEl = document.getElementById('team-red-score');
    this.balanceBarBlue = document.getElementById('balance-bar-blue');
    this.balanceBarRed = document.getElementById('balance-bar-red');
    this.balanceStatusText = document.getElementById('balance-status-text');
    this.pairsBreakdownList = document.getElementById('pairs-breakdown-list');

    // Match Confirmation & Action Bar Elements
    this.matchConfirmBox = document.getElementById('match-confirm-box');
    this.btnLockMatch = document.getElementById('btn-lock-match');
    this.matchLockedBox = document.getElementById('match-locked-box');
    this.btnOpenResultCurrent = document.getElementById('btn-open-result-current');
    this.lockedCardTitle = document.getElementById('locked-card-title');
    this.lockedCardDesc = document.getElementById('locked-card-desc');
    this.currentMatchLocked = false;
    this.currentLockedMatchId = null;

    // Modal & Tabs
    this.rulesModal = document.getElementById('rules-modal');
    this.btnQuickRules = document.getElementById('btn-quick-rules');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnModalOk = document.getElementById('btn-modal-ok');
    this.toastEl = document.getElementById('toast');
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');

    // History Tab Elements
    this.matchHistoryCount = document.getElementById('match-history-count');
    this.matchHistoryList = document.getElementById('match-history-list');
    this.playerStatsTable = document.getElementById('player-stats-table');
    this.btnClearHistory = document.getElementById('btn-clear-history');

    // Result Modal Elements
    this.resultModal = document.getElementById('result-modal');
    this.resultMatchId = document.getElementById('result-match-id');
    this.resultMatchInfo = document.getElementById('result-match-info');
    this.resultGoalBlue = document.getElementById('result-goal-blue');
    this.resultGoalRed = document.getElementById('result-goal-red');
    this.btnCloseResultModal = document.getElementById('btn-close-result-modal');
    this.btnCancelResult = document.getElementById('btn-cancel-result');
    this.btnSaveResult = document.getElementById('btn-save-result');
    this.winnerBtns = document.querySelectorAll('.winner-btn');

    // History Detail Modal Elements
    this.historyDetailModal = document.getElementById('history-detail-modal');
    this.historyDetailBody = document.getElementById('history-detail-body');
    this.btnCloseHistoryDetail = document.getElementById('btn-close-history-detail');
    this.btnCloseHistoryDetailOk = document.getElementById('btn-close-history-detail-ok');

    // Edit Player Modal Elements
    this.editPlayerModal = document.getElementById('edit-player-modal');
    this.editPlayerForm = document.getElementById('edit-player-form');
    this.editPlayerIdInput = document.getElementById('edit-player-id');
    this.editPlayerNameInput = document.getElementById('edit-player-name');
    this.editPlayerSkillSelect = document.getElementById('edit-player-skill');
    this.editPlayerPosSelect = document.getElementById('edit-player-pos');
    this.editPlayerMvpCheckbox = document.getElementById('edit-player-mvp');
    this.btnCloseEditModal = document.getElementById('btn-close-edit-modal');
    this.btnCancelEdit = document.getElementById('btn-cancel-edit');

    // Manual Division Elements
    this.btnManualSplit = document.getElementById('btn-manual-split');
    this.manualModal = document.getElementById('manual-modal');
    this.btnCloseManualModal = document.getElementById('btn-close-manual-modal');
    this.btnCancelManual = document.getElementById('btn-cancel-manual');
    this.btnApplyManual = document.getElementById('btn-apply-manual');
    this.btnManualAutofill = document.getElementById('btn-manual-autofill');
    this.btnManualReset = document.getElementById('btn-manual-reset');
    this.manualBlueCount = document.getElementById('manual-blue-count');
    this.manualBlueScore = document.getElementById('manual-blue-score');
    this.manualRedCount = document.getElementById('manual-red-count');
    this.manualRedScore = document.getElementById('manual-red-score');
    this.manualDiffBadge = document.getElementById('manual-diff-badge');
    this.manualBarBlue = document.getElementById('manual-bar-blue');
    this.manualBarRed = document.getElementById('manual-bar-red');
    this.manualBlueList = document.getElementById('manual-blue-list');
    this.manualUnassignedList = document.getElementById('manual-unassigned-list');
    this.manualRedList = document.getElementById('manual-red-list');
    this.manualBluePill = document.getElementById('manual-blue-pill');
    this.manualUnassignedPill = document.getElementById('manual-unassigned-pill');
    this.manualRedPill = document.getElementById('manual-red-pill');
    this.manualBlue = [];
    this.manualRed = [];
    this.manualUnassigned = [];
  }

  bindEvents() {
    // Thêm người chơi
    this.addPlayerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.addNewPlayer();
    });

    // Chọn hết / bỏ chọn
    this.btnSelectAll.addEventListener('click', () => {
      const allAttending = this.players.every(p => p.attending);
      this.players.forEach(p => p.attending = !allAttending);
      this.savePlayers();
      this.render();
    });

    // Reset về mặc định
    this.btnResetDefault.addEventListener('click', () => {
      if (confirm('Khôi phục lại danh sách 12 cầu thủ mẫu ban đầu?')) {
        this.players = JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
        this.customPairs = [];
        this.currentResult = null;
        this.savePlayers();
        this.saveCustomPairs();
        if (this.db) {
          this.db.ref('football/currentResult').remove();
        }
        this.render();
        this.showToast('Đã khôi phục danh sách mẫu');
      }
    });

    // Thêm cặp thủ công
    this.btnAddPair.addEventListener('click', () => this.addCustomPair());

    // Nút chia đội
    this.btnGenerate.addEventListener('click', () => this.generateBalancedTeams());
    this.btnReroll.addEventListener('click', () => this.rerollTeams());

    // Nút Chốt Đội Hình & Nút Cập Nhật Kết Quả Nhanh
    if (this.btnLockMatch) {
      this.btnLockMatch.addEventListener('click', () => this.lockAndSaveMatch());
    }
    if (this.btnOpenResultCurrent) {
      this.btnOpenResultCurrent.addEventListener('click', () => {
        if (this.currentLockedMatchId) {
          this.openResultModal(this.currentLockedMatchId);
        }
      });
    }

    // Nút Copy Zalo
    this.btnCopyZalo.addEventListener('click', () => this.copyResultToZalo());

    // Tabs
    this.tabBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.tabBtns.forEach(b => b.classList.remove('active'));
        this.tabContents.forEach(c => c.classList.remove('active'));
        btn.classList.add('active');
        const targetTab = document.getElementById(btn.dataset.tab);
        if (targetTab) targetTab.classList.add('active');
      });
    });

    // Rules Modal
    this.btnQuickRules.addEventListener('click', () => this.rulesModal.classList.add('active'));
    this.btnCloseModal.addEventListener('click', () => this.rulesModal.classList.remove('active'));
    this.btnModalOk.addEventListener('click', () => this.rulesModal.classList.remove('active'));
    this.rulesModal.addEventListener('click', (e) => {
      if (e.target === this.rulesModal) this.rulesModal.classList.remove('active');
    });

    // Edit Player Modal Events
    this.editPlayerForm.addEventListener('submit', (e) => {
      e.preventDefault();
      this.saveEditedPlayer();
    });
    this.btnCloseEditModal.addEventListener('click', () => this.closeEditModal());
    this.btnCancelEdit.addEventListener('click', () => this.closeEditModal());
    this.editPlayerModal.addEventListener('click', (e) => {
      if (e.target === this.editPlayerModal) this.closeEditModal();
    });

    // Result Modal Events
    this.winnerBtns.forEach(btn => {
      btn.addEventListener('click', () => {
        this.winnerBtns.forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        this.selectedWinner = btn.dataset.winner;
      });
    });
    this.btnSaveResult.addEventListener('click', () => this.saveMatchResult());
    this.btnCloseResultModal.addEventListener('click', () => this.closeResultModal());
    this.btnCancelResult.addEventListener('click', () => this.closeResultModal());
    this.resultModal.addEventListener('click', (e) => {
      if (e.target === this.resultModal) this.closeResultModal();
    });

    // History Detail Modal Events
    this.btnCloseHistoryDetail.addEventListener('click', () => this.closeHistoryDetailModal());
    this.btnCloseHistoryDetailOk.addEventListener('click', () => this.closeHistoryDetailModal());
    this.historyDetailModal.addEventListener('click', (e) => {
      if (e.target === this.historyDetailModal) this.closeHistoryDetailModal();
    });

    // Clear History
    this.btnClearHistory.addEventListener('click', () => {
      if (this.matchHistory.length === 0) return;
      if (confirm('Xóa toàn bộ lịch sử trận đấu? Hành động này không thể hoàn tác!')) {
        this.matchHistory = [];
        this.currentMatchLocked = false;
        this.currentLockedMatchId = null;
        this.saveMatchHistory();
        this.renderHistory();
        this.renderPlayerStats();
        this.updateMatchActionUI();
        this.showToast('Đã xóa toàn bộ lịch sử trận đấu');
      }
    });

    // Manual Split Modal Events
    if (this.btnManualSplit) {
      this.btnManualSplit.addEventListener('click', () => this.openManualModal());
    }
    if (this.btnCloseManualModal) {
      this.btnCloseManualModal.addEventListener('click', () => this.closeManualModal());
    }
    if (this.btnCancelManual) {
      this.btnCancelManual.addEventListener('click', () => this.closeManualModal());
    }
    if (this.manualModal) {
      this.manualModal.addEventListener('click', (e) => {
        if (e.target === this.manualModal) this.closeManualModal();
      });
    }
    if (this.btnApplyManual) {
      this.btnApplyManual.addEventListener('click', () => this.applyManualTeams());
    }
    if (this.btnManualAutofill) {
      this.btnManualAutofill.addEventListener('click', () => this.autoFillRemaining());
    }
    if (this.btnManualReset) {
      this.btnManualReset.addEventListener('click', () => this.resetManualTeams());
    }
  }

  addNewPlayer() {
    const name = this.newPlayerNameInput.value.trim();
    if (!name) return;

    const skill = parseInt(this.newPlayerSkillSelect.value, 10);
    const pos = this.newPlayerPosSelect.value;
    const newPlayer = {
      id: 'p_' + Date.now(),
      name,
      skill,
      pos,
      attending: true
    };

    this.players.unshift(newPlayer);
    this.savePlayers();
    this.newPlayerNameInput.value = '';
    this.render();
    this.showToast(`Đã thêm cầu thủ: ${name}`);
  }

  openEditModal(playerId) {
    const player = this.players.find(p => p.id === playerId);
    if (!player) return;

    this.editPlayerIdInput.value = player.id;
    this.editPlayerNameInput.value = player.name;
    this.editPlayerSkillSelect.value = player.skill.toString();
    this.editPlayerPosSelect.value = player.pos;
    if (this.editPlayerMvpCheckbox) {
      this.editPlayerMvpCheckbox.checked = !!player.isMvp;
    }

    this.editPlayerModal.classList.add('active');
    if (window.innerWidth > 600) {
      setTimeout(() => {
        this.editPlayerNameInput.focus();
        this.editPlayerNameInput.select();
      }, 100);
    }
  }

  closeEditModal() {
    this.editPlayerModal.classList.remove('active');
  }

  saveEditedPlayer() {
    const id = this.editPlayerIdInput.value;
    const name = this.editPlayerNameInput.value.trim();
    if (!name) return;

    const skill = parseInt(this.editPlayerSkillSelect.value, 10);
    const pos = this.editPlayerPosSelect.value;
    const isMvp = this.editPlayerMvpCheckbox ? this.editPlayerMvpCheckbox.checked : false;

    const player = this.players.find(p => p.id === id);
    if (player) {
      player.name = name;
      player.skill = skill;
      player.pos = pos;
      player.isMvp = isMvp;
      this.savePlayers();

      // Cập nhật ngay trong currentResult (nếu đã chia đội) để sân bóng nhảy theo tức thì
      if (this.currentResult) {
        const updateP = (p) => {
          if (p && p.id === id) {
            p.name = name;
            p.skill = skill;
            p.pos = pos;
            p.isMvp = isMvp;
          }
        };
        if (this.currentResult.teamBlue) this.currentResult.teamBlue.forEach(updateInTeam => updateP(updateInTeam));
        if (this.currentResult.teamRed) this.currentResult.teamRed.forEach(updateInTeam => updateP(updateInTeam));
        if (this.currentResult.pairs) {
          this.currentResult.pairs.forEach(pair => {
            if (pair.blue) updateP(pair.blue);
            if (pair.red) updateP(pair.red);
          });
        }
        this.renderResult();
      }

      this.render();
      this.closeEditModal();
      this.showToast(`✅ Đã cập nhật: ${name}`);
    }
  }

  deletePlayer(id) {
    this.players = this.players.filter(p => p.id !== id);
    this.customPairs = this.customPairs.filter(cp => cp.p1 !== id && cp.p2 !== id);
    this.savePlayers();
    this.saveCustomPairs();
    this.render();
  }

  toggleAttending(id) {
    const player = this.players.find(p => p.id === id);
    if (player) {
      player.attending = !player.attending;
      this.savePlayers();
      this.render();
    }
  }

  addCustomPair() {
    const id1 = this.pairP1Select.value;
    const id2 = this.pairP2Select.value;

    if (!id1 || !id2 || id1 === id2) {
      alert('Vui lòng chọn 2 cầu thủ khác nhau để ghép cặp!');
      return;
    }

    // Kiểm tra xem 1 trong 2 người đã nằm trong cặp nào chưa
    const isExisted = this.customPairs.some(cp => 
      cp.p1 === id1 || cp.p2 === id1 || cp.p1 === id2 || cp.p2 === id2
    );

    if (isExisted) {
      alert('Một trong hai cầu thủ này đã nằm trong cặp chỉ định khác!');
      return;
    }

    this.customPairs.push({ id: 'pair_' + Date.now(), p1: id1, p2: id2 });
    this.saveCustomPairs();
    this.render();
    this.showToast('Đã khóa cặp đối đầu');
  }

  deleteCustomPair(pairId) {
    this.customPairs = this.customPairs.filter(p => p.id !== pairId);
    this.saveCustomPairs();
    this.render();
  }

  // ================= THUẬT TOÁN CHIA ĐỘI GHÉP CẶP =================
  generateBalancedTeams() {
    const attending = this.players.filter(p => p.attending);
    if (attending.length < 2) {
      alert('Cần ít nhất 2 cầu thủ có mặt để chia đội!');
      return;
    }

    const assignedPlayerIds = new Set();
    const pairs = [];
    const teamBlue = [];
    const teamRed = [];

    // 1. Xử lý các cặp thủ công được chỉ định trước (nếu cả 2 đều đi đá)
    for (const cp of this.customPairs) {
      const p1 = attending.find(p => p.id === cp.p1);
      const p2 = attending.find(p => p.id === cp.p2);

      if (p1 && p2 && !assignedPlayerIds.has(p1.id) && !assignedPlayerIds.has(p2.id)) {
        assignedPlayerIds.add(p1.id);
        assignedPlayerIds.add(p2.id);
        pairs.push({ p1, p2, isManual: true });
      }
    }

    // 2. Thu thập những người còn lại chưa ghép cặp
    const remaining = attending.filter(p => !assignedPlayerIds.has(p.id));

    // Sắp xếp người còn lại theo trình độ (giảm dần)
    remaining.sort((a, b) => {
      if (b.skill !== a.skill) return b.skill - a.skill;
      // Nếu cùng sao thì ưu tiên xếp chung vị trí cạnh nhau (ví dụ 2 thủ môn, 2 hậu vệ)
      return a.pos.localeCompare(b.pos);
    });

    // Ghép cặp từng đôi kề nhau (ví dụ: rank 1 vs rank 2, rank 3 vs rank 4...)
    while (remaining.length >= 2) {
      const p1 = remaining.shift();
      const p2 = remaining.shift();
      pairs.push({ p1, p2, isManual: false });
    }

    let lonePlayer = null;
    if (remaining.length === 1) {
      lonePlayer = remaining.shift();
    }

    // 3. Phân bổ các cặp vào 2 đội: Mỗi cặp chia 1 người sang Blue, 1 người sang Red
    // Để tổng điểm 2 đội cân bằng nhất có thể:
    let blueScore = 0;
    let redScore = 0;

    // Shuffle thứ tự các cặp để vị trí random
    const shuffledPairs = [...pairs].sort(() => Math.random() - 0.5);

    const pairedResults = [];

    shuffledPairs.forEach(pair => {
      const score1 = SKILL_SCORES[pair.p1.skill] || 50;
      const score2 = SKILL_SCORES[pair.p2.skill] || 50;

      // Random 50/50 chiều ban đầu
      let coin = Math.random() >= 0.5;

      let bPlayer = coin ? pair.p1 : pair.p2;
      let rPlayer = coin ? pair.p2 : pair.p1;

      let bScore = coin ? score1 : score2;
      let rScore = coin ? score2 : score1;

      // Điều chỉnh vi sai: nếu đội nào đang bị dẫn điểm quá nhiều thì ưu tiên người điểm cao hơn về đội đó
      if (Math.abs(blueScore - redScore) >= 15) {
        if (blueScore < redScore) {
          // Blue cần người giỏi hơn
          if (score1 > score2) { bPlayer = pair.p1; rPlayer = pair.p2; bScore = score1; rScore = score2; }
          else if (score2 > score1) { bPlayer = pair.p2; rPlayer = pair.p1; bScore = score2; rScore = score1; }
        } else {
          // Red cần người giỏi hơn
          if (score1 > score2) { bPlayer = pair.p2; rPlayer = pair.p1; bScore = score2; rScore = score1; }
          else if (score2 > score1) { bPlayer = pair.p1; rPlayer = pair.p2; bScore = score1; rScore = score2; }
        }
      }

      teamBlue.push(bPlayer);
      teamRed.push(rPlayer);
      blueScore += bScore;
      redScore += rScore;

      pairedResults.push({
        blue: bPlayer,
        red: rPlayer,
        isManual: pair.isManual
      });
    });

    // Nếu lẻ người (ví dụ 11 hoặc 13 người): người lẻ vào đội có tổng điểm thấp hơn
    if (lonePlayer) {
      const loneScore = SKILL_SCORES[lonePlayer.skill] || 50;
      if (teamBlue.length <= teamRed.length && blueScore <= redScore) {
        teamBlue.push(lonePlayer);
        blueScore += loneScore;
        pairedResults.push({ blue: lonePlayer, red: null, isManual: false });
      } else {
        teamRed.push(lonePlayer);
        redScore += loneScore;
        pairedResults.push({ blue: null, red: lonePlayer, isManual: false });
      }
    }

    this.currentResult = {
      teamBlue,
      teamRed,
      blueScore,
      redScore,
      pairs: pairedResults,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' })
    };

    if (this.db) {
      this.db.ref('football/currentResult').set(this.currentResult).catch(e => console.warn('Lỗi ghi Firebase:', e));
    }

    this.currentMatchLocked = false;
    this.currentLockedMatchId = null;
    this.renderResult();
    this.updateMatchActionUI();

    this.showToast('⚽ Đã chia cặp cân bằng! Bấm "Chốt Đội Hình" để lưu trận');
  }

  // Đổi bên ngẫu nhiên cho các cặp hiện tại
  rerollTeams() {
    if (!this.currentResult) {
      this.generateBalancedTeams();
      return;
    }
    // Lật ngẫu nhiên 1 số cặp
    this.generateBalancedTeams();
  }

  renderResult() {
    if (!this.currentResult) return;

    const { teamBlue, teamRed, blueScore, redScore, pairs } = this.currentResult;

    // 1. Thước đo cân bằng
    this.teamBlueScoreEl.textContent = `${blueScore} đ (${teamBlue.length} người)`;
    this.teamRedScoreEl.textContent = `${redScore} đ (${teamRed.length} người)`;

    const total = blueScore + redScore;
    const bluePercent = total > 0 ? (blueScore / total) * 100 : 50;
    const redPercent = 100 - bluePercent;

    this.balanceBarBlue.style.width = `${bluePercent}%`;
    this.balanceBarRed.style.width = `${redPercent}%`;

    const diff = Math.abs(blueScore - redScore);
    let qualityBadge = '';
    if (diff <= 15) {
      qualityBadge = `<span class="match-quality-pill balanced"><i class="fa-solid fa-check-double"></i> Kèo Cực Cân (${100 - Math.round(diff/2)}%)</span>`;
    } else if (diff <= 30) {
      qualityBadge = `<span class="match-quality-pill"><i class="fa-solid fa-scale-balanced"></i> Khá Cân Bằng (Lệch ${diff}đ)</span>`;
    } else {
      qualityBadge = `<span class="match-quality-pill" style="background:rgba(239,68,68,0.2);color:#f87171"><i class="fa-solid fa-triangle-exclamation"></i> Lệch nhẹ ${diff}đ</span>`;
    }
    this.balanceStatusText.innerHTML = qualityBadge;

    // 2. Render Sân Bóng
    this.pitchBlueZone.innerHTML = '';
    teamBlue.forEach(p => {
      this.pitchBlueZone.appendChild(this.createPitchCard(p, 'blue'));
    });

    this.pitchRedZone.innerHTML = '';
    teamRed.forEach(p => {
      this.pitchRedZone.appendChild(this.createPitchCard(p, 'red'));
    });

    // 3. Render danh sách từng cặp đối đầu
    this.pairsBreakdownList.innerHTML = '';
    pairs.forEach((pair, idx) => {
      const row = document.createElement('div');
      row.className = 'match-pair-row';

      const blueName = pair.blue ? `${pair.blue.name}` : '<i style="color:#64748b">Trống</i>';
      const redName = pair.red ? `${pair.red.name}` : '<i style="color:#64748b">Trống</i>';
      const manualTag = pair.isManual ? '🔒' : `Cặp ${idx + 1}`;

      row.innerHTML = `
        <div class="match-pair-blue" title="${pair.blue ? pair.blue.name : ''}">
          <i class="fa-solid fa-shield"></i> ${blueName}
        </div>
        <span class="match-pair-center">${manualTag}</span>
        <div class="match-pair-red" title="${pair.red ? pair.red.name : ''}">
          ${redName} <i class="fa-solid fa-shield"></i>
        </div>
      `;
      this.pairsBreakdownList.appendChild(row);
    });

    this.updateMatchActionUI();
  }

  createPitchCard(player, teamColor) {
    const card = document.createElement('div');
    card.className = `pitch-player-card ${player.isMvp ? 'is-mvp-card' : ''}`;

    const initial = player.name.trim().charAt(0).toUpperCase();
    const starStr = '★'.repeat(player.skill);
    const mvpBadge = player.isMvp ? '<span class="pitch-mvp-badge"><i class="fa-solid fa-crown"></i> MVP</span>' : '';
    const otherTeamText = teamColor === 'blue' ? 'Đổi sang Đội Đỏ' : 'Đổi sang Đội Xanh';

    card.innerHTML = `
      <div class="pitch-jersey ${player.isMvp ? 'mvp-jersey' : ''}">${initial}</div>
      <div>
        <div class="pitch-card-name">${player.name} ${mvpBadge}</div>
        <div class="pitch-card-sub">
          <span class="pos-tag pos-${player.pos}">${player.pos}</span>
          <span>${starStr}</span>
        </div>
      </div>
      <button type="button" class="pitch-swap-btn" title="${otherTeamText}">
        <i class="fa-solid fa-arrows-rotate"></i>
      </button>
    `;

    const swapBtn = card.querySelector('.pitch-swap-btn');
    if (swapBtn) {
      swapBtn.addEventListener('click', (e) => {
        e.stopPropagation();
        this.swapPlayerTeam(player.id);
      });
    }

    return card;
  }

  // Đổi phe trực tiếp cho 1 cầu thủ giữa Đội Xanh và Đội Đỏ
  swapPlayerTeam(playerId) {
    if (!this.currentResult) return;
    const { teamBlue, teamRed } = this.currentResult;
    const inBlueIndex = teamBlue.findIndex(p => p.id === playerId);
    const inRedIndex = teamRed.findIndex(p => p.id === playerId);

    if (inBlueIndex !== -1) {
      const [player] = teamBlue.splice(inBlueIndex, 1);
      teamRed.push(player);
      this.showToast(`Đã chuyển ${player.name} sang Đội Đỏ 🔴`);
    } else if (inRedIndex !== -1) {
      const [player] = teamRed.splice(inRedIndex, 1);
      teamBlue.push(player);
      this.showToast(`Đã chuyển ${player.name} sang Đội Xanh 🔵`);
    } else {
      return;
    }

    // Tính lại điểm số
    const blueScore = teamBlue.reduce((acc, p) => acc + (SKILL_SCORES[p.skill] || 50), 0);
    const redScore = teamRed.reduce((acc, p) => acc + (SKILL_SCORES[p.skill] || 50), 0);

    // Cập nhật lại các cặp đối đầu
    const sortedBlue = [...teamBlue].sort((a, b) => (SKILL_SCORES[b.skill] || 50) - (SKILL_SCORES[a.skill] || 50));
    const sortedRed = [...teamRed].sort((a, b) => (SKILL_SCORES[b.skill] || 50) - (SKILL_SCORES[a.skill] || 50));
    const maxLen = Math.max(sortedBlue.length, sortedRed.length);
    const newPairs = [];
    for (let i = 0; i < maxLen; i++) {
      newPairs.push({
        blue: sortedBlue[i] || null,
        red: sortedRed[i] || null,
        isManual: true
      });
    }

    this.currentResult.blueScore = blueScore;
    this.currentResult.redScore = redScore;
    this.currentResult.pairs = newPairs;
    this.currentResult.timestamp = new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' });

    if (this.db) {
      this.db.ref('football/currentResult').set(this.currentResult).catch(e => console.warn('Lỗi ghi Firebase:', e));
    }

    this.renderResult();
  }

  // Chốt đội hình và lưu trận đấu vào Lịch Sử
  lockAndSaveMatch() {
    if (!this.currentResult || !this.currentResult.teamBlue || this.currentResult.teamBlue.length === 0) {
      alert('Vui lòng chia đội trước khi chốt!');
      return;
    }

    const { teamBlue, teamRed, blueScore, redScore, pairs } = this.currentResult;
    const now = new Date();
    const matchId = 'match_' + Date.now();
    const matchRecord = {
      matchId,
      date: now.toLocaleDateString('vi-VN'),
      time: now.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      teamBlue: teamBlue.map(p => ({ id: p.id, name: p.name, skill: p.skill, pos: p.pos, isMvp: p.isMvp || false })),
      teamRed: teamRed.map(p => ({ id: p.id, name: p.name, skill: p.skill, pos: p.pos, isMvp: p.isMvp || false })),
      blueScore,
      redScore,
      pairs: pairs ? pairs.map(pr => ({
        blue: pr.blue ? { id: pr.blue.id, name: pr.blue.name } : null,
        red: pr.red ? { id: pr.red.id, name: pr.red.name } : null,
        isManual: !!pr.isManual
      })) : [],
      result: null,
      goalScoreBlue: null,
      goalScoreRed: null
    };

    this.matchHistory.unshift(matchRecord);
    this.saveMatchHistory();
    this.renderHistory();
    this.renderPlayerStats();

    this.currentMatchLocked = true;
    this.currentLockedMatchId = matchId;
    this.updateMatchActionUI();

    this.showToast('✅ Đã chốt đội hình thành công! Hãy cập nhật kết quả sau khi đá.');
  }

  // Cập nhật giao diện khung hành động Chốt Đội Hình / Cập Nhật Kết Quả
  updateMatchActionUI() {
    if (!this.matchConfirmBox || !this.matchLockedBox) return;

    if (!this.currentResult || !this.currentResult.teamBlue || this.currentResult.teamBlue.length === 0) {
      this.matchConfirmBox.style.display = 'none';
      this.matchLockedBox.style.display = 'none';
      return;
    }

    if (!this.currentMatchLocked) {
      this.matchConfirmBox.style.display = 'flex';
      this.matchLockedBox.style.display = 'none';
    } else {
      this.matchConfirmBox.style.display = 'none';
      this.matchLockedBox.style.display = 'flex';

      const currentMatch = this.matchHistory.find(m => m.matchId === this.currentLockedMatchId);
      if (currentMatch && currentMatch.result) {
        let resText = currentMatch.result === 'blue' ? '🔵 Đội Xanh Thắng' :
                      currentMatch.result === 'red' ? '🔴 Đội Đỏ Thắng' : '🤝 Trận Đấu Hòa';
        if (typeof currentMatch.goalScoreBlue === 'number' && typeof currentMatch.goalScoreRed === 'number') {
          resText += ` (${currentMatch.goalScoreBlue} - ${currentMatch.goalScoreRed})`;
        }
        if (this.lockedCardTitle) this.lockedCardTitle.textContent = `Kết quả: ${resText}`;
        if (this.lockedCardDesc) this.lockedCardDesc.textContent = 'Đã lưu và tính điểm vào Bảng Xếp Hạng.';
        if (this.btnOpenResultCurrent) {
          this.btnOpenResultCurrent.innerHTML = '<i class="fa-solid fa-pen-to-square"></i> Sửa Kết Quả Trận Này';
        }
      } else {
        if (this.lockedCardTitle) this.lockedCardTitle.textContent = 'Đội hình đã được chốt!';
        if (this.lockedCardDesc) this.lockedCardDesc.textContent = 'Trận đấu đã lưu vào Lịch Sử. Hãy cập nhật kết quả sau khi đá xong:';
        if (this.btnOpenResultCurrent) {
          this.btnOpenResultCurrent.innerHTML = '<i class="fa-solid fa-trophy"></i> Cập Nhật Kết Quả / Tỷ Số';
        }
      }
    }
  }

  copyResultToZalo() {
    if (!this.currentResult) {
      alert('Vui lòng bấm nút Chia Đội trước khi copy!');
      return;
    }

    const { teamBlue, teamRed, blueScore, redScore, pairs } = this.currentResult;

    let text = `⚽ KÈO ĐÁ BANH ĐÃ CHIA XONG (${new Date().toLocaleDateString('vi-VN')}) ⚽\n`;
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔵 ĐỘI XANH (${teamBlue.length} người - ${blueScore}đ):\n`;
    teamBlue.forEach((p, i) => {
      const mvp = p.isMvp ? ' 👑[MVP]' : '';
      text += `  ${i + 1}. ${p.name}${mvp} [${p.pos}] (${'★'.repeat(p.skill)})\n`;
    });

    text += `\n🔴 ĐỘI ĐỎ (${teamRed.length} người - ${redScore}đ):\n`;
    teamRed.forEach((p, i) => {
      const mvp = p.isMvp ? ' 👑[MVP]' : '';
      text += `  ${i + 1}. ${p.name}${mvp} [${p.pos}] (${'★'.repeat(p.skill)})\n`;
    });

    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `⚔️ CÁC CẶP ĐỐI ĐẦU TRỰC DIỆN:\n`;
    pairs.forEach((pair, idx) => {
      if (pair.blue && pair.red) {
        text += `  • ${pair.blue.name}  VS  ${pair.red.name}\n`;
      }
    });
    text += `━━━━━━━━━━━━━━━━━━━━━\n`;
    text += `🔥 Chúc anh em đá bóng vui vẻ, không quạu!`;

    navigator.clipboard.writeText(text).then(() => {
      this.showToast('✅ Đã copy kết quả! Giờ bạn chỉ cần dán vào Zalo');
    }).catch(() => {
      prompt('Hãy bôi đen và copy đoạn text bên dưới:', text);
    });
  }

  showToast(message) {
    this.toastEl.textContent = message;
    this.toastEl.classList.add('show');
    setTimeout(() => {
      this.toastEl.classList.remove('show');
    }, 2600);
  }

  render() {
    // 1. Cập nhật danh sách cầu thủ
    this.playersListEl.innerHTML = '';
    const attendingCount = this.players.filter(p => p.attending).length;
    this.attendingCountBadge.textContent = `${attendingCount}/${this.players.length} Đang Chọn`;

    this.players.forEach(p => {
      const item = document.createElement('div');
      item.className = `player-item ${p.attending ? '' : 'not-attending'}`;

      const starStr = '★'.repeat(p.skill) + '☆'.repeat(5 - p.skill);
      const mvpTag = p.isMvp ? '<span class="mvp-tag" title="Cầu thủ xuất sắc nhất (MVP)"><i class="fa-solid fa-crown"></i> MVP</span>' : '';
      const avatarClass = p.isMvp ? 'player-avatar mvp-avatar' : 'player-avatar';

      item.innerHTML = `
        <div class="player-info-left">
          <input type="checkbox" class="checkbox-custom" ${p.attending ? 'checked' : ''} data-id="${p.id}" />
          <div class="${avatarClass}">${p.name.charAt(0).toUpperCase()}</div>
          <div class="player-name-wrap">
            <span class="player-name" title="Bấm để sửa tên & thông tin">${p.name}</span>
            <span class="pos-tag pos-${p.pos}">${p.pos}</span>
            ${mvpTag}
          </div>
        </div>
        <div class="player-actions-right">
          <span class="skill-stars" title="${p.skill} sao">${starStr}</span>
          <button class="btn-edit-player" data-id="${p.id}" title="Sửa tên & chỉ số">
            <i class="fa-solid fa-pen-to-square"></i>
          </button>
          <button class="btn-del-player" data-id="${p.id}" title="Xóa">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;

      // Checkbox điểm danh
      item.querySelector('.checkbox-custom').addEventListener('change', () => {
        this.toggleAttending(p.id);
      });

      // Bấm vào tên hoặc nút sửa để mở modal sửa
      item.querySelector('.player-name').addEventListener('click', () => {
        this.openEditModal(p.id);
      });
      item.querySelector('.btn-edit-player').addEventListener('click', () => {
        this.openEditModal(p.id);
      });

      // Xóa
      item.querySelector('.btn-del-player').addEventListener('click', () => {
        this.deletePlayer(p.id);
      });

      this.playersListEl.appendChild(item);
    });

    // 2. Cập nhật dropdown chọn cặp
    this.pairP1Select.innerHTML = '<option value="">Chọn cầu thủ 1</option>';
    this.pairP2Select.innerHTML = '<option value="">Chọn cầu thủ 2</option>';

    this.players.filter(p => p.attending).forEach(p => {
      const opt1 = document.createElement('option');
      opt1.value = p.id;
      opt1.textContent = `${p.name} (${p.pos} - ${p.skill}★)`;
      this.pairP1Select.appendChild(opt1);

      const opt2 = document.createElement('option');
      opt2.value = p.id;
      opt2.textContent = `${p.name} (${p.pos} - ${p.skill}★)`;
      this.pairP2Select.appendChild(opt2);
    });

    // 3. Cập nhật danh sách cặp thủ công
    this.customPairsCount.textContent = this.customPairs.length;
    this.customPairsListEl.innerHTML = '';

    if (this.customPairs.length === 0) {
      this.customPairsListEl.innerHTML = '<p class="placeholder-msg">Chưa có cặp đối đầu cố định nào được thiết lập.</p>';
    } else {
      this.customPairs.forEach(cp => {
        const p1 = this.players.find(p => p.id === cp.p1);
        const p2 = this.players.find(p => p.id === cp.p2);

        const card = document.createElement('div');
        card.className = 'pair-card-item';
        card.innerHTML = `
          <div class="pair-names">
            <span>🔵 ${p1 ? p1.name : 'Đã xóa'}</span>
            <span class="vs-badge">VS</span>
            <span>🔴 ${p2 ? p2.name : 'Đã xóa'}</span>
          </div>
          <button class="btn-del-player" data-pair-id="${cp.id}" title="Hủy khóa cặp">
            <i class="fa-solid fa-xmark"></i>
          </button>
        `;
        card.querySelector('button').addEventListener('click', () => {
          this.deleteCustomPair(cp.id);
        });
        this.customPairsListEl.appendChild(card);
      });
    }
  }

  // =================== MATCH HISTORY RENDERING ===================
  renderHistory() {
    if (!this.matchHistoryList || !this.matchHistoryCount) return;

    this.matchHistoryCount.textContent = this.matchHistory.length;
    this.matchHistoryList.innerHTML = '';

    if (this.matchHistory.length === 0) {
      this.matchHistoryList.innerHTML = '<p class="placeholder-msg">Chưa có trận nào được lưu. Nhấn "CHIA ĐỘI CÂN KÈO NGAY" để tạo trận mới!</p>';
      return;
    }

    this.matchHistory.forEach(match => {
      const card = document.createElement('div');
      let resultClass = '';
      let resultBadge = '';

      if (match.result === 'blue') {
        resultClass = 'has-result result-blue';
        resultBadge = '<span class="match-result-badge badge-blue-win"><i class="fa-solid fa-trophy"></i> Xanh Thắng</span>';
      } else if (match.result === 'red') {
        resultClass = 'has-result result-red';
        resultBadge = '<span class="match-result-badge badge-red-win"><i class="fa-solid fa-trophy"></i> Đỏ Thắng</span>';
      } else if (match.result === 'draw') {
        resultClass = 'has-result result-draw';
        resultBadge = '<span class="match-result-badge badge-draw"><i class="fa-solid fa-handshake"></i> Hòa</span>';
      } else {
        resultBadge = '<span class="match-result-badge badge-pending"><i class="fa-solid fa-clock"></i> Chưa có KQ</span>';
      }

      card.className = `match-history-card ${resultClass}`;

      // Làm sạch và kiểm tra tỷ số chặt chẽ
      const hasGoalBlue = typeof match.goalScoreBlue === 'number' && !isNaN(match.goalScoreBlue);
      const hasGoalRed = typeof match.goalScoreRed === 'number' && !isNaN(match.goalScoreRed);

      let scoreDisplay = '';
      if (hasGoalBlue && hasGoalRed) {
        scoreDisplay = `<div class="match-big-score"><span class="goal-blue">${match.goalScoreBlue}</span> <span class="score-sep">-</span> <span class="goal-red">${match.goalScoreRed}</span></div>`;
      } else if (match.result === 'blue' || match.result === 'red' || match.result === 'draw') {
        const text = match.result === 'draw' ? 'HÒA' : (match.result === 'blue' ? 'XANH THẮNG' : 'ĐỎ THẮNG');
        scoreDisplay = `<div class="match-vs-tag">${text}</div>`;
      } else {
        scoreDisplay = `<div class="match-vs-tag pending"><i class="fa-regular fa-clock"></i> Chưa có tỷ số</div>`;
      }

      const updateBtnHtml = match.result
        ? `<button class="btn-update-result" data-match-id="${match.matchId}" title="Sửa kết quả"><i class="fa-solid fa-pen-to-square"></i> Sửa KQ</button>`
        : `<button class="btn-update-result btn-needs-result" data-match-id="${match.matchId}" title="Nhập kết quả trận đấu"><i class="fa-solid fa-trophy"></i> Nhập Kết Quả</button>`;

      card.innerHTML = `
        <div class="match-card-top">
          <span class="match-date"><i class="fa-regular fa-calendar"></i> ${match.date} ${match.time}</span>
          ${resultBadge}
        </div>
        <div class="match-card-teams">
          <div class="match-team-info">
            <span class="match-team-label blue-label">🔵 ĐỘI XANH</span>
            <span class="match-team-count">${match.teamBlue.length} người · ${match.blueScore}đ</span>
          </div>
          <div class="match-score-display">${scoreDisplay}</div>
          <div class="match-team-info">
            <span class="match-team-label red-label">ĐỘI ĐỎ 🔴</span>
            <span class="match-team-count">${match.teamRed.length} người · ${match.redScore}đ</span>
          </div>
        </div>
        <div class="match-card-actions">
          <button class="btn-view-detail" data-match-id="${match.matchId}" title="Xem đội hình">
            <i class="fa-solid fa-users"></i> Đội Hình
          </button>
          ${updateBtnHtml}
          <button class="btn-delete-match" data-match-id="${match.matchId}" title="Xóa trận này">
            <i class="fa-solid fa-trash-can"></i>
          </button>
        </div>
      `;

      card.querySelector('.btn-view-detail').addEventListener('click', () => {
        this.openHistoryDetailModal(match.matchId);
      });
      card.querySelector('.btn-update-result').addEventListener('click', () => {
        this.openResultModal(match.matchId);
      });
      card.querySelector('.btn-delete-match').addEventListener('click', () => {
        this.deleteMatch(match.matchId);
      });

      this.matchHistoryList.appendChild(card);
    });
  }

  // =================== RESULT MODAL ===================
  openResultModal(matchId) {
    const match = this.matchHistory.find(m => m.matchId === matchId);
    if (!match) return;

    this.resultMatchId.value = matchId;
    this.resultMatchInfo.innerHTML = `<strong>${match.date} ${match.time}</strong> — 🔵 Xanh (${match.teamBlue.length}) vs Đỏ (${match.teamRed.length}) 🔴`;

    this.selectedWinner = match.result || null;
    this.winnerBtns.forEach(btn => {
      btn.classList.remove('selected');
      if (match.result && btn.dataset.winner === match.result) {
        btn.classList.add('selected');
      }
    });

    this.resultGoalBlue.value = match.goalScoreBlue !== null ? match.goalScoreBlue : '';
    this.resultGoalRed.value = match.goalScoreRed !== null ? match.goalScoreRed : '';

    this.resultModal.classList.add('active');
  }

  closeResultModal() {
    this.resultModal.classList.remove('active');
    this.selectedWinner = null;
  }

  saveMatchResult() {
    const matchId = this.resultMatchId.value;
    if (!matchId) return;

    if (!this.selectedWinner) {
      alert('Vui lòng chọn đội thắng hoặc hòa!');
      return;
    }

    const match = this.matchHistory.find(m => m.matchId === matchId);
    if (!match) return;

    match.result = this.selectedWinner;
    const goalBlue = parseInt(this.resultGoalBlue.value, 10);
    const goalRed = parseInt(this.resultGoalRed.value, 10);
    match.goalScoreBlue = isNaN(goalBlue) ? null : goalBlue;
    match.goalScoreRed = isNaN(goalRed) ? null : goalRed;

    this.saveMatchHistory();
    this.renderHistory();
    this.renderPlayerStats();
    this.updateMatchActionUI();
    this.closeResultModal();

    const resultText = this.selectedWinner === 'blue' ? '🔵 Đội Xanh Thắng' :
                       this.selectedWinner === 'red' ? '🔴 Đội Đỏ Thắng' : '🤝 Hòa';
    this.showToast(`🏆 Đã cập nhật: ${resultText}`);
  }

  // =================== HISTORY DETAIL MODAL ===================
  openHistoryDetailModal(matchId) {
    const match = this.matchHistory.find(m => m.matchId === matchId);
    if (!match) return;

    let resultText = '';
    if (match.result === 'blue') resultText = '<span style="color:var(--team-blue)">🔵 Đội Xanh Thắng</span>';
    else if (match.result === 'red') resultText = '<span style="color:var(--team-red)">🔴 Đội Đỏ Thắng</span>';
    else if (match.result === 'draw') resultText = '<span style="color:#f59e0b">🤝 Hòa</span>';
    else resultText = '<span style="color:var(--text-dim)">Chưa có kết quả</span>';

    let scoreText = '';
    if (match.goalScoreBlue !== null && match.goalScoreRed !== null) {
      scoreText = ` — Tỷ số: <strong>${match.goalScoreBlue} - ${match.goalScoreRed}</strong>`;
    }

    const renderTeamList = (team) => {
      return team.map((p, i) => `
        <div class="history-detail-player">
          <span>${i + 1}.</span>
          <span><strong>${p.name}</strong></span>
          <span class="pos-tag pos-${p.pos}">${p.pos}</span>
          <span style="color:#f59e0b">${'★'.repeat(p.skill)}</span>
          ${p.isMvp ? '<span style="color:#f59e0b"><i class="fa-solid fa-crown"></i></span>' : ''}
        </div>
      `).join('');
    };

    this.historyDetailBody.innerHTML = `
      <div style="text-align:center; margin-bottom:12px; color:var(--text-muted); font-size:0.85rem;">
        <i class="fa-regular fa-calendar"></i> ${match.date} ${match.time} — ${resultText}${scoreText}
      </div>
      <div class="history-detail-teams">
        <div class="history-detail-team blue-detail">
          <h4><i class="fa-solid fa-shield"></i> Đội Xanh (${match.blueScore}đ)</h4>
          ${renderTeamList(match.teamBlue)}
        </div>
        <div class="history-detail-team red-detail">
          <h4><i class="fa-solid fa-shield"></i> Đội Đỏ (${match.redScore}đ)</h4>
          ${renderTeamList(match.teamRed)}
        </div>
      </div>
    `;

    this.historyDetailModal.classList.add('active');
  }

  closeHistoryDetailModal() {
    this.historyDetailModal.classList.remove('active');
  }

  deleteMatch(matchId) {
    if (!confirm('Xóa trận đấu này khỏi lịch sử?')) return;

    this.matchHistory = this.matchHistory.filter(m => m.matchId !== matchId);
    if (this.currentLockedMatchId === matchId) {
      this.currentMatchLocked = false;
      this.currentLockedMatchId = null;
    }
    this.saveMatchHistory();
    this.renderHistory();
    this.renderPlayerStats();
    this.updateMatchActionUI();
    this.showToast('Đã xóa trận đấu');
  }

  // =================== PLAYER STATISTICS ===================
  renderPlayerStats() {
    if (!this.playerStatsTable) return;

    const matchesWithResult = this.matchHistory.filter(m => m.result);

    if (matchesWithResult.length === 0) {
      this.playerStatsTable.innerHTML = '<p class="placeholder-msg">Chưa có dữ liệu thống kê. Hãy chia đội và cập nhật kết quả trận đấu!</p>';
      return;
    }

    const statsMap = {};

    matchesWithResult.forEach(match => {
      const processTeam = (team, teamSide) => {
        team.forEach(player => {
          if (!statsMap[player.id]) {
            statsMap[player.id] = {
              id: player.id,
              name: player.name,
              matches: 0,
              wins: 0,
              losses: 0,
              draws: 0
            };
          }

          const stat = statsMap[player.id];
          stat.name = player.name;
          stat.matches++;

          if (match.result === 'draw') {
            stat.draws++;
          } else if (match.result === teamSide) {
            stat.wins++;
          } else {
            stat.losses++;
          }
        });
      };

      processTeam(match.teamBlue, 'blue');
      processTeam(match.teamRed, 'red');
    });

    const statsArray = Object.values(statsMap).sort((a, b) => {
      const rateA = a.matches > 0 ? a.wins / a.matches : 0;
      const rateB = b.matches > 0 ? b.wins / b.matches : 0;
      if (rateB !== rateA) return rateB - rateA;
      if (b.wins !== a.wins) return b.wins - a.wins;
      return b.matches - a.matches;
    });

    let tableHtml = `
      <table class="stats-table">
        <thead>
          <tr>
            <th>Cầu Thủ</th>
            <th>Trận</th>
            <th>Thắng</th>
            <th>Thua</th>
            <th>Hòa</th>
            <th>Tỷ Lệ</th>
          </tr>
        </thead>
        <tbody>
    `;

    statsArray.forEach((stat, idx) => {
      const rank = idx + 1;
      let rankClass = 'rank-default';
      let rankIcon = rank;
      if (rank === 1) { rankClass = 'rank-1'; rankIcon = '🥇'; }
      else if (rank === 2) { rankClass = 'rank-2'; rankIcon = '🥈'; }
      else if (rank === 3) { rankClass = 'rank-3'; rankIcon = '🥉'; }

      const winRate = stat.matches > 0 ? Math.round((stat.wins / stat.matches) * 100) : 0;

      tableHtml += `
        <tr>
          <td>
            <div class="stats-rank-cell">
              <span class="stats-rank-badge ${rankClass}">${rankIcon}</span>
              <span class="stats-player-name">${stat.name}</span>
            </div>
          </td>
          <td>${stat.matches}</td>
          <td class="stats-win">${stat.wins}</td>
          <td class="stats-loss">${stat.losses}</td>
          <td class="stats-draw">${stat.draws}</td>
          <td class="stats-win-rate">${winRate}%</td>
        </tr>
      `;
    });

    tableHtml += '</tbody></table>';
    this.playerStatsTable.innerHTML = tableHtml;
  }

  // =================== MANUAL TEAM DIVISION ===================
  openManualModal() {
    const attending = this.players.filter(p => p.attending);
    if (attending.length < 2) {
      alert('Cần ít nhất 2 cầu thủ có mặt để chia đội thủ công!');
      return;
    }

    const attendingMap = new Map(attending.map(p => [p.id, p]));

    // Nếu đã có currentResult thì load đội hình hiện tại để tiện tinh chỉnh
    if (this.currentResult && this.currentResult.teamBlue && this.currentResult.teamRed) {
      this.manualBlue = this.currentResult.teamBlue
        .map(p => attendingMap.get(p.id))
        .filter(Boolean);

      this.manualRed = this.currentResult.teamRed
        .map(p => attendingMap.get(p.id))
        .filter(Boolean);

      const assignedIds = new Set([...this.manualBlue.map(p => p.id), ...this.manualRed.map(p => p.id)]);
      this.manualUnassigned = attending.filter(p => !assignedIds.has(p.id));
    } else {
      this.manualBlue = [];
      this.manualRed = [];
      this.manualUnassigned = [...attending];
    }

    this.renderManualModal();
    this.manualModal.classList.add('active');
  }

  closeManualModal() {
    this.manualModal.classList.remove('active');
  }

  moveToBlue(playerId) {
    let player = null;
    const uIdx = this.manualUnassigned.findIndex(p => p.id === playerId);
    if (uIdx !== -1) {
      player = this.manualUnassigned.splice(uIdx, 1)[0];
    } else {
      const rIdx = this.manualRed.findIndex(p => p.id === playerId);
      if (rIdx !== -1) {
        player = this.manualRed.splice(rIdx, 1)[0];
      }
    }
    if (player) {
      this.manualBlue.push(player);
      this.renderManualModal();
    }
  }

  moveToRed(playerId) {
    let player = null;
    const uIdx = this.manualUnassigned.findIndex(p => p.id === playerId);
    if (uIdx !== -1) {
      player = this.manualUnassigned.splice(uIdx, 1)[0];
    } else {
      const bIdx = this.manualBlue.findIndex(p => p.id === playerId);
      if (bIdx !== -1) {
        player = this.manualBlue.splice(bIdx, 1)[0];
      }
    }
    if (player) {
      this.manualRed.push(player);
      this.renderManualModal();
    }
  }

  moveToUnassigned(playerId) {
    let player = null;
    const bIdx = this.manualBlue.findIndex(p => p.id === playerId);
    if (bIdx !== -1) {
      player = this.manualBlue.splice(bIdx, 1)[0];
    } else {
      const rIdx = this.manualRed.findIndex(p => p.id === playerId);
      if (rIdx !== -1) {
        player = this.manualRed.splice(rIdx, 1)[0];
      }
    }
    if (player) {
      this.manualUnassigned.push(player);
      this.renderManualModal();
    }
  }

  autoFillRemaining() {
    if (this.manualUnassigned.length === 0) {
      this.showToast('Tất cả cầu thủ đã được xếp vào đội!');
      return;
    }

    let blueScore = this.manualBlue.reduce((acc, p) => acc + (SKILL_SCORES[p.skill] || 50), 0);
    let redScore = this.manualRed.reduce((acc, p) => acc + (SKILL_SCORES[p.skill] || 50), 0);

    // Sắp xếp người chưa phân đội theo trình độ giảm dần
    const sorted = [...this.manualUnassigned].sort((a, b) => {
      if (b.skill !== a.skill) return b.skill - a.skill;
      return a.pos.localeCompare(b.pos);
    });

    while (sorted.length > 0) {
      const p = sorted.shift();
      const score = SKILL_SCORES[p.skill] || 50;

      // Ưu tiên cân bằng số lượng người trước, sau đó cân bằng điểm
      if (this.manualBlue.length < this.manualRed.length) {
        this.manualBlue.push(p);
        blueScore += score;
      } else if (this.manualRed.length < this.manualBlue.length) {
        this.manualRed.push(p);
        redScore += score;
      } else {
        // Cùng số người thì đội nào điểm thấp hơn sẽ nhận
        if (blueScore <= redScore) {
          this.manualBlue.push(p);
          blueScore += score;
        } else {
          this.manualRed.push(p);
          redScore += score;
        }
      }
    }

    this.manualUnassigned = [];
    this.renderManualModal();
    this.showToast('✨ Đã tự động cân bằng người còn lại vào 2 đội!');
  }

  resetManualTeams() {
    this.manualUnassigned = [...this.manualBlue, ...this.manualRed, ...this.manualUnassigned];
    this.manualBlue = [];
    this.manualRed = [];
    this.renderManualModal();
  }

  applyManualTeams() {
    if (this.manualBlue.length === 0 || this.manualRed.length === 0) {
      alert('Mỗi đội cần có ít nhất 1 cầu thủ!');
      return;
    }

    const blueScore = this.manualBlue.reduce((acc, p) => acc + (SKILL_SCORES[p.skill] || 50), 0);
    const redScore = this.manualRed.reduce((acc, p) => acc + (SKILL_SCORES[p.skill] || 50), 0);

    // Ghép cặp đối đầu tương ứng theo thứ tự trình độ
    const sortedBlue = [...this.manualBlue].sort((a, b) => (SKILL_SCORES[b.skill] || 50) - (SKILL_SCORES[a.skill] || 50));
    const sortedRed = [...this.manualRed].sort((a, b) => (SKILL_SCORES[b.skill] || 50) - (SKILL_SCORES[a.skill] || 50));
    const maxLen = Math.max(sortedBlue.length, sortedRed.length);
    const pairedResults = [];

    for (let i = 0; i < maxLen; i++) {
      pairedResults.push({
        blue: sortedBlue[i] || null,
        red: sortedRed[i] || null,
        isManual: true
      });
    }

    this.currentResult = {
      teamBlue: [...this.manualBlue],
      teamRed: [...this.manualRed],
      blueScore,
      redScore,
      pairs: pairedResults,
      timestamp: new Date().toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit' }),
      isManual: true
    };

    if (this.db) {
      this.db.ref('football/currentResult').set(this.currentResult).catch(e => console.warn('Lỗi ghi Firebase:', e));
    }

    this.currentMatchLocked = false;
    this.currentLockedMatchId = null;
    this.renderResult();
    this.updateMatchActionUI();

    this.closeManualModal();
    this.showToast('⚽ Đã tạo đội hình! Bấm "Chốt Đội Hình" để lưu trận');
  }

  renderManualModal() {
    const blueScore = this.manualBlue.reduce((acc, p) => acc + (SKILL_SCORES[p.skill] || 50), 0);
    const redScore = this.manualRed.reduce((acc, p) => acc + (SKILL_SCORES[p.skill] || 50), 0);

    // Cập nhật Header & Điểm số
    this.manualBlueCount.textContent = this.manualBlue.length;
    this.manualBlueScore.textContent = blueScore;
    this.manualRedCount.textContent = this.manualRed.length;
    this.manualRedScore.textContent = redScore;

    this.manualBluePill.textContent = `${this.manualBlue.length}`;
    this.manualRedPill.textContent = `${this.manualRed.length}`;
    this.manualUnassignedPill.textContent = `${this.manualUnassigned.length}`;

    const diff = Math.abs(blueScore - redScore);
    if (this.manualBlue.length === 0 && this.manualRed.length === 0) {
      this.manualDiffBadge.textContent = 'Chưa xếp cầu thủ';
      this.manualDiffBadge.className = 'manual-diff-badge';
    } else if (diff <= 15) {
      this.manualDiffBadge.innerHTML = `<i class="fa-solid fa-check"></i> Cực Cân (Lệch ${diff}đ)`;
      this.manualDiffBadge.className = 'manual-diff-badge balanced';
    } else {
      this.manualDiffBadge.innerHTML = `<i class="fa-solid fa-scale-balanced"></i> Lệch ${diff}đ`;
      this.manualDiffBadge.className = 'manual-diff-badge';
    }

    const total = blueScore + redScore;
    const bluePct = total > 0 ? (blueScore / total) * 100 : 50;
    const redPct = 100 - bluePct;
    this.manualBarBlue.style.width = `${bluePct}%`;
    this.manualBarRed.style.width = `${redPct}%`;

    // Render danh sách Đội Xanh
    this.manualBlueList.innerHTML = '';
    if (this.manualBlue.length === 0) {
      this.manualBlueList.innerHTML = '<p class="empty-col-msg">Chưa có ai.<br>Bấm <strong>🔵 Xanh</strong> ở giữa để thêm.</p>';
    } else {
      this.manualBlue.forEach(p => {
        const item = document.createElement('div');
        item.className = 'manual-player-card is-blue';
        const starStr = '★'.repeat(p.skill);
        const mvpTag = p.isMvp ? '<i class="fa-solid fa-crown" style="color:#f59e0b;font-size:0.7rem;"></i>' : '';
        item.innerHTML = `
          <div class="manual-card-info">
            <div class="manual-card-avatar" style="background:var(--team-blue)">${p.name.charAt(0).toUpperCase()}</div>
            <div>
              <div class="manual-card-name">${p.name} ${mvpTag}</div>
              <div style="font-size:0.68rem; color:#94a3b8;">
                <span class="pos-tag pos-${p.pos}">${p.pos}</span>
                <span style="color:#f59e0b">${starStr}</span>
              </div>
            </div>
          </div>
          <div class="manual-card-actions">
            <button type="button" class="btn-move-team btn-move-red" title="Chuyển sang Đội Đỏ">
              🔴 Đỏ
            </button>
            <button type="button" class="btn-unassign" title="Bỏ chọn (chuyển về hàng chờ)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        `;
        item.querySelector('.btn-move-red').addEventListener('click', () => this.moveToRed(p.id));
        item.querySelector('.btn-unassign').addEventListener('click', () => this.moveToUnassigned(p.id));
        this.manualBlueList.appendChild(item);
      });
    }

    // Render danh sách Chưa Phân Đội
    this.manualUnassignedList.innerHTML = '';
    if (this.manualUnassigned.length === 0) {
      this.manualUnassignedList.innerHTML = '<p class="empty-col-msg">🎉 Đã xếp hết cầu thủ vào đội!</p>';
    } else {
      this.manualUnassigned.forEach(p => {
        const item = document.createElement('div');
        item.className = 'manual-player-card';
        const starStr = '★'.repeat(p.skill);
        const mvpTag = p.isMvp ? '<i class="fa-solid fa-crown" style="color:#f59e0b;font-size:0.7rem;"></i>' : '';
        item.innerHTML = `
          <div class="manual-card-info">
            <div class="manual-card-avatar">${p.name.charAt(0).toUpperCase()}</div>
            <div>
              <div class="manual-card-name">${p.name} ${mvpTag}</div>
              <div style="font-size:0.68rem; color:#94a3b8;">
                <span class="pos-tag pos-${p.pos}">${p.pos}</span>
                <span style="color:#f59e0b">${starStr}</span>
              </div>
            </div>
          </div>
          <div class="manual-card-actions">
            <button type="button" class="btn-move-team btn-move-blue" title="Chọn vào Đội Xanh">
              🔵 Xanh
            </button>
            <button type="button" class="btn-move-team btn-move-red" title="Chọn vào Đội Đỏ">
              🔴 Đỏ
            </button>
          </div>
        `;
        item.querySelector('.btn-move-blue').addEventListener('click', () => this.moveToBlue(p.id));
        item.querySelector('.btn-move-red').addEventListener('click', () => this.moveToRed(p.id));
        this.manualUnassignedList.appendChild(item);
      });
    }

    // Render danh sách Đội Đỏ
    this.manualRedList.innerHTML = '';
    if (this.manualRed.length === 0) {
      this.manualRedList.innerHTML = '<p class="empty-col-msg">Chưa có ai.<br>Bấm <strong>🔴 Đỏ</strong> ở giữa để thêm.</p>';
    } else {
      this.manualRed.forEach(p => {
        const item = document.createElement('div');
        item.className = 'manual-player-card is-red';
        const starStr = '★'.repeat(p.skill);
        const mvpTag = p.isMvp ? '<i class="fa-solid fa-crown" style="color:#f59e0b;font-size:0.7rem;"></i>' : '';
        item.innerHTML = `
          <div class="manual-card-info">
            <div class="manual-card-avatar" style="background:var(--team-red)">${p.name.charAt(0).toUpperCase()}</div>
            <div>
              <div class="manual-card-name">${p.name} ${mvpTag}</div>
              <div style="font-size:0.68rem; color:#94a3b8;">
                <span class="pos-tag pos-${p.pos}">${p.pos}</span>
                <span style="color:#f59e0b">${starStr}</span>
              </div>
            </div>
          </div>
          <div class="manual-card-actions">
            <button type="button" class="btn-move-team btn-move-blue" title="Chuyển sang Đội Xanh">
              🔵 Xanh
            </button>
            <button type="button" class="btn-unassign" title="Bỏ chọn (chuyển về hàng chờ)">
              <i class="fa-solid fa-xmark"></i>
            </button>
          </div>
        `;
        item.querySelector('.btn-move-blue').addEventListener('click', () => this.moveToBlue(p.id));
        item.querySelector('.btn-unassign').addEventListener('click', () => this.moveToUnassigned(p.id));
        this.manualRedList.appendChild(item);
      });
    }
  }
}

// Khởi chạy khi tài liệu tải xong
document.addEventListener('DOMContentLoaded', () => {
  window.footballApp = new FootballTeamApp();
});
