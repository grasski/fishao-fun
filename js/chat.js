/**
 * FISHAO - Private 1-on-1 Player Chat & Moderation (js/chat.js)
 * ----------------------------------------------------------------------
 * Implements GDPR-safe, plain-text 1-on-1 messaging between signed-in
 * players with:
 *   - Double opt-in structured contact requests (no free text / no emails)
 *   - Deterministic pair IDs (minUid_maxUid) to prevent duplicate spam
 *   - Client + Firestore Rules enforcement: max 300 chars, plain text only,
 *     zero URLs / HTML / files / images, 2s cooldown, ban enforcement
 *   - 14-day message expiration (kept clean by nightly GitHub Actions)
 *   - 1-click Block, Report (Notice & Action), and Admin moderation tools
 */

var CHAT_MAX_MSG_LEN = 300;
var CHAT_MAX_NOTE_LEN = 300;
var CHAT_RETENTION_DAYS = 14;
var CHAT_REPORT_RETENTION_DAYS = 90;
var CHAT_REASONS = ['meetup', 'backyard', 'club', 'trading', 'discord', 'general'];
var CHAT_REPORT_CATEGORIES = ['illegal_content', 'phishing_scam', 'harassment', 'spam', 'other'];
var CHAT_INTRO_SEEN_KEY = 'fishao_chat_intro_seen_v1';
var CHAT_INTRO_EXPIRES_MS = Date.parse('2026-11-25T23:59:59Z'); // 7 days from feature launch (2026-11-18)
var _chatIntroStartupChecked = false;

var chatUnsubscribe = null;
var chatMessagesUnsubscribe = null;
var chatBanUnsubscribe = null;
var chatAdminReportsUnsubscribe = null;

var allMyChats = [];
var activeChatId = null;
var activeChatMessages = [];
var chatRequestTargetPlayer = null;
var chatReportTargetChatId = null;
var currentChatBan = null;
var adminOpenReportsCount = 0;
var _adminSeenReportIds = new Set();
var _adminReportsWatcherUid = null;
var isChatSafetyExpanded = false;
var chatFilterMode = 'all'; // 'all' | 'unread' | 'requests' | 'blocked'
var chatPlayerSearchQuery = '';
var _isLoadingChatPlayersDir = false;
var isSendingChatMsg = false;
var isSubmittingChatRequest = false;
var _boundMessagesChatId = null;
var _renderedChatPaneId = null;
var _renderedChatPaneStatus = null;
var _renderedChatSafetyOpen = null;
var _renderedChatBanState = null;
var _renderedChatPeerDeleted = null;
var _lastMarkedReadMsgMs = {};
var _lastChatsStatusSig = '';
var _deletedChatUserUids = new Set();
var _verifiedChatUserUids = new Set();
var _verifyingChatUserUids = new Set();

function getChatPairId(uidA, uidB) {
  if (!uidA || !uidB) return '';
  return (uidA < uidB) ? (uidA + '_' + uidB) : (uidB + '_' + uidA);
}

function getOtherChatParticipantUid(chat, myUid) {
  if (!chat || !Array.isArray(chat.participants)) return '';
  var selfUid = myUid || (currentUser ? currentUser.uid : '');
  return (chat.participants[0] === selfUid) ? (chat.participants[1] || '') : (chat.participants[0] || '');
}

function getMyChatParticipantInfo() {
  var nick = (userProfile && userProfile.displayName) ? String(userProfile.displayName).trim() : '';
  if (!nick) nick = t('user_default_player');
  nick = nick.slice(0, 40);
  var av = (userProfile && userProfile.avatarUrl) ? String(userProfile.avatarUrl).trim() : '🎣';
  if (!av || /[<>\"'`]/.test(av) || /^(http:|javascript:|data:|vbscript:)/i.test(av)) {
    av = '🎣';
  }
  var lang = normalizePlayerLang(userProfile && userProfile.preferredLang);
  var out = {
    displayName: nick,
    avatarUrl: av.slice(0, 500)
  };
  if (lang) out.lang = lang;
  return out;
}

function isChatUserKnownDeleted(uid) {
  if (!uid) return false;
  if (_deletedChatUserUids.has(uid)) return true;
  for (var i = 0; i < allMyChats.length; i++) {
    var c = allMyChats[i];
    if (c && c.participantInfo && c.participantInfo[uid] && c.participantInfo[uid].deleted === true) {
      _deletedChatUserUids.add(uid);
      return true;
    }
  }
  return false;
}

function markChatUserDeleted(uid) {
  if (!uid) return;
  _deletedChatUserUids.add(uid);
  purgeDeletedPlayerFromLocalList(uid);
  var chatModal = document.getElementById('chatModalOverlay');
  if (chatModal && chatModal.classList.contains('active')) {
    renderChatSidebarList();
    renderChatActivePane();
  }
}

function purgeDeletedPlayerFromLocalList(uid) {
  if (!uid) return;
  var changed = false;
  if (typeof allPlayersList !== 'undefined' && Array.isArray(allPlayersList)) {
    var beforeLen = allPlayersList.length;
    allPlayersList = allPlayersList.filter(function (p) { return p.uid !== uid; });
    if (allPlayersList.length !== beforeLen) {
      changed = true;
      if (typeof savePlayersSessionCache === 'function' && typeof lastPlayersFetchTime !== 'undefined') {
        savePlayersSessionCache(lastPlayersFetchTime);
      }
    }
  }
  if (typeof _playerProfileCache !== 'undefined' && _playerProfileCache && typeof _playerProfileCache.delete === 'function') {
    _playerProfileCache.delete(uid);
  }
  if (changed && typeof currentView !== 'undefined' && currentView === 'players' && typeof renderPlayersList === 'function') {
    renderPlayersList();
  }
}

async function verifyChatPeerExists(uid) {
  if (!uid || !db || !currentUser || uid === currentUser.uid) return;
  if (_deletedChatUserUids.has(uid) || _verifiedChatUserUids.has(uid) || _verifyingChatUserUids.has(uid)) return;
  _verifyingChatUserUids.add(uid);
  try {
    var fsModule = await getFirestoreModule();
    var snap = await fsModule.getDoc(fsModule.doc(db, 'users', uid));
    if (snap.exists()) {
      _verifiedChatUserUids.add(uid);
    } else {
      _deletedChatUserUids.add(uid);
      purgeDeletedPlayerFromLocalList(uid);
      var chatModal = document.getElementById('chatModalOverlay');
      if (chatModal && chatModal.classList.contains('active')) {
        renderChatSidebarList();
        renderChatActivePane();
      }
    }
  } catch (err) {
    console.debug('Peer existence check skipped:', err);
  } finally {
    _verifyingChatUserUids.delete(uid);
  }
}

function getChatParticipantDisplay(chat, uid) {
  var info = (chat && chat.participantInfo && chat.participantInfo[uid]) ? chat.participantInfo[uid] : null;
  if ((info && info.deleted === true) || isChatUserKnownDeleted(uid)) {
    return {
      displayName: t('chat_deleted_player_name'),
      avatarUrl: '🎣',
      lang: '',
      isDeleted: true
    };
  }
  var listPlayer = (typeof allPlayersList !== 'undefined' && Array.isArray(allPlayersList))
    ? allPlayersList.find(function (p) { return p.uid === uid; })
    : null;
  var name = (listPlayer && listPlayer.displayName) || (info && info.displayName) || t('user_default_player');
  var avatar = (listPlayer && listPlayer.avatarUrl) || (info && info.avatarUrl) || '🎣';
  var lang = normalizePlayerLang((listPlayer && listPlayer.preferredLang) || (info && info.lang));
  return { displayName: name, avatarUrl: avatar, lang: lang, isDeleted: false };
}

function chatTsToMs(ts) {
  if (!ts) return 0;
  if (typeof ts.toMillis === 'function') return ts.toMillis();
  if (typeof ts.seconds === 'number') return ts.seconds * 1000;
  if (typeof ts === 'string') {
    var parsed = Date.parse(ts);
    return isNaN(parsed) ? 0 : parsed;
  }
  return 0;
}

function formatChatTimeLabel(ts) {
  var ms = chatTsToMs(ts);
  if (!ms) return '';
  try {
    var d = new Date(ms);
    var now = new Date();
    var sameDay = d.getFullYear() === now.getFullYear() &&
      d.getMonth() === now.getMonth() &&
      d.getDate() === now.getDate();
    var loc = (typeof getLocale === 'function') ? getLocale() : 'cs-CZ';
    if (sameDay) {
      return d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
    }
    return d.toLocaleDateString(loc, { day: 'numeric', month: 'numeric' }) + ' ' +
      d.toLocaleTimeString(loc, { hour: '2-digit', minute: '2-digit' });
  } catch (e) {
    return '';
  }
}

function hasAcceptedChatRules(uid) {
  var u = uid || (currentUser ? currentUser.uid : '');
  if (!u) return false;
  return safeStorageGet('fishao_chat_rules_v1_' + u) === '1';
}

function markChatRulesAccepted(uid) {
  var u = uid || (currentUser ? currentUser.uid : '');
  if (!u) return;
  safeStorageSet('fishao_chat_rules_v1_' + u, '1');
}

function isCurrentUserChatBanned() {
  if (!currentChatBan) return false;
  if (currentChatBan.bannedUntil === null || currentChatBan.bannedUntil === undefined) return true;
  return chatTsToMs(currentChatBan.bannedUntil) > Date.now();
}

function containsChatEmailAddress(rawText) {
  return /[a-z0-9._%+-]+\s*@\s*([a-z0-9.-]+\.[a-z]{2,}|(gmail|seznam|email|centrum|atlas|volny|post|outlook|hotmail|yahoo|icloud|proton|wp|onet|interia|o2)\b)/i.test(String(rawText || ''));
}

/**
 * Mirrors server-side firestore.rules plain-text validation:
 * - non-empty string up to maxLen (300)
 * - no < or > (HTML/script tags)
 * - no URLs, schemes, link shorteners or bare domains (emails preceded by @ are handled via warning prompt)
 */
function validateChatPlainTextClient(rawText, maxLen) {
  var limitLen = maxLen || CHAT_MAX_MSG_LEN;
  var txt = String(rawText || '').trim();
  if (!txt) {
    return { ok: false, errorKey: 'chat_err_empty' };
  }
  if (txt.length > limitLen) {
    return { ok: false, errorKey: 'chat_err_too_long' };
  }
  if (/[<>]/.test(txt)) {
    return { ok: false, errorKey: 'chat_err_no_html' };
  }
  if (/(https?:\/\/|ftp:\/\/|www\.|javascript:|vbscript:|data:|mailto:)/i.test(txt)) {
    return { ok: false, errorKey: 'chat_err_no_links' };
  }
  if (/(\bdiscord\.gg|\bdiscord\.com\/invite|\bt\.me|\bbit\.ly|\btinyurl\.com|\bgoo\.gl|\brb\.gy|\bshorturl\.at|\bis\.gd|\bcutt\.ly)/i.test(txt)) {
    return { ok: false, errorKey: 'chat_err_no_links' };
  }
  if (/(^|[^a-z0-9@._%+-])[a-z0-9-]+(\.[a-z0-9-]+)*\.(com|net|org|cz|sk|pl|eu|io|gg|xyz|info|biz|ru)\b/i.test(txt)) {
    return { ok: false, errorKey: 'chat_err_no_links' };
  }
  return { ok: true, text: txt };
}

function buildSafeChatPreview(text) {
  var clean = String(text || '').replace(/\s+/g, ' ').trim();
  if (clean.length <= 80) return clean;
  var slice = clean.slice(0, 77);
  var lastSpace = slice.lastIndexOf(' ');
  if (lastSpace >= 40) {
    slice = slice.slice(0, lastSpace);
  }
  return slice + '...';
}

function getChatReasonLabel(reason) {
  var map = {
    meetup: 'chat_reason_meetup',
    backyard: 'chat_reason_backyard',
    club: 'chat_reason_club',
    trading: 'chat_reason_trading',
    discord: 'chat_reason_discord',
    general: 'chat_reason_general'
  };
  return t(map[reason] || 'chat_reason_general');
}

function getChatReportCategoryLabel(cat) {
  var map = {
    illegal_content: 'chat_report_cat_illegal',
    phishing_scam: 'chat_report_cat_phishing',
    harassment: 'chat_report_cat_harassment',
    spam: 'chat_report_cat_spam',
    other: 'chat_report_cat_other'
  };
  return t(map[cat] || 'chat_report_cat_other');
}

function isChatUnread(chat, myUid) {
  if (!chat || !myUid) return false;
  var otherUid = getOtherChatParticipantUid(chat, myUid);
  var otherInfo = (chat.participantInfo && otherUid) ? chat.participantInfo[otherUid] : null;
  if ((otherInfo && otherInfo.deleted === true) || isChatUserKnownDeleted(otherUid)) {
    return false;
  }
  if (chat.status === 'pending' && chat.requestedBy !== myUid) {
    return true;
  }
  if (chat.status === 'accepted') {
    var readMs = (chat.lastReadAt && chat.lastReadAt[myUid]) ? chatTsToMs(chat.lastReadAt[myUid]) : 0;
    if (chat.lastMessageAt && chat.lastSenderUid && chat.lastSenderUid !== myUid) {
      var msgMs = chatTsToMs(chat.lastMessageAt);
      return msgMs > readMs;
    }
    // Outgoing request was accepted by peer (no messages exchanged yet)
    if (!chat.lastMessageAt && chat.requestedBy === myUid) {
      var updatedMs = chatTsToMs(chat.updatedAt);
      return updatedMs > readMs;
    }
  }
  return false;
}

function getUnreadChatCount() {
  if (!currentUser) return 0;
  var myUid = currentUser.uid;
  var cnt = 0;
  for (var i = 0; i < allMyChats.length; i++) {
    if (isChatUnread(allMyChats[i], myUid)) cnt++;
  }
  return cnt;
}

function sortMyChatsList(list, myUid) {
  return list.slice().sort(function (a, b) {
    var score = function (c) {
      if (c.status === 'pending' && c.requestedBy !== myUid) return 0;
      if (c.status === 'accepted') return isChatUnread(c, myUid) ? 1 : 2;
      if (c.status === 'pending') return 3;
      if (c.status === 'rejected') return 4;
      return 5;
    };
    var sa = score(a);
    var sb = score(b);
    if (sa !== sb) return sa - sb;
    var ta = chatTsToMs(a.lastMessageAt || a.updatedAt || a.createdAt);
    var tb = chatTsToMs(b.lastMessageAt || b.updatedAt || b.createdAt);
    return tb - ta;
  });
}

function updateChatHeaderBadge() {
  var btn = document.getElementById('chatHeaderBtn');
  var badge = document.getElementById('chatHeaderBadge');
  if (!btn) return;

  if (!currentUser || !isFirebaseConfigured) {
    btn.style.display = 'none';
    if (badge) badge.style.display = 'none';
    if (typeof updateBrowserActivityIndicator === 'function') {
      updateBrowserActivityIndicator();
    }
    return;
  }

  btn.style.display = 'inline-flex';
  var unread = getUnreadChatCount();
  btn.classList.toggle('has-unread', unread > 0);
  if (badge) {
    if (unread > 0) {
      badge.textContent = unread > 99 ? '99+' : String(unread);
      badge.style.display = 'inline-flex';
    } else {
      badge.style.display = 'none';
    }
  }
  if (typeof updateBrowserActivityIndicator === 'function') {
    updateBrowserActivityIndicator();
  }
}

function updatePlayerModalChatBtn(uid) {
  var btn = document.getElementById('playerModalChatBtn');
  if (!btn) return;
  var isMe = !!(currentUser && uid === currentUser.uid);
  if (isMe || !currentUser || !db) {
    btn.style.display = 'none';
    return;
  }

  btn.style.display = 'inline-flex';
  var pairId = getChatPairId(currentUser.uid, uid);
  var existing = allMyChats.find(function (c) { return c.id === pairId; });

  btn.className = 'pill-btn chat-action-pill';
  if (!existing) {
    btn.textContent = '💬 ' + t('chat_btn_send_request');
  } else if (existing.status === 'accepted') {
    btn.classList.add('active');
    btn.textContent = '💬 ' + t('chat_btn_open_chat');
  } else if (existing.status === 'pending') {
    if (existing.requestedBy === currentUser.uid) {
      btn.textContent = '⏳ ' + t('chat_btn_request_pending');
    } else {
      btn.classList.add('active');
      btn.textContent = '📩 ' + t('chat_btn_reply_request');
    }
  } else if (existing.status === 'blocked') {
    btn.textContent = '🚫 ' + t('chat_status_blocked');
  } else {
    btn.textContent = '⛔ ' + t('chat_status_rejected');
  }
}

function getPlayerCardChatButtonHtml(uid) {
  if (!currentUser || !uid || uid === currentUser.uid || !isFirebaseConfigured) return '';
  var pairId = getChatPairId(currentUser.uid, uid);
  var existing = allMyChats.find(function (c) { return c.id === pairId; });
  var label = '💬 ' + t('chat_card_btn_contact');
  var extraCls = '';
  if (existing) {
    if (existing.status === 'accepted') {
      label = '💬 ' + t('chat_btn_open_chat');
      extraCls = ' is-active';
    } else if (existing.status === 'pending') {
      if (existing.requestedBy === currentUser.uid) {
        label = '⏳ ' + t('chat_chip_sent');
      } else {
        label = '📩 ' + t('chat_chip_incoming');
        extraCls = ' is-active';
      }
    } else if (existing.status === 'blocked') {
      label = '🚫';
    } else {
      label = '⛔';
    }
  }
  return '<button type="button" class="player-card-chat-btn' + extraCls + '" data-uid="' + escapeHtml(uid) + '" title="' + escapeHtml(t('chat_btn_send_request')) + '">' +
    escapeHtml(label) +
    '</button>';
}

function resetChatPaneRenderState() {
  _renderedChatPaneId = null;
  _renderedChatPaneStatus = null;
  _renderedChatSafetyOpen = null;
  _renderedChatBanState = null;
  _renderedChatPeerDeleted = null;
}

function unbindChatListeners() {
  if (chatUnsubscribe) {
    try { chatUnsubscribe(); } catch (e) {}
    chatUnsubscribe = null;
  }
  if (chatMessagesUnsubscribe) {
    try { chatMessagesUnsubscribe(); } catch (e) {}
    chatMessagesUnsubscribe = null;
  }
  if (chatBanUnsubscribe) {
    try { chatBanUnsubscribe(); } catch (e) {}
    chatBanUnsubscribe = null;
  }
  if (chatAdminReportsUnsubscribe) {
    try { chatAdminReportsUnsubscribe(); } catch (e) {}
    chatAdminReportsUnsubscribe = null;
  }
  _adminReportsWatcherUid = null;
  adminOpenReportsCount = 0;
  adminReportsFilterMode = 'open';
  _adminSeenReportIds.clear();
  allMyChats = [];
  activeChatId = null;
  activeChatMessages = [];
  currentChatBan = null;
  chatRequestTargetPlayer = null;
  chatReportTargetChatId = null;
  chatPlayerSearchQuery = '';
  _isLoadingChatPlayersDir = false;
  var searchEl = document.getElementById('chatPlayerSearchInput');
  if (searchEl) searchEl.value = '';
  var clrBtn = document.getElementById('chatPlayerSearchClearBtn');
  if (clrBtn) clrBtn.style.display = 'none';
  _boundMessagesChatId = null;
  _lastMarkedReadMsgMs = {};
  _lastChatsStatusSig = '';
  _deletedChatUserUids.clear();
  _verifiedChatUserUids.clear();
  _verifyingChatUserUids.clear();
  resetChatPaneRenderState();
  updateChatHeaderBadge();
  updateAdminReportsAlertUI();
  closeChatModal();
  closeChatRequestModal();
  closeChatReportModal();
}

async function initChatSync() {
  if (!currentUser || !db) {
    unbindChatListeners();
    return;
  }

  var myUid = currentUser.uid;
  try {
    var fsModule = await getFirestoreModule();

    if (chatBanUnsubscribe) {
      try { chatBanUnsubscribe(); } catch (e) {}
      chatBanUnsubscribe = null;
    }
    var banRef = fsModule.doc(db, 'chat_bans', myUid);
    chatBanUnsubscribe = fsModule.onSnapshot(banRef, function (snap) {
      if (!currentUser || currentUser.uid !== myUid) return;
      currentChatBan = snap.exists() ? (snap.data() || null) : null;
      var modal = document.getElementById('chatModalOverlay');
      if (modal && modal.classList.contains('active')) {
        renderChatActivePane();
      }
    }, function (err) {
      console.warn('Chat ban listener warning:', err);
    });

    if (chatUnsubscribe) {
      try { chatUnsubscribe(); } catch (e) {}
      chatUnsubscribe = null;
    }
    var chatsQ = fsModule.query(
      fsModule.collection(db, 'chats'),
      fsModule.where('participants', 'array-contains', myUid)
    );
    chatUnsubscribe = fsModule.onSnapshot(chatsQ, function (snap) {
      if (!currentUser || currentUser.uid !== myUid) return;
      var nextList = [];
      snap.forEach(function (docSnap) {
        var data = docSnap.data({ serverTimestamps: 'estimate' }) || {};
        if (Array.isArray(data.hiddenBy) && data.hiddenBy.indexOf(myUid) !== -1) {
          return;
        }
        var chatObj = Object.assign({ id: docSnap.id }, data);
        var oUid = getOtherChatParticipantUid(chatObj, myUid);
        if (oUid && chatObj.participantInfo && chatObj.participantInfo[oUid] && chatObj.participantInfo[oUid].deleted === true) {
          _deletedChatUserUids.add(oUid);
          purgeDeletedPlayerFromLocalList(oUid);
        }
        nextList.push(chatObj);
      });
      allMyChats = sortMyChatsList(nextList, myUid);
      updateChatHeaderBadge();

      var pNameEl = document.getElementById('playerModalName');
      if (pNameEl && pNameEl.dataset.currentUid) {
        updatePlayerModalChatBtn(pNameEl.dataset.currentUid);
      }
      var nextStatusSig = allMyChats.map(function (c) {
        return c.id + ':' + c.status + ':' + (c.requestedBy || '');
      }).join('|');
      if (nextStatusSig !== _lastChatsStatusSig) {
        _lastChatsStatusSig = nextStatusSig;
        if (typeof currentView !== 'undefined' && currentView === 'players' && typeof renderPlayersList === 'function') {
          renderPlayersList();
        }
      }

      var chatModal = document.getElementById('chatModalOverlay');
      if (chatModal && chatModal.classList.contains('active')) {
        if (activeChatId && !allMyChats.some(function (c) { return c.id === activeChatId; })) {
          activeChatId = null;
          activeChatMessages = [];
          _boundMessagesChatId = null;
          resetChatPaneRenderState();
          if (chatMessagesUnsubscribe) {
            try { chatMessagesUnsubscribe(); } catch (e) {}
            chatMessagesUnsubscribe = null;
          }
          var layout = document.getElementById('chatLayout');
          if (layout) layout.classList.remove('is-thread-open');
        }
        renderChatSidebarList();
        renderChatActivePane();
        if (activeChatId) {
          var activeObj = allMyChats.find(function (c) { return c.id === activeChatId; });
          if (activeObj && activeObj.status === 'accepted') {
            if (_boundMessagesChatId !== activeChatId) {
              bindActiveChatMessagesListener(activeChatId);
            }
            if (isChatUnread(activeObj, myUid)) {
              markChatAsRead(activeObj);
            }
          } else if (_boundMessagesChatId) {
            if (chatMessagesUnsubscribe) {
              try { chatMessagesUnsubscribe(); } catch (e) {}
              chatMessagesUnsubscribe = null;
            }
            _boundMessagesChatId = null;
            activeChatMessages = [];
          }
        }
      }
    }, function (err) {
      console.warn('Chats listener warning:', err);
    });
  } catch (err) {
    console.warn('Failed to initialize chat sync:', err);
  }
}

function checkChatIntroOnStartup() {
  if (_chatIntroStartupChecked) return;
  _chatIntroStartupChecked = true;
  if (Date.now() > CHAT_INTRO_EXPIRES_MS) return;
  if (safeStorageGet(CHAT_INTRO_SEEN_KEY) === '1') return;
  // Only show the chat intro to players who have signed in or interacted with the tracker before
  var isReturningUser = !!(
    currentUser ||
    safeStorageGet('fishao_cached_profile_v1') ||
    safeStorageGet('fishao_cookie_consent') ||
    safeStorageGet('fishao_price_summary_v2')
  );
  if (!isReturningUser) return;

  setTimeout(function () {
    if (Date.now() > CHAT_INTRO_EXPIRES_MS) return;
    if (safeStorageGet(CHAT_INTRO_SEEN_KEY) === '1') return;
    if (document.querySelector('.modal-overlay.active')) return;
    openChatIntroModal();
  }, 450);
}

function openChatIntroModal() {
  safeStorageSet(CHAT_INTRO_SEEN_KEY, '1');
  var modal = document.getElementById('chatIntroModalOverlay');
  if (modal) modal.classList.add('active');
}

function closeChatIntroModal(openChatAfter) {
  safeStorageSet(CHAT_INTRO_SEEN_KEY, '1');
  var modal = document.getElementById('chatIntroModalOverlay');
  if (modal) modal.classList.remove('active');
  if (openChatAfter) {
    openChatModal();
  }
}

function openChatModal(preferredChatId) {
  safeStorageSet(CHAT_INTRO_SEEN_KEY, '1');
  if (!currentUser) {
    showAuthNotice(t('auth_notice_default'));
    return;
  }
  if (typeof closePriceModal === 'function') {
    closePriceModal();
  }
  var overlay = document.getElementById('chatModalOverlay');
  if (!overlay) return;

  var isMobileViewport = (typeof window !== 'undefined' && window.innerWidth <= 768);

  if (preferredChatId) {
    var prefObj = allMyChats.find(function (c) { return c.id === preferredChatId; });
    if (prefObj && (prefObj.status === 'blocked' || prefObj.status === 'rejected') && chatFilterMode !== 'blocked') {
      chatFilterMode = 'blocked';
      document.querySelectorAll('.chat-filter-pill').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-chat-filter') === 'blocked');
      });
    }
    selectChatThread(preferredChatId);
  } else if (!isMobileViewport && activeChatId && allMyChats.some(function (c) { return c.id === activeChatId; })) {
    selectChatThread(activeChatId);
  } else if (!isMobileViewport && allMyChats.length > 0) {
    var firstVisible = allMyChats.find(function (c) { return c.status !== 'blocked' && c.status !== 'rejected'; });
    if (firstVisible) {
      selectChatThread(firstVisible.id);
    } else {
      activeChatId = null;
      backToChatList();
      renderChatSidebarList();
      renderChatActivePane();
    }
  } else {
    activeChatId = null;
    backToChatList();
    renderChatSidebarList();
    renderChatActivePane();
  }

  overlay.classList.add('active');
}

function closeChatModal() {
  var overlay = document.getElementById('chatModalOverlay');
  if (overlay) overlay.classList.remove('active');
  if (chatMessagesUnsubscribe) {
    try { chatMessagesUnsubscribe(); } catch (e) {}
    chatMessagesUnsubscribe = null;
  }
  _boundMessagesChatId = null;
  resetChatPaneRenderState();
}

function backToChatList() {
  var layout = document.getElementById('chatLayout');
  if (layout) layout.classList.remove('is-thread-open');
  if (typeof window !== 'undefined' && window.innerWidth <= 768 && activeChatId) {
    activeChatId = null;
    if (chatMessagesUnsubscribe) {
      try { chatMessagesUnsubscribe(); } catch (e) {}
      chatMessagesUnsubscribe = null;
    }
    _boundMessagesChatId = null;
    activeChatMessages = [];
    resetChatPaneRenderState();
    renderChatSidebarList();
  }
}

function ensureChatPlayersForSearch() {
  if (!currentUser || _isLoadingChatPlayersDir) return;
  if (typeof allPlayersList !== 'undefined' && Array.isArray(allPlayersList) && allPlayersList.length > 0) return;
  if (typeof loadAllPlayers !== 'function') return;
  _isLoadingChatPlayersDir = true;
  Promise.resolve(loadAllPlayers(false)).finally(function () {
    _isLoadingChatPlayersDir = false;
    var modal = document.getElementById('chatModalOverlay');
    if (modal && modal.classList.contains('active')) {
      renderChatSidebarList();
    }
  });
}

function onChatPlayerSearchInput(val) {
  chatPlayerSearchQuery = String(val || '').trim();
  var clrBtn = document.getElementById('chatPlayerSearchClearBtn');
  if (clrBtn) clrBtn.style.display = chatPlayerSearchQuery ? 'inline-flex' : 'none';
  if (chatPlayerSearchQuery) {
    ensureChatPlayersForSearch();
  }
  renderChatSidebarList();
}

function clearChatPlayerSearch() {
  chatPlayerSearchQuery = '';
  var inputEl = document.getElementById('chatPlayerSearchInput');
  if (inputEl) inputEl.value = '';
  var clrBtn = document.getElementById('chatPlayerSearchClearBtn');
  if (clrBtn) clrBtn.style.display = 'none';
  renderChatSidebarList();
}

function setChatFilterMode(mode) {
  chatFilterMode = mode || 'all';
  var btns = document.querySelectorAll('.chat-filter-pill');
  btns.forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-chat-filter') === chatFilterMode);
  });
  renderChatSidebarList();
}

function toggleChatSafetyPanel() {
  isChatSafetyExpanded = !isChatSafetyExpanded;
  renderChatActivePane();
}

function openChatWithPlayer(uid) {
  if (!uid) return;
  if (!currentUser) {
    showAuthNotice(t('auth_notice_default'));
    return;
  }
  if (uid === currentUser.uid) return;
  if (!db) {
    showToast(t('auth_need_config'), 'error');
    return;
  }

  var pairId = getChatPairId(currentUser.uid, uid);
  var existing = allMyChats.find(function (c) { return c.id === pairId; });
  if (existing) {
    if (typeof closePlayerModal === 'function') closePlayerModal();
    openChatModal(pairId);
    return;
  }

  if (isChatUserKnownDeleted(uid)) {
    purgeDeletedPlayerFromLocalList(uid);
    showToast(t('player_profile_deleted_toast'), 'info');
    return;
  }

  if (isCurrentUserChatBanned()) {
    showToast(t('chat_banned_notice'), 'error');
    return;
  }

  var playerObj = (typeof allPlayersList !== 'undefined' && Array.isArray(allPlayersList))
    ? allPlayersList.find(function (p) { return p.uid === uid; })
    : null;
  var clubMem = (typeof currentClubMembersMap !== 'undefined' && currentClubMembersMap)
    ? currentClubMembersMap[uid]
    : null;

  var pName = (playerObj && playerObj.displayName) || (clubMem && clubMem.displayName) || t('user_default_player');
  var pAv = (playerObj && playerObj.avatarUrl) || (clubMem && clubMem.avatarUrl) || '🎣';
  var pLang = normalizePlayerLang((playerObj && playerObj.preferredLang) || (clubMem && clubMem.preferredLang));

  chatRequestTargetPlayer = {
    uid: uid,
    displayName: String(pName).slice(0, 40),
    avatarUrl: String(pAv).slice(0, 500),
    preferredLang: pLang
  };

  openChatRequestModal();
}

function openChatRequestModal() {
  if (!chatRequestTargetPlayer || !currentUser) return;
  var overlay = document.getElementById('chatRequestModalOverlay');
  if (!overlay) return;

  var targetBox = document.getElementById('chatRequestTargetBox');
  if (targetBox) {
    targetBox.innerHTML =
      '<div class="chat-req-avatar">' + renderAvatarHtml(chatRequestTargetPlayer.avatarUrl, '🎣') + '</div>' +
      '<div class="chat-req-meta">' +
        '<div class="chat-req-name">' + escapeHtml(chatRequestTargetPlayer.displayName) + renderPlayerLangFlag(chatRequestTargetPlayer.preferredLang) + '</div>' +
        '<div class="chat-req-sub">' + escapeHtml(t('chat_req_target_sub')) + '</div>' +
      '</div>';
  }

  var defaultRadio = document.querySelector('input[name="chatRequestReason"][value="meetup"]');
  if (defaultRadio) defaultRadio.checked = true;

  var rulesWrap = document.getElementById('chatRequestRulesAgreeWrap');
  var rulesChk = document.getElementById('chatRequestRulesAgreeChk');
  var alreadyAccepted = hasAcceptedChatRules(currentUser.uid);
  if (rulesWrap) rulesWrap.style.display = alreadyAccepted ? 'none' : 'flex';
  if (rulesChk) rulesChk.checked = alreadyAccepted;

  overlay.classList.add('active');
}

function closeChatRequestModal() {
  var overlay = document.getElementById('chatRequestModalOverlay');
  if (overlay) overlay.classList.remove('active');
  chatRequestTargetPlayer = null;
}

async function submitChatRequest() {
  if (!currentUser || !db || !chatRequestTargetPlayer || isSubmittingChatRequest) return;

  if (isCurrentUserChatBanned()) {
    showToast(t('chat_banned_notice'), 'error');
    return;
  }

  if (!hasAcceptedChatRules(currentUser.uid)) {
    var rulesChk = document.getElementById('chatRequestRulesAgreeChk');
    if (!rulesChk || !rulesChk.checked) {
      showToast(t('chat_err_accept_rules'), 'error');
      return;
    }
    markChatRulesAccepted(currentUser.uid);
  }

  var selectedRadio = document.querySelector('input[name="chatRequestReason"]:checked');
  var reason = selectedRadio ? selectedRadio.value : 'meetup';
  if (CHAT_REASONS.indexOf(reason) === -1) reason = 'meetup';

  var myUid = currentUser.uid;
  var targetUid = chatRequestTargetPlayer.uid;
  var pairId = getChatPairId(myUid, targetUid);
  var participants = (myUid < targetUid) ? [myUid, targetUid] : [targetUid, myUid];

  var myInfo = getMyChatParticipantInfo();
  var targetAv = chatRequestTargetPlayer.avatarUrl || '🎣';
  if (/[<>\"'`]/.test(targetAv) || /^(http:|javascript:|data:|vbscript:)/i.test(targetAv)) {
    targetAv = '🎣';
  }
  var targetInfo = {
    displayName: (chatRequestTargetPlayer.displayName || t('user_default_player')).slice(0, 40),
    avatarUrl: targetAv.slice(0, 500)
  };

  var participantInfo = {};
  participantInfo[myUid] = myInfo;
  participantInfo[targetUid] = targetInfo;

  var lastReadAt = {};
  lastReadAt[myUid] = null; // replaced with serverTimestamp()

  var submitBtn = document.getElementById('btnSubmitChatRequest');
  if (submitBtn) submitBtn.disabled = true;
  isSubmittingChatRequest = true;

  try {
    var fsModule = await getFirestoreModule();
    lastReadAt[myUid] = fsModule.serverTimestamp();
    var expiresTs = fsModule.Timestamp.fromMillis(Date.now() + CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000);
    var chatRef = fsModule.doc(db, 'chats', pairId);

    await fsModule.setDoc(chatRef, {
      participants: participants,
      participantInfo: participantInfo,
      status: 'pending',
      requestedBy: myUid,
      blockedBy: null,
      reason: reason,
      lastMessagePreview: '',
      lastSenderUid: null,
      lastMessageAt: null,
      lastReadAt: lastReadAt,
      createdAt: fsModule.serverTimestamp(),
      updatedAt: fsModule.serverTimestamp(),
      expiresAt: expiresTs
    });

    closeChatRequestModal();
    if (typeof closePlayerModal === 'function') closePlayerModal();
    clearChatPlayerSearch();
    showToast(t('chat_toast_request_sent'), 'success');
    openChatModal(pairId);
  } catch (err) {
    console.error('Failed to send chat request:', err);
    if (err && err.code === 'permission-denied') {
      showToast(t('chat_err_request_denied'), 'error');
    } else {
      showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
    }
  } finally {
    isSubmittingChatRequest = false;
    if (submitBtn) submitBtn.disabled = false;
  }
}

function bindActiveChatMessagesListener(chatId) {
  if (chatMessagesUnsubscribe) {
    try { chatMessagesUnsubscribe(); } catch (e) {}
    chatMessagesUnsubscribe = null;
  }
  _boundMessagesChatId = null;
  activeChatMessages = [];
  if (!chatId || !currentUser || !db) return;

  var chatObj = allMyChats.find(function (c) { return c.id === chatId; });
  if (!chatObj || chatObj.status !== 'accepted') {
    return;
  }

  _boundMessagesChatId = chatId;
  getFirestoreModule().then(function (fsModule) {
    if (activeChatId !== chatId || !currentUser || _boundMessagesChatId !== chatId) return;
    var msgsQ = fsModule.query(
      fsModule.collection(db, 'chats', chatId, 'messages'),
      fsModule.orderBy('createdAt', 'desc'),
      fsModule.limit(100)
    );
    chatMessagesUnsubscribe = fsModule.onSnapshot(msgsQ, function (snap) {
      if (activeChatId !== chatId) return;
      var msgs = [];
      snap.forEach(function (d) {
        msgs.push(Object.assign({ id: d.id }, d.data({ serverTimestamps: 'estimate' }) || {}));
      });
      msgs.reverse();
      activeChatMessages = msgs;
      renderChatMessagesBody(true);
    }, function (err) {
      console.warn('Chat messages listener warning:', err);
    });
  }).catch(function (err) {
    if (_boundMessagesChatId === chatId) _boundMessagesChatId = null;
    console.warn('Failed to bind chat messages:', err);
  });
}

function selectChatThread(chatId) {
  activeChatId = chatId || null;
  isChatSafetyExpanded = false;
  var layout = document.getElementById('chatLayout');
  if (layout && chatId) layout.classList.add('is-thread-open');

  bindActiveChatMessagesListener(activeChatId);
  renderChatSidebarList();
  renderChatActivePane();

  if (chatId && currentUser) {
    var chatObj = allMyChats.find(function (c) { return c.id === chatId; });
    if (chatObj) {
      var peerUid = getOtherChatParticipantUid(chatObj, currentUser.uid);
      verifyChatPeerExists(peerUid);
      if (chatObj.status === 'accepted' && isChatUnread(chatObj, currentUser.uid)) {
        markChatAsRead(chatObj);
      }
    }
  }
}

async function markChatAsRead(chatObj) {
  if (!chatObj || !currentUser || !db || chatObj.status !== 'accepted') return;
  var activityMs = chatTsToMs(chatObj.lastMessageAt) || chatTsToMs(chatObj.updatedAt);
  if (!activityMs) return;
  if (_lastMarkedReadMsgMs[chatObj.id] && _lastMarkedReadMsgMs[chatObj.id] >= activityMs) {
    return;
  }
  _lastMarkedReadMsgMs[chatObj.id] = activityMs;

  try {
    var fsModule = await getFirestoreModule();
    var myUid = currentUser.uid;
    var payload = {};
    payload['lastReadAt.' + myUid] = fsModule.serverTimestamp();
    payload['participantInfo.' + myUid] = getMyChatParticipantInfo();
    await fsModule.updateDoc(fsModule.doc(db, 'chats', chatObj.id), payload);
  } catch (err) {
    if (!err || err.code !== 'permission-denied') {
      delete _lastMarkedReadMsgMs[chatObj.id];
    }
    // Non-critical read-receipt sync warning
    console.debug('markChatAsRead skipped:', err);
  }
}

async function acceptChatRequest(chatId) {
  if (!currentUser || !db || !chatId) return;
  if (isCurrentUserChatBanned()) {
    showToast(t('chat_banned_notice'), 'error');
    return;
  }

  if (!hasAcceptedChatRules(currentUser.uid)) {
    var chk = document.getElementById('chatAcceptRulesChk');
    if (!chk || !chk.checked) {
      showToast(t('chat_err_accept_rules'), 'error');
      return;
    }
    markChatRulesAccepted(currentUser.uid);
  }

  try {
    var fsModule = await getFirestoreModule();
    var myUid = currentUser.uid;
    var updatePayload = {
      status: 'accepted',
      expiresAt: null,
      updatedAt: fsModule.serverTimestamp()
    };
    updatePayload['lastReadAt.' + myUid] = fsModule.serverTimestamp();
    updatePayload['participantInfo.' + myUid] = getMyChatParticipantInfo();

    await fsModule.updateDoc(fsModule.doc(db, 'chats', chatId), updatePayload);
    if (chatFilterMode === 'blocked') {
      chatFilterMode = 'all';
      document.querySelectorAll('.chat-filter-pill').forEach(function (b) {
        b.classList.toggle('active', b.getAttribute('data-chat-filter') === 'all');
      });
    }
    showToast(t('chat_toast_accepted'), 'success');
    bindActiveChatMessagesListener(chatId);
  } catch (err) {
    console.error('Failed to accept chat request:', err);
    showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
  }
}

async function rejectChatRequest(chatId) {
  if (!currentUser || !db || !chatId) return;
  var ok = await showConfirmModal(
    t('chat_reject_title'),
    t('chat_reject_confirm'),
    t('chat_btn_reject'),
    true
  );
  if (!ok) return;

  try {
    var fsModule = await getFirestoreModule();
    await fsModule.updateDoc(fsModule.doc(db, 'chats', chatId), {
      status: 'rejected',
      expiresAt: null,
      updatedAt: fsModule.serverTimestamp()
    });
    showToast(t('chat_toast_rejected'), 'info');
  } catch (err) {
    console.error('Failed to reject chat request:', err);
    showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
  }
}

async function cancelChatRequest(chatId) {
  if (!currentUser || !db || !chatId) return;
  try {
    var fsModule = await getFirestoreModule();
    await fsModule.deleteDoc(fsModule.doc(db, 'chats', chatId));
    if (activeChatId === chatId) {
      activeChatId = null;
      backToChatList();
    }
    showToast(t('chat_toast_cancelled'), 'info');
  } catch (err) {
    console.error('Failed to cancel chat request:', err);
    showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
  }
}

async function blockChatUser(chatId) {
  if (!currentUser || !db || !chatId) return;
  var chatObj = allMyChats.find(function (c) { return c.id === chatId; });
  var ok = await showConfirmModal(
    t('chat_block_title'),
    t('chat_block_confirm'),
    t('chat_btn_block'),
    true
  );
  if (!ok) return;

  try {
    var fsModule = await getFirestoreModule();
    var preStatus = (chatObj && chatObj.status) ? chatObj.status : 'accepted';
    await fsModule.updateDoc(fsModule.doc(db, 'chats', chatId), {
      status: 'blocked',
      blockedBy: currentUser.uid,
      preBlockStatus: preStatus,
      expiresAt: null,
      updatedAt: fsModule.serverTimestamp()
    });
    if (chatMessagesUnsubscribe) {
      try { chatMessagesUnsubscribe(); } catch (e) {}
      chatMessagesUnsubscribe = null;
    }
    _boundMessagesChatId = null;
    activeChatMessages = [];
    showToast(t('chat_toast_blocked'), 'info');
  } catch (err) {
    console.error('Failed to block player:', err);
    showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
  }
}

async function unblockChatUser(chatId) {
  if (!currentUser || !db || !chatId) return;
  var chatObj = allMyChats.find(function (c) { return c.id === chatId; });
  var willRestoreAccepted = !!(chatObj && (chatObj.preBlockStatus === 'accepted' || chatObj.lastMessageAt));
  var ok = await showConfirmModal(
    t('chat_unblock_title'),
    t(willRestoreAccepted ? 'chat_unblock_restore_confirm' : 'chat_unblock_confirm'),
    t('chat_btn_unblock'),
    false
  );
  if (!ok) return;

  try {
    var fsModule = await getFirestoreModule();
    var chatRef = fsModule.doc(db, 'chats', chatId);
    if (willRestoreAccepted) {
      await fsModule.updateDoc(chatRef, {
        status: 'accepted',
        blockedBy: null,
        preBlockStatus: null,
        expiresAt: null,
        updatedAt: fsModule.serverTimestamp()
      });
      if (chatFilterMode === 'blocked') {
        chatFilterMode = 'all';
        document.querySelectorAll('.chat-filter-pill').forEach(function (b) {
          b.classList.toggle('active', b.getAttribute('data-chat-filter') === 'all');
        });
      }
      if (activeChatId === chatId) {
        bindActiveChatMessagesListener(chatId);
      }
    } else {
      await fsModule.deleteDoc(chatRef);
      if (activeChatId === chatId) {
        activeChatId = null;
        backToChatList();
      }
    }
    showToast(t('chat_toast_unblocked'), 'info');
  } catch (err) {
    console.error('Failed to unblock player:', err);
    showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
  }
}

async function dismissDeletedChatThread(chatId) {
  if (!currentUser || !db || !chatId) return;
  var chatObj = allMyChats.find(function (c) { return c.id === chatId; });
  var ok = await showConfirmModal(
    t('chat_delete_thread_title'),
    t('chat_delete_thread_confirm'),
    t('chat_btn_delete_thread'),
    true
  );
  if (!ok) return;

  try {
    var fsModule = await getFirestoreModule();
    var chatRef = fsModule.doc(db, 'chats', chatId);
    var hadMessagesOrAccepted = !chatObj || chatObj.status === 'accepted' || chatObj.preBlockStatus === 'accepted' || !!chatObj.lastMessageAt;
    if (hadMessagesOrAccepted) {
      await fsModule.updateDoc(chatRef, {
        hiddenBy: fsModule.arrayUnion(currentUser.uid),
        updatedAt: fsModule.serverTimestamp()
      });
    } else {
      await fsModule.deleteDoc(chatRef);
    }

    if (chatObj) {
      var peerUid = getOtherChatParticipantUid(chatObj, currentUser.uid);
      if (peerUid) markChatUserDeleted(peerUid);
    }

    if (activeChatId === chatId) {
      activeChatId = null;
      if (chatMessagesUnsubscribe) {
        try { chatMessagesUnsubscribe(); } catch (e) {}
        chatMessagesUnsubscribe = null;
      }
      _boundMessagesChatId = null;
      activeChatMessages = [];
      resetChatPaneRenderState();
      backToChatList();
    }
    showToast(t('chat_toast_thread_deleted'), 'info');
  } catch (err) {
    console.error('Failed to remove deleted-peer chat thread:', err);
    showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
  }
}

async function sendChatMessage() {
  if (!currentUser || !db || !activeChatId || isSendingChatMsg) return;
  if (isCurrentUserChatBanned()) {
    showToast(t('chat_banned_notice'), 'error');
    return;
  }

  var chatObj = allMyChats.find(function (c) { return c.id === activeChatId; });
  if (!chatObj || chatObj.status !== 'accepted') return;

  var peerUid = getOtherChatParticipantUid(chatObj, currentUser.uid);
  var peerDisplay = getChatParticipantDisplay(chatObj, peerUid);
  if (peerDisplay.isDeleted) {
    showToast(t('chat_deleted_peer_notice'), 'error');
    renderChatSidebarList();
    renderChatActivePane();
    return;
  }

  var inputEl = document.getElementById('chatMessageInput');
  if (!inputEl) return;

  var validation = validateChatPlainTextClient(inputEl.value, CHAT_MAX_MSG_LEN);
  if (!validation.ok) {
    showToast(t(validation.errorKey), 'error');
    return;
  }

  var cleanText = validation.text;
  if (containsChatEmailAddress(cleanText)) {
    var confirmEmailSend = await showConfirmModal(
      t('chat_email_warn_title'),
      t('chat_email_warn_desc'),
      t('chat_email_warn_send_anyway'),
      true
    );
    if (!confirmEmailSend) {
      return;
    }
  }

  var preview = buildSafeChatPreview(cleanText);
  var myUid = currentUser.uid;
  var myInfo = getMyChatParticipantInfo();

  isSendingChatMsg = true;
  var sendBtn = document.getElementById('chatSendBtn');
  if (sendBtn) sendBtn.disabled = true;

  // Clear immediately for snappy UX; restore in catch if sending fails
  inputEl.value = '';
  updateChatCharCounter();

  try {
    var txApi = window.FISHAO_FS_TX;
    if (!txApi || typeof txApi.commitBatch !== 'function') {
      throw new Error('Transaction helper unavailable.');
    }

    await txApi.commitBatch(db, function (batch, fsModule) {
      var chatRef = fsModule.doc(db, 'chats', activeChatId);
      var msgRef = fsModule.doc(fsModule.collection(db, 'chats', activeChatId, 'messages'));
      var expiresTs = fsModule.Timestamp.fromMillis(Date.now() + CHAT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

      batch.set(msgRef, {
        senderUid: myUid,
        text: cleanText,
        createdAt: fsModule.serverTimestamp(),
        expiresAt: expiresTs
      });

      var chatUp = {
        lastMessagePreview: preview,
        lastSenderUid: myUid,
        lastMessageId: msgRef.id,
        lastMessageAt: fsModule.serverTimestamp(),
        updatedAt: fsModule.serverTimestamp()
      };
      chatUp['lastReadAt.' + myUid] = fsModule.serverTimestamp();
      chatUp['participantInfo.' + myUid] = myInfo;
      batch.update(chatRef, chatUp);
    });

    var liveInput = document.getElementById('chatMessageInput');
    if (liveInput) {
      liveInput.focus();
    }
  } catch (err) {
    var errInput = document.getElementById('chatMessageInput');
    if (errInput && !errInput.value) {
      errInput.value = cleanText;
      updateChatCharCounter();
    }
    console.error('Failed to send chat message:', err);
    if (err && err.code === 'permission-denied') {
      if (peerUid) verifyChatPeerExists(peerUid);
      showToast(t('chat_err_send_rejected'), 'error');
    } else {
      showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
    }
  } finally {
    isSendingChatMsg = false;
    var liveSendBtn = document.getElementById('chatSendBtn');
    if (liveSendBtn) liveSendBtn.disabled = false;
  }
}

function updateChatCharCounter() {
  var inputEl = document.getElementById('chatMessageInput');
  var counterEl = document.getElementById('chatCharCounter');
  if (!inputEl || !counterEl) return;
  var len = inputEl.value.length;
  counterEl.textContent = len + ' / ' + CHAT_MAX_MSG_LEN;
  counterEl.classList.toggle('near-limit', len >= 260);
}

function onChatInputKeyDown(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChatMessage();
  }
}

function buildChatThreadItemHtml(c, myUid) {
  var otherUid = getOtherChatParticipantUid(c, myUid);
  var other = getChatParticipantDisplay(c, otherUid);
  var unread = isChatUnread(c, myUid);
  var isActive = (c.id === activeChatId);
  var statusTag = '';
  var subText = '';

  if (c.status === 'pending') {
    if (c.requestedBy === myUid) {
      statusTag = '<span class="chat-status-chip pending">' + escapeHtml(t('chat_chip_sent')) + '</span>';
    } else {
      statusTag = '<span class="chat-status-chip incoming">' + escapeHtml(t('chat_chip_incoming')) + '</span>';
    }
    subText = getChatReasonLabel(c.reason);
  } else if (c.status === 'accepted') {
    subText = c.lastMessagePreview
      ? c.lastMessagePreview
      : t('chat_preview_no_messages');
  } else if (c.status === 'blocked') {
    statusTag = '<span class="chat-status-chip blocked">' + escapeHtml(t('chat_status_blocked')) + '</span>';
    subText = getChatReasonLabel(c.reason);
  } else {
    statusTag = '<span class="chat-status-chip rejected">' + escapeHtml(t('chat_status_rejected')) + '</span>';
    subText = getChatReasonLabel(c.reason);
  }

  var timeLabel = formatChatTimeLabel(c.lastMessageAt || c.updatedAt);

  return '<button type="button" class="chat-thread-item' +
    (isActive ? ' active' : '') + (unread ? ' unread' : '') +
    '" data-chat-id="' + escapeHtml(c.id) + '">' +
    '<div class="chat-thread-avatar">' + renderAvatarHtml(other.avatarUrl, '🎣') + '</div>' +
    '<div class="chat-thread-body">' +
      '<div class="chat-thread-top">' +
        '<span class="chat-thread-name">' + escapeHtml(other.displayName) + renderPlayerLangFlag(other.lang) + '</span>' +
        '<span class="chat-thread-time">' + escapeHtml(timeLabel) + '</span>' +
      '</div>' +
      '<div class="chat-thread-bottom">' +
        statusTag +
        '<span class="chat-thread-preview">' + escapeHtml(subText) + '</span>' +
        (unread ? '<span class="chat-unread-dot" aria-hidden="true"></span>' : '') +
      '</div>' +
    '</div>' +
  '</button>';
}

function renderChatSidebarList() {
  var listEl = document.getElementById('chatThreadsList');
  if (!listEl) return;

  if (!listEl.dataset.boundThreadClicks) {
    listEl.dataset.boundThreadClicks = '1';
    listEl.addEventListener('click', function (ev) {
      var item = ev.target && ev.target.closest ? ev.target.closest('.chat-thread-item') : null;
      if (item && item.dataset.chatId) {
        selectChatThread(item.dataset.chatId);
        return;
      }
      var playerItem = ev.target && ev.target.closest ? ev.target.closest('.chat-player-result-item') : null;
      if (playerItem && playerItem.dataset.playerUid) {
        openChatWithPlayer(playerItem.dataset.playerUid);
      }
    });
  }

  if (!currentUser) {
    listEl.innerHTML = '';
    return;
  }

  var myUid = currentUser.uid;
  var query = String(chatPlayerSearchQuery || '').trim();
  if (query) {
    var normFn = (window.FISHAO_I18N && window.FISHAO_I18N.norm)
      ? window.FISHAO_I18N.norm
      : function (s) { return String(s || '').toLowerCase(); };
    var qNorm = normFn(query);

    var existingPeerUids = new Set();
    var matchingThreads = [];
    allMyChats.forEach(function (c) {
      var otherUid = getOtherChatParticipantUid(c, myUid);
      if (otherUid) existingPeerUids.add(otherUid);
      var other = getChatParticipantDisplay(c, otherUid);
      if (normFn(other.displayName).indexOf(qNorm) !== -1) {
        matchingThreads.push(c);
      }
    });

    var matchingPlayers = [];
    if (typeof allPlayersList !== 'undefined' && Array.isArray(allPlayersList)) {
      for (var i = 0; i < allPlayersList.length; i++) {
        var p = allPlayersList[i];
        if (!p || !p.uid || p.uid === myUid) continue;
        if (existingPeerUids.has(p.uid) || isChatUserKnownDeleted(p.uid)) continue;
        if (normFn(p.displayName).indexOf(qNorm) !== -1) {
          matchingPlayers.push(p);
          if (matchingPlayers.length >= 20) break;
        }
      }
    }

    var searchHtml = '';
    if (matchingThreads.length > 0) {
      searchHtml += '<div class="chat-search-section-label">' + escapeHtml(t('chat_search_existing_hdr')) + '</div>';
      matchingThreads.forEach(function (c) {
        searchHtml += buildChatThreadItemHtml(c, myUid);
      });
    }

    if (matchingPlayers.length > 0) {
      searchHtml += '<div class="chat-search-section-label">' + escapeHtml(t('chat_search_new_players_hdr')) + '</div>';
      matchingPlayers.forEach(function (p) {
        var clubSub = p.clubName ? ('🏆 ' + p.clubName) : t('player_card_no_club');
        searchHtml += '<button type="button" class="chat-player-result-item" data-player-uid="' + escapeHtml(p.uid) + '">' +
          '<div class="chat-thread-avatar">' + renderAvatarHtml(p.avatarUrl || '🎣', '🎣') + '</div>' +
          '<div class="chat-thread-body">' +
            '<div class="chat-thread-name">' + escapeHtml(p.displayName || t('user_default_player')) + renderPlayerLangFlag(p.preferredLang) + '</div>' +
            '<div class="chat-thread-preview">' + escapeHtml(clubSub) + '</div>' +
          '</div>' +
          '<span class="chat-player-result-cta">📨 ' + escapeHtml(t('chat_search_send_req_short')) + '</span>' +
        '</button>';
      });
    }

    if (_isLoadingChatPlayersDir) {
      searchHtml += '<div style="padding:10px; text-align:center; font-size:11.5px; color:var(--text-muted);">⏳ ' + escapeHtml(t('loading_short')) + '</div>';
    } else if (!searchHtml) {
      searchHtml =
        '<div class="chat-list-empty">' +
          '<div class="chat-list-empty-icon">🔍</div>' +
          '<div>' + escapeHtml(t('chat_search_no_results')) + '</div>' +
        '</div>';
    }

    listEl.innerHTML = searchHtml;
    return;
  }

  var filtered = allMyChats.filter(function (c) {
    if (chatFilterMode === 'unread') return isChatUnread(c, myUid);
    if (chatFilterMode === 'requests') return c.status === 'pending';
    if (chatFilterMode === 'blocked') return c.status === 'blocked' || c.status === 'rejected';
    return c.status !== 'blocked' && c.status !== 'rejected';
  });

  if (filtered.length === 0) {
    listEl.innerHTML =
      '<div class="chat-list-empty">' +
        '<div class="chat-list-empty-icon">💬</div>' +
        '<div>' + escapeHtml(t(chatFilterMode === 'all' ? 'chat_list_empty' : 'chat_list_empty_filter')) + '</div>' +
      '</div>';
    return;
  }

  var html = '';
  filtered.forEach(function (c) {
    html += buildChatThreadItemHtml(c, myUid);
  });

  listEl.innerHTML = html;
}

function renderChatActivePane() {
  var pane = document.getElementById('chatThreadPane');
  if (!pane || !currentUser) return;

  var myUid = currentUser.uid;
  var chatObj = activeChatId ? allMyChats.find(function (c) { return c.id === activeChatId; }) : null;

  if (!chatObj) {
    resetChatPaneRenderState();
    pane.innerHTML =
      '<div class="chat-pane-empty">' +
        '<div class="chat-pane-empty-icon">💬</div>' +
        '<h4>' + escapeHtml(t('chat_empty_title')) + '</h4>' +
        '<p>' + escapeHtml(t('chat_empty_desc')) + '</p>' +
        '<div class="chat-empty-safety-card">' +
          '<strong>🛡️ ' + escapeHtml(t('chat_safety_card_title')) + '</strong>' +
          '<p>' + escapeHtml(t('chat_safety_notice_short')) + '</p>' +
          '<p style="margin-top:6px;">' + escapeHtml(t('chat_legal_moderation_desc')) + '</p>' +
        '</div>' +
      '</div>';
    return;
  }

  var otherUid = getOtherChatParticipantUid(chatObj, myUid);
  var other = getChatParticipantDisplay(chatObj, otherUid);
  var isPeerDeleted = !!other.isDeleted;
  var reasonText = getChatReasonLabel(chatObj.reason);
  var isBanned = isCurrentUserChatBanned();

  // If this accepted conversation is already mounted with the same UI state,
  // do NOT destroy #chatMessagesContainer or #chatMessageInput while user types/reads.
  if (chatObj.status === 'accepted' &&
      _renderedChatPaneId === chatObj.id &&
      _renderedChatPaneStatus === 'accepted' &&
      _renderedChatSafetyOpen === isChatSafetyExpanded &&
      _renderedChatBanState === isBanned &&
      _renderedChatPeerDeleted === isPeerDeleted &&
      (isPeerDeleted || document.getElementById('chatMessageInput')) &&
      document.getElementById('chatMessagesContainer')) {
    var peerNameEl = document.getElementById('chatPeerName');
    if (peerNameEl) peerNameEl.innerHTML = escapeHtml(other.displayName) + renderPlayerLangFlag(other.lang);
    var peerAvEl = document.getElementById('chatPeerAvatar');
    if (peerAvEl) peerAvEl.innerHTML = renderAvatarHtml(other.avatarUrl, '🎣');
    return;
  }

  var banBanner = '';
  if (isBanned) {
    var banUntilStr = (currentChatBan && currentChatBan.bannedUntil)
      ? formatChatTimeLabel(currentChatBan.bannedUntil)
      : t('chat_ban_permanent');
    banBanner = '<div class="chat-ban-banner">⛔ ' +
      escapeHtml(t('chat_banned_banner', { until: banUntilStr, reason: (currentChatBan && currentChatBan.reason) || '-' })) +
      '</div>';
  }

  var safetyDetailsHtml = '';
  if (isChatSafetyExpanded) {
    safetyDetailsHtml =
      '<div class="chat-safety-details">' +
        '<div><strong>🔒 ' + escapeHtml(t('chat_safety_card_title')) + '</strong></div>' +
        '<ul>' +
          '<li>' + escapeHtml(t('chat_safety_point_plaintext')) + '</li>' +
          '<li>' + escapeHtml(t('chat_safety_point_retention')) + '</li>' +
          '<li>' + escapeHtml(t('chat_safety_point_restrictions')) + '</li>' +
          '<li>' + escapeHtml(t('chat_safety_point_illegal')) + '</li>' +
        '</ul>' +
      '</div>';
  }

  var safeChatId = sanitizeDomId(chatObj.id);
  var safeOtherUid = sanitizeDomId(otherUid);
  var headerActionsHtml = '';
  if (isPeerDeleted) {
    if (chatObj.status === 'accepted' || chatObj.preBlockStatus === 'accepted' || !!chatObj.lastMessageAt) {
      headerActionsHtml += '<button type="button" class="chat-hdr-action-btn" onclick="window.fishaoApp.openChatReportModal(\'' + safeChatId + '\')" title="' + escapeHtml(t('chat_btn_report')) + '" aria-label="' + escapeHtml(t('chat_btn_report')) + '">🚩<span class="chat-hdr-btn-label"> ' + escapeHtml(t('chat_btn_report')) + '</span></button>';
    }
    headerActionsHtml += '<button type="button" class="chat-hdr-action-btn danger" onclick="window.fishaoApp.dismissDeletedChatThread(\'' + safeChatId + '\')" title="' + escapeHtml(t('chat_btn_delete_thread')) + '" aria-label="' + escapeHtml(t('chat_btn_delete_thread')) + '">🗑️<span class="chat-hdr-btn-label"> ' + escapeHtml(t('chat_btn_delete_thread')) + '</span></button>';
  } else {
    headerActionsHtml += '<button type="button" class="chat-hdr-action-btn" onclick="window.fishaoApp.openChatReportModal(\'' + safeChatId + '\')" title="' + escapeHtml(t('chat_btn_report')) + '" aria-label="' + escapeHtml(t('chat_btn_report')) + '">🚩<span class="chat-hdr-btn-label"> ' + escapeHtml(t('chat_btn_report')) + '</span></button>';
    if (chatObj.status === 'accepted' || chatObj.status === 'pending' || chatObj.status === 'rejected') {
      headerActionsHtml += '<button type="button" class="chat-hdr-action-btn danger" onclick="window.fishaoApp.blockChatUser(\'' + safeChatId + '\')" title="' + escapeHtml(t('chat_btn_block')) + '" aria-label="' + escapeHtml(t('chat_btn_block')) + '">🚫<span class="chat-hdr-btn-label"> ' + escapeHtml(t('chat_btn_block')) + '</span></button>';
    } else if (chatObj.status === 'blocked' && chatObj.blockedBy === myUid) {
      headerActionsHtml += '<button type="button" class="chat-hdr-action-btn" onclick="window.fishaoApp.unblockChatUser(\'' + safeChatId + '\')" title="' + escapeHtml(t('chat_btn_unblock')) + '" aria-label="' + escapeHtml(t('chat_btn_unblock')) + '">🔓<span class="chat-hdr-btn-label"> ' + escapeHtml(t('chat_btn_unblock')) + '</span></button>';
    }
  }

  var headerHtml =
    '<div class="chat-thread-header">' +
      '<button type="button" class="chat-mobile-back-btn" onclick="window.fishaoApp.backToChatList()" aria-label="' + escapeHtml(t('action_back')) + '">←</button>' +
      '<button type="button" class="chat-peer-profile-btn" onclick="window.fishaoApp.openPlayerModal(\'' + safeOtherUid + '\')">' +
        '<div id="chatPeerAvatar" class="chat-peer-avatar">' + renderAvatarHtml(other.avatarUrl, '🎣') + '</div>' +
        '<div class="chat-peer-meta">' +
          '<div id="chatPeerName" class="chat-peer-name">' + escapeHtml(other.displayName) + renderPlayerLangFlag(other.lang) + '</div>' +
          '<div class="chat-peer-reason">' + escapeHtml(reasonText) + '</div>' +
        '</div>' +
      '</button>' +
      '<div class="chat-header-actions">' +
        '<button type="button" class="chat-hdr-action-btn info" onclick="window.fishaoApp.toggleChatSafetyPanel()" title="' + escapeHtml(t('chat_btn_safety_info')) + '">ℹ️</button>' +
        headerActionsHtml +
      '</div>' +
    '</div>' +
    '<div class="chat-safety-strip">' +
      '<span>⚠️ ' + escapeHtml(t('chat_safety_notice_short')) + '</span>' +
      '<button type="button" class="chat-safety-more-btn" onclick="window.fishaoApp.toggleChatSafetyPanel()">' +
        escapeHtml(isChatSafetyExpanded ? t('chat_safety_hide_btn') : t('chat_safety_more_btn')) +
      '</button>' +
    '</div>' +
    safetyDetailsHtml +
    banBanner;

  var bodyHtml = '';
  if (isPeerDeleted && chatObj.status !== 'accepted') {
    bodyHtml =
      '<div class="chat-state-card">' +
        '<div class="chat-state-icon">👻</div>' +
        '<h4>' + escapeHtml(t('chat_deleted_player_name')) + '</h4>' +
        '<p>' + escapeHtml(t('chat_deleted_peer_state_desc')) + '</p>' +
        '<button type="button" class="pill-btn danger" onclick="window.fishaoApp.dismissDeletedChatThread(\'' + safeChatId + '\')">🗑️ ' + escapeHtml(t('chat_btn_delete_thread')) + '</button>' +
      '</div>';
    _renderedChatPaneId = chatObj.id;
    _renderedChatPaneStatus = chatObj.status;
    _renderedChatSafetyOpen = isChatSafetyExpanded;
    _renderedChatBanState = isBanned;
    _renderedChatPeerDeleted = true;
    pane.innerHTML = headerHtml + '<div class="chat-messages-scroll">' + bodyHtml + '</div>';
    return;
  }

  if (chatObj.status === 'pending') {
    if (chatObj.requestedBy === myUid) {
      bodyHtml =
        '<div class="chat-state-card">' +
          '<div class="chat-state-icon">⏳</div>' +
          '<h4>' + escapeHtml(t('chat_pending_outgoing_title')) + '</h4>' +
          '<p>' + escapeHtml(t('chat_pending_outgoing_desc', { name: other.displayName })) + '</p>' +
          '<button type="button" class="pill-btn danger" onclick="window.fishaoApp.cancelChatRequest(\'' + safeChatId + '\')">🗑️ ' + escapeHtml(t('chat_btn_cancel_request')) + '</button>' +
        '</div>';
    } else {
      var rulesHtml = '';
      if (!hasAcceptedChatRules(myUid)) {
        rulesHtml =
          '<label class="chat-rules-agree-row">' +
            '<input type="checkbox" id="chatAcceptRulesChk"> ' +
            '<span>' + escapeHtml(t('chat_rules_checkbox_label')) + '</span>' +
          '</label>';
      }
      bodyHtml =
        '<div class="chat-state-card">' +
          '<div class="chat-state-icon">📩</div>' +
          '<h4>' + escapeHtml(t('chat_pending_incoming_title', { name: other.displayName })) + '</h4>' +
          '<p>' + escapeHtml(t('chat_pending_incoming_reason', { reason: reasonText })) + '</p>' +
          rulesHtml +
          '<div class="chat-state-actions">' +
            '<button type="button" class="pill-btn primary active" onclick="window.fishaoApp.acceptChatRequest(\'' + safeChatId + '\')">✓ ' + escapeHtml(t('chat_btn_accept')) + '</button>' +
            '<button type="button" class="pill-btn danger" onclick="window.fishaoApp.rejectChatRequest(\'' + safeChatId + '\')">✕ ' + escapeHtml(t('chat_btn_reject')) + '</button>' +
          '</div>' +
        '</div>';
    }
    _renderedChatPaneId = chatObj.id;
    _renderedChatPaneStatus = chatObj.status;
    _renderedChatSafetyOpen = isChatSafetyExpanded;
    _renderedChatBanState = isBanned;
    _renderedChatPeerDeleted = false;
    pane.innerHTML = headerHtml + '<div class="chat-messages-scroll">' + bodyHtml + '</div>';
    return;
  }

  if (chatObj.status === 'rejected') {
    var rejectedByMe = (chatObj.requestedBy !== myUid);
    var rejRulesHtml = '';
    if (rejectedByMe && !hasAcceptedChatRules(myUid)) {
      rejRulesHtml =
        '<label class="chat-rules-agree-row">' +
          '<input type="checkbox" id="chatAcceptRulesChk"> ' +
          '<span>' + escapeHtml(t('chat_rules_checkbox_label')) + '</span>' +
        '</label>';
    }
    bodyHtml =
      '<div class="chat-state-card">' +
        '<div class="chat-state-icon">⛔</div>' +
        '<h4>' + escapeHtml(t('chat_rejected_title')) + '</h4>' +
        '<p>' + escapeHtml(t('chat_rejected_desc')) + '</p>' +
        rejRulesHtml +
        (rejectedByMe
          ? '<div class="chat-state-actions">' +
              '<button type="button" class="pill-btn primary active" onclick="window.fishaoApp.acceptChatRequest(\'' + safeChatId + '\')">✓ ' + escapeHtml(t('chat_btn_accept')) + '</button>' +
              '<button type="button" class="pill-btn" onclick="window.fishaoApp.unblockChatUser(\'' + safeChatId + '\')">🔓 ' + escapeHtml(t('chat_btn_unblock')) + '</button>' +
            '</div>'
          : '') +
      '</div>';
    _renderedChatPaneId = chatObj.id;
    _renderedChatPaneStatus = chatObj.status;
    _renderedChatSafetyOpen = isChatSafetyExpanded;
    _renderedChatBanState = isBanned;
    _renderedChatPeerDeleted = false;
    pane.innerHTML = headerHtml + '<div class="chat-messages-scroll">' + bodyHtml + '</div>';
    return;
  }

  if (chatObj.status === 'blocked') {
    var blockedByMe = (chatObj.blockedBy === myUid);
    bodyHtml =
      '<div class="chat-state-card">' +
        '<div class="chat-state-icon">🚫</div>' +
        '<h4>' + escapeHtml(t('chat_blocked_title')) + '</h4>' +
        '<p>' + escapeHtml(t(blockedByMe ? 'chat_blocked_by_me_desc' : 'chat_blocked_by_other_desc')) + '</p>' +
        (blockedByMe
          ? '<button type="button" class="pill-btn" onclick="window.fishaoApp.unblockChatUser(\'' + safeChatId + '\')">🔓 ' + escapeHtml(t('chat_btn_unblock')) + '</button>'
          : '') +
      '</div>';
    _renderedChatPaneId = chatObj.id;
    _renderedChatPaneStatus = chatObj.status;
    _renderedChatSafetyOpen = isChatSafetyExpanded;
    _renderedChatBanState = isBanned;
    _renderedChatPeerDeleted = false;
    pane.innerHTML = headerHtml + '<div class="chat-messages-scroll">' + bodyHtml + '</div>';
    return;
  }

  // Accepted conversation: preserve composer text if toggling safety panel within the same chat
  var prevInputVal = '';
  var prevInput = document.getElementById('chatMessageInput');
  if (prevInput && prevInput.dataset.chatId === chatObj.id) {
    prevInputVal = prevInput.value;
  }

  _renderedChatPaneId = chatObj.id;
  _renderedChatPaneStatus = 'accepted';
  _renderedChatSafetyOpen = isChatSafetyExpanded;
  _renderedChatBanState = isBanned;
  _renderedChatPeerDeleted = isPeerDeleted;

  if (isPeerDeleted) {
    pane.innerHTML =
      headerHtml +
      '<div class="chat-messages-scroll" id="chatMessagesContainer"></div>' +
      '<div class="chat-deleted-peer-footer">' +
        '<span>👻 ' + escapeHtml(t('chat_deleted_peer_notice')) + '</span>' +
        '<button type="button" class="pill-btn danger" onclick="window.fishaoApp.dismissDeletedChatThread(\'' + safeChatId + '\')">🗑️ ' + escapeHtml(t('chat_btn_delete_thread')) + '</button>' +
      '</div>';
    renderChatMessagesBody(true);
    return;
  }

  pane.innerHTML =
    headerHtml +
    '<div class="chat-messages-scroll" id="chatMessagesContainer"></div>' +
    '<div class="chat-composer">' +
      '<div class="chat-composer-row">' +
        '<textarea id="chatMessageInput" class="chat-textarea" rows="2" maxlength="' + CHAT_MAX_MSG_LEN + '" ' +
          'data-chat-id="' + escapeHtml(chatObj.id) + '" ' +
          'placeholder="' + escapeHtml(t('chat_input_placeholder')) + '" ' +
          (isBanned ? 'disabled ' : '') +
          'oninput="window.fishaoApp.updateChatCharCounter()" ' +
          'onkeydown="window.fishaoApp.onChatInputKeyDown(event)"></textarea>' +
        '<button type="button" id="chatSendBtn" class="chat-send-btn" ' + (isBanned ? 'disabled ' : '') +
          'onclick="window.fishaoApp.sendChatMessage()">' + escapeHtml(t('chat_btn_send')) + '</button>' +
      '</div>' +
      '<div class="chat-composer-meta">' +
        '<span class="chat-composer-hint">' + escapeHtml(t('chat_composer_hint')) + '</span>' +
        '<span id="chatCharCounter" class="chat-char-counter">0 / ' + CHAT_MAX_MSG_LEN + '</span>' +
      '</div>' +
    '</div>';

  var newInput = document.getElementById('chatMessageInput');
  if (newInput && prevInputVal) {
    newInput.value = prevInputVal;
  }
  updateChatCharCounter();
  renderChatMessagesBody(true);
}

function renderChatMessagesBody(scrollToBottom) {
  var container = document.getElementById('chatMessagesContainer');
  if (!container || !currentUser) return;

  var myUid = currentUser.uid;
  if (!activeChatMessages || activeChatMessages.length === 0) {
    container.innerHTML =
      '<div class="chat-msgs-empty">' +
        '<div>💬 ' + escapeHtml(t('chat_msgs_empty_title')) + '</div>' +
        '<div style="font-size:11.5px; color: var(--text-muted); margin-top:4px;">' + escapeHtml(t('chat_msgs_empty_hint')) + '</div>' +
      '</div>';
    return;
  }

  var html = '';
  activeChatMessages.forEach(function (m) {
    var isMine = (m.senderUid === myUid);
    html +=
      '<div class="chat-msg-row ' + (isMine ? 'mine' : 'theirs') + '">' +
        '<div class="chat-msg-bubble">' +
          '<div class="chat-msg-text">' + escapeHtml(m.text || '') + '</div>' +
          '<div class="chat-msg-time">' + escapeHtml(formatChatTimeLabel(m.createdAt)) + '</div>' +
        '</div>' +
      '</div>';
  });

  container.innerHTML = html;
  if (scrollToBottom) {
    container.scrollTop = container.scrollHeight;
  }
}

var _isOpeningReportCheck = false;

async function openChatReportModal(chatId) {
  if (!currentUser || !chatId || _isOpeningReportCheck) return;
  var chatObj = allMyChats.find(function (c) { return c.id === chatId; });
  if (!chatObj) return;

  var myUid = currentUser.uid;
  var reportedUid = getOtherChatParticipantUid(chatObj, myUid);
  if (!reportedUid) return;

  if (db) {
    _isOpeningReportCheck = true;
    try {
      var fsModule = await getFirestoreModule();
      var repSnap = await fsModule.getDoc(fsModule.doc(db, 'chat_reports', myUid + '_' + reportedUid));
      if (repSnap.exists()) {
        var repData = repSnap.data() || {};
        if (repData.status === 'open') {
          showToast(t('chat_err_already_reported_open'), 'info');
          return;
        }
      }
    } catch (err) {
      console.warn('Could not check existing chat report status:', err);
    } finally {
      _isOpeningReportCheck = false;
    }
  }

  chatReportTargetChatId = chatId;
  var overlay = document.getElementById('chatReportModalOverlay');
  if (!overlay) return;

  var sel = document.getElementById('chatReportCategorySelect');
  if (sel) sel.value = 'harassment';
  var noteEl = document.getElementById('chatReportNoteInput');
  if (noteEl) noteEl.value = '';
  var blkChk = document.getElementById('chatReportAlsoBlockChk');
  if (blkChk) blkChk.checked = true;

  overlay.classList.add('active');
}

function closeChatReportModal() {
  var overlay = document.getElementById('chatReportModalOverlay');
  if (overlay) overlay.classList.remove('active');
  chatReportTargetChatId = null;
}

async function submitChatReport() {
  if (!currentUser || !db || !chatReportTargetChatId) return;
  if (isCurrentUserChatBanned()) {
    showToast(t('chat_banned_notice'), 'error');
    return;
  }

  var chatObj = allMyChats.find(function (c) { return c.id === chatReportTargetChatId; });
  if (!chatObj) return;

  var catSel = document.getElementById('chatReportCategorySelect');
  var category = catSel ? catSel.value : 'other';
  if (CHAT_REPORT_CATEGORIES.indexOf(category) === -1) category = 'other';

  var noteEl = document.getElementById('chatReportNoteInput');
  var rawNote = noteEl ? String(noteEl.value || '').trim() : '';
  if (rawNote.length > CHAT_MAX_NOTE_LEN) {
    showToast(t('chat_err_too_long'), 'error');
    return;
  }
  if (/[<>]/.test(rawNote)) {
    showToast(t('chat_err_no_html'), 'error');
    return;
  }

  var alsoBlockChk = document.getElementById('chatReportAlsoBlockChk');
  var alsoBlock = !!(alsoBlockChk && alsoBlockChk.checked);

  var myUid = currentUser.uid;
  var reportedUid = getOtherChatParticipantUid(chatObj, myUid);
  var reportId = myUid + '_' + reportedUid;

  var submitBtn = document.getElementById('btnSubmitChatReport');
  if (submitBtn) submitBtn.disabled = true;

  try {
    var fsModule = await getFirestoreModule();
    var repRef = fsModule.doc(db, 'chat_reports', reportId);

    var existingSnap = await fsModule.getDoc(repRef);
    if (existingSnap.exists()) {
      var existingData = existingSnap.data() || {};
      if (existingData.status === 'open') {
        closeChatReportModal();
        showToast(t('chat_err_already_reported_open'), 'info');
        return;
      }
    }

    var sourceMsgs = (activeChatId === chatObj.id && Array.isArray(activeChatMessages) && activeChatMessages.length > 0)
      ? activeChatMessages.slice(-15)
      : [];
    if (sourceMsgs.length === 0 && (chatObj.lastMessageAt || chatObj.status === 'accepted' || chatObj.preBlockStatus === 'accepted')) {
      try {
        var evQ = fsModule.query(
          fsModule.collection(db, 'chats', chatObj.id, 'messages'),
          fsModule.orderBy('createdAt', 'desc'),
          fsModule.limit(15)
        );
        var evSnap = await fsModule.getDocs(evQ);
        var fetched = [];
        evSnap.forEach(function (d) {
          fetched.push(d.data({ serverTimestamps: 'estimate' }) || {});
        });
        fetched.reverse();
        sourceMsgs = fetched;
      } catch (evErr) {
        console.warn('Could not fetch evidence messages for report:', evErr);
      }
    }

    var evidence = sourceMsgs.map(function (m) {
      return {
        senderUid: String(m.senderUid || ''),
        text: String(m.text || '').slice(0, CHAT_MAX_MSG_LEN),
        createdAt: formatChatTimeLabel(m.createdAt) || ''
      };
    });

    var expiresTs = fsModule.Timestamp.fromMillis(Date.now() + CHAT_REPORT_RETENTION_DAYS * 24 * 60 * 60 * 1000);

    await fsModule.setDoc(repRef, {
      chatId: chatObj.id,
      reporterUid: myUid,
      reportedUid: reportedUid,
      category: category,
      note: rawNote,
      evidenceMessages: evidence,
      status: 'open',
      createdAt: fsModule.serverTimestamp(),
      expiresAt: expiresTs
    });

    if (alsoBlock && chatObj.status !== 'blocked') {
      await fsModule.updateDoc(fsModule.doc(db, 'chats', chatObj.id), {
        status: 'blocked',
        blockedBy: myUid,
        preBlockStatus: chatObj.status || 'accepted',
        expiresAt: null,
        updatedAt: fsModule.serverTimestamp()
      });
      if (activeChatId === chatObj.id) {
        if (chatMessagesUnsubscribe) {
          try { chatMessagesUnsubscribe(); } catch (e) {}
          chatMessagesUnsubscribe = null;
        }
        _boundMessagesChatId = null;
        activeChatMessages = [];
      }
    }

    closeChatReportModal();
    showToast(t('chat_toast_reported'), 'success');
  } catch (err) {
    console.error('Failed to submit chat report:', err);
    if (err && err.code === 'permission-denied') {
      showToast(t('chat_err_already_reported_open'), 'error');
    } else {
      showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
    }
  } finally {
    if (submitBtn) submitBtn.disabled = false;
  }
}

/**
 * Clean up / anonymize chats when user deletes their account (called from js/auth.js deleteAccount)
 */
async function cleanupUserChatsOnAccountDelete(uid) {
  if (!uid || !db) return;
  try {
    var fsModule = await getFirestoreModule();
    var q = fsModule.query(
      fsModule.collection(db, 'chats'),
      fsModule.where('participants', 'array-contains', uid)
    );
    var snap = await fsModule.getDocs(q);
    var tasks = [];
    snap.forEach(function (docSnap) {
      var d = docSnap.data() || {};
      if (d.status === 'pending' && d.requestedBy === uid) {
        tasks.push(fsModule.deleteDoc(docSnap.ref).catch(function () {}));
      } else {
        var anon = {};
        anon['participantInfo.' + uid] = {
          displayName: 'Deleted player',
          avatarUrl: '🎣',
          deleted: true
        };
        tasks.push(fsModule.updateDoc(docSnap.ref, anon).catch(function () {}));
      }
    });
    await Promise.all(tasks);
  } catch (err) {
    console.warn('Could not clean up user chats during account deletion:', err);
  }
}

// =============================================================
// Admin Moderation Panel & Real-time Open Report Notifications
// =============================================================

function updateAdminReportsAlertUI() {
  var badge = document.getElementById('adminBadge');
  var hdrCnt = document.getElementById('adminHeaderReportCount');
  var secBadge = document.getElementById('adminSectionReportCountBadge');
  var showAlert = !!(currentUser && isAdmin && adminOpenReportsCount > 0);

  if (badge) {
    badge.classList.toggle('has-open-reports', showAlert);
    badge.title = showAlert
      ? t('admin_reports_pending_tooltip', { count: adminOpenReportsCount })
      : '';
  }
  if (hdrCnt) {
    if (showAlert) {
      hdrCnt.textContent = '🚩 ' + (adminOpenReportsCount > 99 ? '99+' : String(adminOpenReportsCount));
      hdrCnt.style.display = 'inline-flex';
    } else {
      hdrCnt.style.display = 'none';
    }
  }
  if (secBadge) {
    if (showAlert) {
      secBadge.textContent = t('admin_reports_open_badge', { count: adminOpenReportsCount });
      secBadge.style.display = 'inline-flex';
    } else {
      secBadge.style.display = 'none';
    }
  }
}

async function syncAdminReportsWatcher() {
  if (!currentUser || !isAdmin || !db) {
    if (chatAdminReportsUnsubscribe) {
      try { chatAdminReportsUnsubscribe(); } catch (e) {}
      chatAdminReportsUnsubscribe = null;
    }
    _adminReportsWatcherUid = null;
    adminOpenReportsCount = 0;
    _adminSeenReportIds.clear();
    updateAdminReportsAlertUI();
    return;
  }

  if (chatAdminReportsUnsubscribe && _adminReportsWatcherUid === currentUser.uid) {
    updateAdminReportsAlertUI();
    return;
  }

  if (chatAdminReportsUnsubscribe) {
    try { chatAdminReportsUnsubscribe(); } catch (e) {}
    chatAdminReportsUnsubscribe = null;
  }

  var watchUid = currentUser.uid;
  _adminReportsWatcherUid = watchUid;
  _adminSeenReportIds.clear();

  try {
    var fsModule = await getFirestoreModule();
    if (!currentUser || currentUser.uid !== watchUid || !isAdmin) return;

    var q = fsModule.query(
      fsModule.collection(db, 'chat_reports'),
      fsModule.where('status', '==', 'open')
    );
    chatAdminReportsUnsubscribe = fsModule.onSnapshot(q, function (snap) {
      if (!currentUser || currentUser.uid !== watchUid || !isAdmin) return;
      adminOpenReportsCount = snap.size;
      var hasUnseen = false;
      var nextIds = new Set();
      snap.forEach(function (d) {
        nextIds.add(d.id);
        if (!_adminSeenReportIds.has(d.id)) {
          hasUnseen = true;
        }
      });
      _adminSeenReportIds = nextIds;
      updateAdminReportsAlertUI();

      if (hasUnseen && adminOpenReportsCount > 0) {
        showToast(t('admin_new_report_toast', { count: adminOpenReportsCount }), 'info');
        var profModal = document.getElementById('profileModalOverlay');
        var repList = document.getElementById('adminChatReportsList');
        if (profModal && profModal.classList.contains('active') && repList && repList.style.display !== 'none') {
          loadAdminChatReports();
        }
      }
    }, function (err) {
      console.warn('Admin reports watcher warning:', err);
    });
  } catch (err) {
    if (_adminReportsWatcherUid === watchUid) _adminReportsWatcherUid = null;
    console.warn('Failed to attach admin reports watcher:', err);
  }
}

var adminReportsFilterMode = 'open'; // 'open' | 'all'

function setAdminReportsFilterMode(mode) {
  if (mode === 'all') adminReportsFilterMode = 'all';
  else if (mode === 'bans') adminReportsFilterMode = 'bans';
  else adminReportsFilterMode = 'open';

  document.querySelectorAll('.admin-report-filter-pill').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-report-filter') === adminReportsFilterMode);
  });
  loadAdminChatReports();
}

function resolveAdminPlayerInfo(uid) {
  if (!uid) return { displayName: '', avatarUrl: '🎣', preferredLang: '' };
  if (typeof allPlayersList !== 'undefined' && Array.isArray(allPlayersList)) {
    var p = allPlayersList.find(function (x) { return x.uid === uid; });
    if (p) {
      return {
        displayName: p.displayName || '',
        avatarUrl: p.avatarUrl || '🎣',
        preferredLang: p.preferredLang || ''
      };
    }
  }
  return { displayName: '', avatarUrl: '🎣', preferredLang: '' };
}

async function renderAdminBannedUsersList(box) {
  try {
    if (typeof allPlayersList !== 'undefined' && allPlayersList.length === 0 && typeof loadAllPlayers === 'function') {
      await Promise.resolve(loadAllPlayers(false)).catch(function () {});
    }
    var fsModule = await getFirestoreModule();
    var snap = await fsModule.getDocs(fsModule.collection(db, 'chat_bans'));
    var bans = [];
    snap.forEach(function (d) {
      bans.push({ uid: d.id, data: d.data() || {} });
    });
    bans.sort(function (a, b) {
      return chatTsToMs(b.data.bannedAt) - chatTsToMs(a.data.bannedAt);
    });

    if (bans.length === 0) {
      box.innerHTML = '<div style="font-size:12px; color: var(--text-muted);">' + escapeHtml(t('admin_bans_empty')) + '</div>';
      return;
    }

    var nowMs = Date.now();
    var html = '';
    bans.forEach(function (entry) {
      var b = entry.data;
      var uid = entry.uid;
      var info = resolveAdminPlayerInfo(uid);
      var untilMs = (b.bannedUntil !== null && b.bannedUntil !== undefined) ? chatTsToMs(b.bannedUntil) : 0;
      var isPerm = (b.bannedUntil === null || b.bannedUntil === undefined);
      var isExpired = (!isPerm && untilMs > 0 && untilMs <= nowMs);
      var untilText = isPerm ? t('chat_ban_permanent') : formatChatTimeLabel(b.bannedUntil);

      html += '<div class="admin-report-card' + (isExpired ? '' : ' status-open') + '">' +
        '<div class="admin-report-top">' +
          '<span style="display:inline-flex;align-items:center;gap:6px;">' +
            '<span style="width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;overflow:hidden;flex-shrink:0;background:rgba(255,255,255,0.06);">' +
              renderAvatarHtml(info.avatarUrl, '🎣') +
            '</span>' +
            '<strong>' + escapeHtml(info.displayName || t('user_default_player')) + renderPlayerLangFlag(info.preferredLang) + '</strong>' +
          '</span>' +
          (isExpired
            ? '<span class="chat-status-chip">' + escapeHtml(t('admin_ban_expired_tag')) + '</span>'
            : '<span class="chat-status-chip blocked">' + escapeHtml(untilText) + '</span>') +
        '</div>' +
        '<div class="admin-report-uids">' +
          '<span>UID: <code>' + escapeHtml(uid) + '</code></span>' +
          (b.reason ? (' • <span>' + escapeHtml(t('admin_ban_reason_label')) + ': ' + escapeHtml(b.reason) + '</span>') : '') +
        '</div>' +
        '<div class="admin-report-actions">' +
          '<button type="button" class="pill-btn" style="height:28px;font-size:11px;padding:0 10px;" onclick="window.fishaoApp.adminUnbanChatUser(\'' + sanitizeDomId(uid) + '\')">🔓 ' + escapeHtml(t('admin_unban_btn')) + '</button>' +
        '</div>' +
      '</div>';
    });

    box.innerHTML = html;
  } catch (err) {
    console.error('Failed to load banned users:', err);
    box.innerHTML = '<div style="font-size:12px; color:#f87171;">' + escapeHtml(err && err.message ? err.message : 'Error') + '</div>';
  }
}

async function loadAdminChatReports() {
  if (!currentUser || !isAdmin || !db) return;
  document.querySelectorAll('.admin-report-filter-pill').forEach(function (b) {
    b.classList.toggle('active', b.getAttribute('data-report-filter') === adminReportsFilterMode);
  });
  var box = document.getElementById('adminChatReportsList');
  if (!box) return;

  box.style.display = 'flex';
  box.innerHTML = '<div style="font-size:12px; color: var(--text-muted);">⏳ ' + escapeHtml(t('loading_short')) + '</div>';

  if (adminReportsFilterMode === 'bans') {
    await renderAdminBannedUsersList(box);
    return;
  }

  try {
    var fsModule = await getFirestoreModule();
    var q = (adminReportsFilterMode === 'open')
      ? fsModule.query(
          fsModule.collection(db, 'chat_reports'),
          fsModule.where('status', '==', 'open')
        )
      : fsModule.query(
          fsModule.collection(db, 'chat_reports'),
          fsModule.orderBy('createdAt', 'desc'),
          fsModule.limit(30)
        );
    var snap = await fsModule.getDocs(q);

    var docsList = [];
    snap.forEach(function (d) {
      docsList.push({ id: d.id, data: d.data() || {} });
    });
    if (adminReportsFilterMode === 'open') {
      docsList.sort(function (a, b) {
        return chatTsToMs(b.data.createdAt) - chatTsToMs(a.data.createdAt);
      });
    }

    if (docsList.length === 0) {
      box.innerHTML = '<div style="font-size:12px; color: var(--text-muted);">' +
        escapeHtml(t(adminReportsFilterMode === 'open' ? 'admin_reports_open_empty' : 'admin_reports_empty')) +
        '</div>';
      return;
    }

    var html = '';
    docsList.forEach(function (entry) {
      var docId = entry.id;
      var safeDocId = sanitizeDomId(docId);
      var r = entry.data;
      var safeReportedUid = sanitizeDomId(r.reportedUid || '');
      var safeCategory = sanitizeDomId(r.category || 'abuse');
      var st = r.status || 'open';
      var repInfo = resolveAdminPlayerInfo(r.reportedUid);
      var reporterInfo = resolveAdminPlayerInfo(r.reporterUid);
      var evMsgs = Array.isArray(r.evidenceMessages) ? r.evidenceMessages : [];
      var evHtml = '';
      if (evMsgs.length > 0) {
        evHtml = '<div class="admin-report-evidence">';
        evMsgs.forEach(function (m) {
          var who = (m.senderUid === r.reportedUid) ? '🚨' : '👤';
          evHtml += '<div class="admin-report-ev-line">' +
            '<span>' + who + ' <code>' + escapeHtml(String(m.senderUid || '').slice(0, 8)) + '</code>: </span>' +
            '<span>' + escapeHtml(m.text || '') + '</span>' +
            (m.createdAt ? ' <span style="opacity:0.6;font-size:10px;">(' + escapeHtml(m.createdAt) + ')</span>' : '') +
          '</div>';
        });
        evHtml += '</div>';
      }

      var closeBtnsHtml = (st === 'open')
        ? '<button type="button" class="pill-btn primary" style="height:28px;font-size:11px;padding:0 10px;" onclick="window.fishaoApp.adminUpdateReportStatus(\'' + safeDocId + '\', \'resolved\')">✓ ' + escapeHtml(t('admin_btn_report_resolve')) + '</button>' +
          '<button type="button" class="pill-btn" style="height:28px;font-size:11px;padding:0 10px;" onclick="window.fishaoApp.adminUpdateReportStatus(\'' + safeDocId + '\', \'dismissed\')">' + escapeHtml(t('admin_btn_report_dismiss')) + '</button>'
        : '';

      html += '<div class="admin-report-card status-' + escapeHtml(st) + '">' +
        '<div class="admin-report-top">' +
          '<span><strong>' + escapeHtml(getChatReportCategoryLabel(r.category)) + '</strong> • ' + escapeHtml(formatChatTimeLabel(r.createdAt)) + '</span>' +
          '<span class="chat-status-chip ' + escapeHtml(st) + '">' + escapeHtml(st) + '</span>' +
        '</div>' +
        '<div class="admin-report-uids">' +
          '<span>' + escapeHtml(t('admin_report_reported')) + ': ' +
            (repInfo.displayName ? ('<strong>' + escapeHtml(repInfo.displayName) + renderPlayerLangFlag(repInfo.preferredLang) + '</strong> ') : '') +
            '<code>' + escapeHtml(r.reportedUid || '') + '</code></span> | ' +
          '<span>' + escapeHtml(t('admin_report_reporter')) + ': ' +
            (reporterInfo.displayName ? ('<strong>' + escapeHtml(reporterInfo.displayName) + renderPlayerLangFlag(reporterInfo.preferredLang) + '</strong> ') : '') +
            '<code>' + escapeHtml(r.reporterUid || '') + '</code></span>' +
        '</div>' +
        (r.note ? '<div class="admin-report-note">"' + escapeHtml(r.note) + '"</div>' : '') +
        evHtml +
        '<div class="admin-report-actions">' +
          '<button type="button" class="pill-btn danger" style="height:28px;font-size:11px;padding:0 10px;" onclick="window.fishaoApp.adminBanChatUser(\'' + safeReportedUid + '\', \'' + safeCategory + '\', 7, \'' + safeDocId + '\')">' + escapeHtml(t('admin_btn_ban_7d')) + '</button>' +
          '<button type="button" class="pill-btn danger active" style="height:28px;font-size:11px;padding:0 10px;" onclick="window.fishaoApp.adminBanChatUser(\'' + safeReportedUid + '\', \'' + safeCategory + '\', 0, \'' + safeDocId + '\')">' + escapeHtml(t('admin_btn_ban_perm')) + '</button>' +
          closeBtnsHtml +
        '</div>' +
      '</div>';
    });

    box.innerHTML = html;
  } catch (err) {
    console.error('Failed to load chat reports:', err);
    box.innerHTML = '<div style="font-size:12px; color:#f87171;">' + escapeHtml(err && err.message ? err.message : 'Error') + '</div>';
  }
}

async function adminBanChatUser(targetUid, reasonCode, days, reportId) {
  if (!currentUser || !isAdmin || !db || !targetUid) return;
  var banLabel = (days && days > 0) ? t('admin_btn_ban_7d') : t('admin_btn_ban_perm');
  var info = resolveAdminPlayerInfo(targetUid);
  var targetLabel = (info && info.displayName) ? (info.displayName + ' (' + targetUid + ')') : targetUid;
  var ok = await showConfirmModal(
    banLabel,
    t('admin_report_reported') + ': ' + targetLabel,
    banLabel,
    true
  );
  if (!ok) return;

  try {
    var fsModule = await getFirestoreModule();
    var banRef = fsModule.doc(db, 'chat_bans', targetUid);
    var bannedUntil = (days && days > 0)
      ? fsModule.Timestamp.fromMillis(Date.now() + days * 24 * 60 * 60 * 1000)
      : null;

    await fsModule.setDoc(banRef, {
      reason: String(reasonCode || 'moderation').slice(0, 120),
      bannedAt: fsModule.serverTimestamp(),
      bannedUntil: bannedUntil,
      bannedBy: currentUser.uid
    });

    if (reportId) {
      await fsModule.updateDoc(fsModule.doc(db, 'chat_reports', reportId), {
        status: 'resolved'
      });
    }
    showToast(t('admin_ban_applied'), 'success');
    loadAdminChatReports();
  } catch (err) {
    console.error('Failed to ban chat user:', err);
    showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
  }
}

async function adminUpdateReportStatus(reportId, status) {
  if (!currentUser || !isAdmin || !db || !reportId) return;
  try {
    var fsModule = await getFirestoreModule();
    await fsModule.updateDoc(fsModule.doc(db, 'chat_reports', reportId), {
      status: status
    });
    showToast(t('admin_report_updated'), 'info');
    loadAdminChatReports();
  } catch (err) {
    console.error('Failed to update report status:', err);
    showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
  }
}

async function adminUnbanChatUser(uidOverride) {
  if (!currentUser || !isAdmin || !db) return;
  var input = document.getElementById('adminUnbanUidInput');
  var targetUid = uidOverride
    ? String(uidOverride).trim()
    : (input ? String(input.value || '').trim() : '');
  if (!targetUid) return;

  try {
    var fsModule = await getFirestoreModule();
    await fsModule.deleteDoc(fsModule.doc(db, 'chat_bans', targetUid));
    if (!uidOverride && input) input.value = '';
    showToast(t('admin_unban_success'), 'success');
    if (adminReportsFilterMode === 'bans') {
      loadAdminChatReports();
    }
  } catch (err) {
    console.error('Failed to unban chat user:', err);
    showToast(t('err_save') + (err && err.message ? err.message : ''), 'error');
  }
}
