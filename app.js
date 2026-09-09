/**
 * FOOTBALL PAIR MATCHER
 * Thuật toán ghép cặp tương đương và phân bổ 2 đội cân bằng
 */

// Danh sách 12 cầu thủ chính thức mặc định của đội
const DEFAULT_PLAYERS = [
  { id: 'p1', name: 'Thiên Nhựt', skill: 5, pos: 'ALL', attending: true },
  { id: 'p2', name: 'Trương Thuận', skill: 5, pos: 'ALL', attending: true },
  { id: 'p3', name: 'Mai Con', skill: 5, pos: 'GK', attending: true },
  { id: 'p4', name: 'Mai Kiên', skill: 3, pos: 'ALL', attending: true },
  { id: 'p5', name: 'Nhựt Tiến', skill: 4, pos: 'ALL', attending: true },
  { id: 'p6', name: 'Trung Trí', skill: 4, pos: 'MF', attending: true },
  { id: 'p7', name: 'Sơn Đại Ca', skill: 3, pos: 'DF', attending: true },
  { id: 'p8', name: 'Nhứt Đạt', skill: 3, pos: 'DF', attending: true },
  { id: 'p9', name: 'Minh Trường', skill: 3, pos: 'ALL', attending: true },
  { id: 'p10', name: 'Trí Dũng', skill: 4, pos: 'ALL', attending: true },
  { id: 'p11', name: 'Trâu Đen', skill: 3, pos: 'GK', attending: true },
  { id: 'p12', name: 'Anh Lượng', skill: 3, pos: 'ALL', attending: true }
];

const SKILL_SCORES = { 5: 95, 4: 80, 3: 65, 2: 50, 1: 35 };

class FootballTeamApp {
  constructor() {
    this.players = this.loadPlayers();
    this.customPairs = this.loadCustomPairs();
    this.currentResult = null;

    this.initElements();
    this.bindEvents();
    this.render();
  }

  // LocalStorage Helpers
  loadPlayers() {
    const saved = localStorage.getItem('fb_players_v3');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return JSON.parse(JSON.stringify(DEFAULT_PLAYERS));
  }

  savePlayers() {
    localStorage.setItem('fb_players_v3', JSON.stringify(this.players));
  }

  loadCustomPairs() {
    const saved = localStorage.getItem('fb_custom_pairs');
    if (saved) {
      try { return JSON.parse(saved); } catch (e) {}
    }
    return [];
  }

  saveCustomPairs() {
    localStorage.setItem('fb_custom_pairs', JSON.stringify(this.customPairs));
  }

  initElements() {
    // Form & List
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

    // Modal & Tabs
    this.rulesModal = document.getElementById('rules-modal');
    this.btnQuickRules = document.getElementById('btn-quick-rules');
    this.btnCloseModal = document.getElementById('btn-close-modal');
    this.btnModalOk = document.getElementById('btn-modal-ok');
    this.toastEl = document.getElementById('toast');
    this.tabBtns = document.querySelectorAll('.tab-btn');
    this.tabContents = document.querySelectorAll('.tab-content');

    // Edit Player Modal Elements
    this.editPlayerModal = document.getElementById('edit-player-modal');
    this.editPlayerForm = document.getElementById('edit-player-form');
    this.editPlayerIdInput = document.getElementById('edit-player-id');
    this.editPlayerNameInput = document.getElementById('edit-player-name');
    this.editPlayerSkillSelect = document.getElementById('edit-player-skill');
    this.editPlayerPosSelect = document.getElementById('edit-player-pos');
    this.btnCloseEditModal = document.getElementById('btn-close-edit-modal');
    this.btnCancelEdit = document.getElementById('btn-cancel-edit');
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
        this.savePlayers();
        this.saveCustomPairs();
        this.render();
        this.showToast('Đã khôi phục danh sách mẫu');
      }
    });

    // Thêm cặp thủ công
    this.btnAddPair.addEventListener('click', () => this.addCustomPair());

    // Nút chia đội
    this.btnGenerate.addEventListener('click', () => this.generateBalancedTeams());
    this.btnReroll.addEventListener('click', () => this.rerollTeams());

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

    this.editPlayerModal.classList.add('active');
    setTimeout(() => {
      this.editPlayerNameInput.focus();
      this.editPlayerNameInput.select();
    }, 100);
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

    const player = this.players.find(p => p.id === id);
    if (player) {
      player.name = name;
      player.skill = skill;
      player.pos = pos;
      this.savePlayers();

      // Nếu đang có kết quả chia đội, cập nhật luôn hiển thị kết quả
      if (this.currentResult) {
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

    this.renderResult();
    this.showToast('⚽ Đã chia cặp cân bằng thành công!');
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
  }

  createPitchCard(player, teamColor) {
    const card = document.createElement('div');
    card.className = 'pitch-player-card';

    const initial = player.name.trim().charAt(0).toUpperCase();
    const starStr = '★'.repeat(player.skill);

    card.innerHTML = `
      <div class="pitch-jersey">${initial}</div>
      <div>
        <div class="pitch-card-name">${player.name}</div>
        <div class="pitch-card-sub">
          <span class="pos-tag pos-${player.pos}">${player.pos}</span>
          <span>${starStr}</span>
        </div>
      </div>
    `;
    return card;
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
      text += `  ${i + 1}. ${p.name} [${p.pos}] (${'★'.repeat(p.skill)})\n`;
    });

    text += `\n🔴 ĐỘI ĐỎ (${teamRed.length} người - ${redScore}đ):\n`;
    teamRed.forEach((p, i) => {
      text += `  ${i + 1}. ${p.name} [${p.pos}] (${'★'.repeat(p.skill)})\n`;
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

      item.innerHTML = `
        <div class="player-info-left">
          <input type="checkbox" class="checkbox-custom" ${p.attending ? 'checked' : ''} data-id="${p.id}" />
          <div class="player-avatar">${p.name.charAt(0).toUpperCase()}</div>
          <div>
            <span class="player-name" title="Bấm để sửa tên & thông tin">${p.name}</span>
            <span class="pos-tag pos-${p.pos}">${p.pos}</span>
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
}

// Khởi chạy khi tài liệu tải xong
document.addEventListener('DOMContentLoaded', () => {
  window.footballApp = new FootballTeamApp();
});
