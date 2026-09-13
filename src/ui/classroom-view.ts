import { targetFrequency, targetLabel } from '../domain/pitch';
import { feedbackDurationControl } from './feedback-settings';
import type { SessionDefaults } from '../domain/session-defaults';
import type { Session, TrackerData } from '../domain/tracker';
import type { Round } from '../domain/round';
import { roundSummary, retryIds } from '../domain/round';
export interface SessionModel {
  s: Session;
  db: TrackerData;
  round: Round;
  paused: boolean;
  mic: boolean;
  complete: boolean;
  status: string;
  result: string;
  mode: string;
  claps: boolean;
  undo: boolean;
  search: string;
  filter: string;
  devices: { deviceId: string; label: string }[];
  deviceId: string;
  micError: string;
}
const esc = (s: unknown) =>
  String(s ?? '').replace(
    /[&<>"']/g,
    (c) =>
      ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[
        c
      ]!,
  );
const action = (name: string, label: string, extra = '') =>
  `<button data-ui-click="${name}" ${extra}>${label}</button>`;
const studentChevron = (direction: 'previous' | 'next', extra = '') =>
  action(
    direction + '-student',
    `<svg aria-hidden="true" viewBox="0 0 24 24"><path d="${direction === 'previous' ? 'M15 5l-7 7 7 7' : 'M9 5l7 7-7 7'}" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg>`,
    `class="student-chevron ${extra}" aria-label="${direction === 'previous' ? 'Previous' : 'Next'} student"`,
  );
const microphoneStatusIcon = `<svg class="microphone-status-icon" aria-hidden="true" viewBox="0 0 24 24"><path d="M12 3a3 3 0 0 0-3 3v5a3 3 0 0 0 6 0V6a3 3 0 0 0-3-3Z"/><path d="M5 10v1a7 7 0 0 0 14 0v-1M12 18v3M9 21h6"/><path class="microphone-off-mark" d="m4 4 16 16"/></svg>`;
const attendanceToggle = (id: string, name: string, absent: boolean) =>
  action(
    'toggle-attendance',
    '<svg aria-hidden="true" viewBox="0 0 24 24"><circle cx="10" cy="7" r="3"/><path d="M3 21v-3a7 7 0 0 1 11-5M16 16l5 5m0-5l-5 5"/></svg>',
    `class="attendance-toggle" data-id="${esc(id)}" aria-label="Absent" aria-pressed="${absent}" title="${absent ? 'Mark present' : 'Mark absent'}: ${esc(name)}"`,
  );
// Cards have a stable structure: patch nodes in place to preserve focus and inputs.
function patchChildren(target: Node, source: Node): void {
  const incoming = [...source.childNodes];
  incoming.forEach((next, index) => {
    const current = target.childNodes[index];
    if (!current) {
      target.appendChild(next.cloneNode(true));
      return;
    }
    if (
      current.nodeType !== next.nodeType ||
      (current instanceof Element &&
        next instanceof Element &&
        current.tagName !== next.tagName)
    ) {
      target.replaceChild(next.cloneNode(true), current);
      return;
    }
    if (current instanceof Element && next instanceof Element) {
      for (const attr of [...current.attributes])
        if (!next.hasAttribute(attr.name)) current.removeAttribute(attr.name);
      for (const attr of [...next.attributes])
        if (current.getAttribute(attr.name) !== attr.value)
          current.setAttribute(attr.name, attr.value);
      if (
        current instanceof HTMLInputElement &&
        next instanceof HTMLInputElement
      )
        current.checked = next.checked;
      patchChildren(current, next);
    } else if (current.nodeValue !== next.nodeValue)
      current.nodeValue = next.nodeValue;
  });
  while (target.childNodes.length > incoming.length) target.lastChild!.remove();
}
export class SessionView {
  private root: HTMLElement | null = null;
  private model: SessionModel | null = null;
  private current: string | null = null;
  private teacher = false;
  private settings = false;
  private view: 'split' | 'student' | 'class' =
    window.innerWidth < 600 ? 'student' : 'split';
  private stageKey = '';
  private cardKeys = new Map<string, string>();
  private lifecycle = new AbortController();
  dispose(): void {
    this.lifecycle.abort();
  }
  constructor(defaults?: SessionDefaults) {
    if (defaults) {
      this.teacher = defaults.teacher;
      if (defaults.view !== 'auto') this.view = defaults.view;
    }
    window.addEventListener('resize', () => this.follow(), {
      signal: this.lifecycle.signal,
    });
    document.addEventListener(
      'fullscreenchange',
      () => this.fullscreenLabel(),
      { signal: this.lifecycle.signal },
    );
  }
  setView(view: string) {
    if (view === 'split' || view === 'student' || view === 'class')
      this.view = view;
    this.applyView();
    this.root?.querySelector<HTMLElement>('#viewMenu')?.hidePopover();
    this.root
      ?.querySelector<HTMLElement>('#viewTrigger')
      ?.focus({ preventScroll: true });
    this.follow();
  }
  toggleTeacher(value: boolean) {
    this.teacher = value;
    if (this.model) this.render(this.root!.parentElement!, this.model);
  }
  async fullscreen() {
    const menu = this.root?.querySelector<HTMLElement>('#viewMenu');
    if (menu?.matches(':popover-open')) {
      menu.hidePopover();
      this.root
        ?.querySelector<HTMLElement>('#viewTrigger')
        ?.focus({ preventScroll: true });
    }
    try {
      if (document.fullscreenElement) await document.exitFullscreen();
      else if (document.documentElement.requestFullscreen)
        await document.documentElement.requestFullscreen();
      else
        throw Error(
          'Full screen is unavailable. Use the Student or Class view.',
        );
    } catch {
      const el = this.root?.querySelector('#viewMessage');
      if (el)
        el.textContent =
          'Full screen is unavailable. Your selected view still works.';
    }
    this.fullscreenLabel();
  }
  private fullscreenLabel() {
    const b = this.root?.querySelector('[data-ui-click="session-fullscreen"]');
    if (b)
      b.textContent = document.fullscreenElement
        ? 'Exit full screen'
        : 'Full screen';
  }
  private applyView() {
    if (!this.root) return;
    this.root.dataset.view = this.view;
    this.root.dataset.teacher = String(this.teacher);
    const settings = this.root.querySelector<HTMLElement>('#behaviorSettings')!;
    this.settings = settings.matches(':popover-open');
    this.root.dataset.settings = String(this.settings);
    this.root
      .querySelectorAll<HTMLElement>('[data-view]')
      .forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.view === this.view)),
      );
    this.root
      .querySelector('[data-ui-click="session-settings"]')!
      .setAttribute('aria-expanded', String(this.settings));
    const viewMenu = this.root.querySelector<HTMLElement>('#viewMenu')!;
    this.root
      .querySelector('#viewTrigger')!
      .setAttribute('aria-expanded', String(viewMenu.matches(':popover-open')));
    this.placePractice();
    this.fullscreenLabel();
  }
  /** Reuse the live DOM across views so audio updates and holds retain identity. */
  private placePractice(home = false) {
    if (!this.root) return;
    const display = this.root.querySelector<HTMLElement>('.current-display')!;
    const card = this.root.querySelector<HTMLElement>(
      '.student.selected .card-practice',
    );
    const destination = !home && this.view === 'class' && card ? card : display;
    for (const selector of ['.session-target', '.tuner-section']) {
      const component = this.root.querySelector<HTMLElement>(selector)!;
      if (component.parentElement !== destination)
        destination.insertBefore(
          component,
          destination === display
            ? display.querySelector('.classroom-feedback')
            : null,
        );
    }
  }
  feedbackHost(id: string): HTMLElement | undefined {
    if (this.view !== 'class') return;
    return [
      ...(this.root?.querySelectorAll<HTMLElement>('.student') ?? []),
    ].find((card) => card.dataset.studentId === id);
  }
  follow() {
    const list = this.root?.querySelector<HTMLElement>('.roster-scroll');
    const card = list?.querySelector<HTMLElement>('.selected');
    if (!list || !card || !list.clientHeight) return;
    const a = card.getBoundingClientRect(),
      b = list.getBoundingClientRect();
    if (a.height > b.height) list.scrollTop += a.top - b.top - 6;
    else if (a.top < b.top) list.scrollTop -= b.top - a.top + 6;
    else if (a.bottom > b.bottom) list.scrollTop += a.bottom - b.bottom + 6;
  }
  render(host: HTMLElement, m: SessionModel) {
    this.model = m;
    if (!this.root || !host.contains(this.root)) {
      host.innerHTML = `<section id="sessionShell" class="session-shell focus" aria-label="Classroom session">

 <div class="session-toolbar" aria-label="Session controls">
 ${action('back-to-classes', '←', 'aria-label="Back to classes" title="Back to classes"')}
 <button id="viewTrigger" popovertarget="viewMenu" aria-expanded="false" aria-controls="viewMenu">View ▾</button>
 ${action('session-settings', 'Session options ▾', 'aria-label="Session options" aria-expanded="false" aria-controls="behaviorSettings" popovertarget="behaviorSettings"')}
 ${action('undo', '↶ Undo', 'id="sessionUndo" aria-label="Undo last change"')}
 <div class="session-meta"><strong id="sessionTitle"></strong><small id="roundLabel"></small></div>
 ${action('end-session', 'Finish session')}
 </div>
 <div id="viewMenu" class="behavior-settings view-menu" popover="auto" aria-label="View">
 <div class="session-settings-heading"><h2>View</h2><button popovertarget="viewMenu" popovertargetaction="hide" aria-label="Close view menu">×</button></div>
 <div class="view-picker" role="group" aria-label="Content view">${['split', 'student', 'class'].map((v) => action('session-view', v[0].toUpperCase() + v.slice(1), `data-view="${v}" aria-label="${v[0].toUpperCase() + v.slice(1)} view"`)).join('')}</div>
 ${action('session-fullscreen', 'Full screen')}
 <label><input type="checkbox" data-ui-change="teacher-details"> Teacher details</label>
 </div>
 <div id="behaviorSettings" class="behavior-settings" popover="auto"><div class="session-settings-heading"><h2>Session options</h2>${action('session-settings-close', '<svg aria-hidden="true" viewBox="0 0 24 24"><path d="m6 6 12 12M18 6 6 18" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>', 'type="button" aria-label="Close session options" popovertarget="behaviorSettings" popovertargetaction="hide"')}</div>${feedbackDurationControl(m.db.settings.feedbackDurationMs)}<label>Class<select id="sessionClass" data-ui-change="change-class"></select></label><label><input type="checkbox" data-ui-change="advance" aria-label="Auto Advance"> Auto Advance</label><label>Advance mode<select data-ui-change="classroom-mode"><option value="until-correct">Until correct</option><option value="one-and-done">One and done</option></select></label><label><input type="checkbox" data-ui-change="clap-navigation"> Clap navigation</label><div class="row">${action('toggle-mic', 'Enable microphone', 'id="micButton"')}${action('random-student', 'Random')}${action('active-student-notes', 'Notes', 'class="teacher-only"')}${action('session-notes', 'Session notes', 'class="teacher-only"')}</div><label>Microphone input<select id="microphoneInput" data-ui-change="microphone-input"><option value="">Browser default</option></select></label><p class="help">Two claps: next. Three claps: back. Clap navigation is optional. Round queues restart after reopening. Attempts stay saved.</p></div>
 <div class="session-workspace"><div class="session-stage"><p id="viewMessage" role="status"></p><p id="micError" role="status"></p>
 <div class="session-content"><section class="current-display" aria-label="Current student"><div class="student-heading student-actions" role="group" aria-label="Current and next students"><div class="student-navigation">${studentChevron('previous')}<div id="studentIdentity"></div>${studentChevron('next')}</div><div id="upNext" class="upcoming-student"></div></div><div class="session-target"><div class="target-readout" id="pressTarget"></div><div class="target-controls"><div class="target-actions">${action('pause-listening', `${microphoneStatusIcon}<span id="listeningLabel">Pause listening</span>`, 'id="pauseListening" class="primary target-listening" aria-label="Pause listening" data-microphone="on"')}${action('reference-tone', '<svg aria-hidden="true" viewBox="0 0 48 40"><path d="M4 14h9L25 4v32L13 26H4z" fill="currentColor"/><path d="M32 11q12 9 0 18m6-25q20 16 0 32" fill="none" stroke="currentColor" stroke-width="4" stroke-linecap="round"/></svg><span>Hear target</span>', 'class="primary target-playback" aria-label="Hear current target"')}</div><small id="classroomStatus" role="status"></small></div></div><div class="tuner-section"><div class="input-signal"><span id="inputStatus" role="img" aria-label="Microphone off" title="Microphone off" data-microphone="off">${microphoneStatusIcon.replace('</svg>', '<path class="microphone-paused-mark" d="M18 16v6m4-6v6"/></svg>')}</span><meter id="inputLevel" aria-label="Microphone level" min="0" max="0.25" value="0"></meter></div><div class="tuner"><div class="note" id="liveNote">—</div><div id="liveHz">Listening for a clear tone</div><div class="meter-labels" aria-hidden="true"><span>Low</span><span>High</span></div><div class="meter"><i class="needle" id="needle"></i></div><div id="liveCents" aria-label="Cents relative to target">—</div><div class="progress"><i id="holdProgress"></i></div></div><div class="scorebar">${['low', 'correct', 'high'].map((v, i) => action('record', ['Too low', 'In range', 'Too high'][i], `data-status="${v}" class="${v}"`)).join('')}</div></div><div class="classroom-feedback"><div id="lastResult"></div></div><div class="student-footer"><div id="roundActions"></div></div></section>
 <section class="roster-area" aria-label="Students dashboard"><div class="dashboard-header"><div class="row"><input id="search" aria-label="Search students" placeholder="Find a student" data-ui-input="search"><select aria-label="Filter roster" data-ui-change="filter-roster">${['all', 'not tested', 'needs practice', 'absent'].map((v) => `<option>${v}</option>`).join('')}</select>${action('show-current', 'Show current student')}</div></div><div class="roster-scroll" tabindex="0" aria-label="Class roster"><div id="activeOutsideFilter"></div><div class="cards" id="cards"></div></div></section></div></div></div></section>`;
      this.root = host.querySelector('#sessionShell')!;
      const stage = this.root.querySelector('.session-stage')!;
      stage.append(this.root.querySelector('.student-footer')!);
      this.root
        .querySelector('#viewMenu')!
        .addEventListener('toggle', () => this.applyView());
      const settings =
        this.root.querySelector<HTMLElement>('#behaviorSettings')!;
      settings.addEventListener('toggle', () => this.applyView());
      this.cardKeys.clear();
      this.stageKey = '';
      this.current = null;
    }
    const $ = <T extends HTMLElement = HTMLElement>(id: string) =>
      this.root!.querySelector<T>('#' + id)!;
    const text = (id: string, value: string) => {
      if ($(id).textContent !== value) $(id).textContent = value;
    };
    text('sessionTitle', m.s.name);
    text(
      'roundLabel',
      `${m.s.className} · ${m.round.kind === 'retry' ? 'Practice retry' : 'Whole class'} · ${roundSummary(m.s, m.round).attempted} / ${m.round.ids.filter((id) => !m.s.absent.includes(id)).length} played`,
    );
    text('classroomStatus', m.status === 'Microphone off' ? '' : m.status);
    text('lastResult', m.result);
    const feedbackDuration =
      this.root.querySelector<HTMLInputElement>('#feedbackDuration');
    if (feedbackDuration && document.activeElement !== feedbackDuration)
      feedbackDuration.value =
        m.db.settings.feedbackDurationMs == null
          ? ''
          : String(m.db.settings.feedbackDurationMs / 1000);
    text('micError', m.micError);
    const listeningLabel = !m.mic
      ? 'Start listening'
      : m.paused
        ? 'Resume listening'
        : 'Pause listening';
    text('listeningLabel', listeningLabel);
    $('pauseListening').setAttribute('aria-label', listeningLabel);
    $('pauseListening').dataset.microphone = m.mic && !m.paused ? 'on' : 'off';
    $('pauseListening').setAttribute(
      'aria-pressed',
      String(m.mic && !m.paused),
    );
    $('pauseListening').title = listeningLabel;
    ($('pauseListening') as HTMLButtonElement).disabled = false;
    $('pauseListening').setAttribute(
      'data-ui-click',
      m.mic ? 'pause-listening' : 'start-check',
    );
    ($('sessionUndo') as HTMLButtonElement).disabled = !m.undo;
    text('micButton', m.mic ? 'Stop microphone' : 'Enable microphone');
    const inputState = !m.mic ? 'off' : m.paused ? 'paused' : 'on';
    $('inputStatus').dataset.microphone = inputState;
    $('inputStatus').setAttribute('aria-label', `Microphone ${inputState}`);
    $('inputStatus').title = `Microphone ${inputState}`;
    const setCheck = (name: string, value: boolean) => {
      this.root!.querySelector<HTMLInputElement>(
        `[data-ui-change="${name}"]`,
      )!.checked = value;
    };
    setCheck('advance', m.db.settings.advance);
    setCheck('clap-navigation', m.claps);
    setCheck('teacher-details', this.teacher);
    this.root.querySelector<HTMLSelectElement>(
      '[data-ui-change="classroom-mode"]',
    )!.value = m.mode;
    $('search').setAttribute('value', m.search);
    ($('search') as HTMLInputElement).value = m.search;
    this.root.querySelector<HTMLSelectElement>(
      '[data-ui-change="filter-roster"]',
    )!.value = m.filter;
    const classHtml = m.db.classes
      .map((c) => `<option value="${esc(c.id)}">${esc(c.name)}</option>`)
      .join('');
    if ($('sessionClass').innerHTML !== classHtml)
      $('sessionClass').innerHTML = classHtml;
    ($('sessionClass') as HTMLSelectElement).value = m.db.classId;
    const deviceHtml =
      '<option value="">Browser default</option>' +
      m.devices
        .map(
          (d, i) =>
            `<option value="${esc(d.deviceId)}">${esc(d.label || 'Microphone ' + (i + 1))}</option>`,
        )
        .join('');
    if ($('microphoneInput').innerHTML !== deviceHtml)
      $('microphoneInput').innerHTML = deviceHtml;
    ($('microphoneInput') as HTMLSelectElement).value = m.deviceId;
    const p = m.s.roster.find((p) => p.id === m.db.activeStudent);
    const ids = m.round.ids.filter((id) => !m.s.absent.includes(id));
    const next = m.s.roster.find(
      (p) => p.id === ids[ids.indexOf(m.db.activeStudent ?? '') + 1],
    );
    const upcoming = next
      ? `<small>Up next</small><p>${esc(next.instrument)}</p><strong>${esc(next.name)}</strong>`
      : '<small>End of round</small>';
    if ($('upNext').innerHTML !== upcoming) $('upNext').innerHTML = upcoming;
    const identity = p
      ? `<p>${esc(p.instrument)}</p><h2>${esc(p.name)}</h2>`
      : '<h2>No present students</h2><p>Update attendance in the dashboard.</p>';
    if (identity !== this.stageKey) {
      $('studentIdentity').innerHTML = identity;
      this.stageKey = identity;
    }
    this.root
      .querySelectorAll<HTMLButtonElement>(
        '.tuner-section [data-ui-click="record"]',
      )
      .forEach((b) => (b.disabled = !p || m.s.absent.includes(p.id)));
    // Both canonical themes display the same tuned target as playback.
    const target = p && m.db.configs[p.instrument];
    const targetHtml = target
      ? `<div class="target-caption"><span class="target-caption-full">Concert pitch</span><span class="target-caption-compact">Target</span></div><div class="target-pitch">${esc(
          target.pitch
            .replace(/[0-8]$/, '')
            .replace(/b/g, '\u266d')
            .replace(/#/g, '\u266f'),
        )}<small>${esc(target.pitch.match(/[0-8]$/)?.[0] ?? '')}</small></div><div class="target-frequency">${targetFrequency(target, m.db.settings.a4).toFixed(1)} Hz</div>${target.offset ? `<small>${esc(targetLabel(target))}</small>` : ''}`
      : '<p>No target available</p>';
    if ($('pressTarget').innerHTML !== targetHtml)
      $('pressTarget').innerHTML = targetHtml;
    this.root.querySelector<HTMLButtonElement>('.target-playback')!.disabled =
      !target;
    const lastAttempt = m.s.attempts
      .filter((a) => a.studentId === p?.id && !m.round.baseline.includes(a.id))
      .at(-1);
    this.root.dataset.result = lastAttempt?.status ?? '';
    this.root
      .querySelectorAll<HTMLButtonElement>(
        '.student-heading [data-ui-click$="student"]',
      )
      .forEach((button) => {
        button.disabled = !ids.length;
      });
    const summary = roundSummary(m.s, m.round);
    const roundHtml = m.complete
      ? `<p>${summary.attempted} attempted · ${summary.correct} correct · ${summary.needsPractice} need practice · ${summary.unplayed} skipped / untested</p><div class="row">${action('retry-round', 'Retry students needing practice', retryIds(m.s).length ? '' : 'disabled')}${action('restart-round', 'Another round')}</div>${retryIds(m.s).length ? '' : '<small>No students currently need a retry.</small>'}`
      : '';
    if ($('roundActions').innerHTML !== roundHtml)
      $('roundActions').innerHTML = roundHtml;
    const shown = m.s.roster.filter((p) => {
      const last = m.s.attempts.filter((a) => a.studentId === p.id).at(-1);
      return (
        `${p.name} ${p.instrument}`
          .toLowerCase()
          .includes(m.search.toLowerCase()) &&
        (m.filter === 'all' ||
          (m.filter === 'absent' && m.s.absent.includes(p.id)) ||
          (m.filter === 'not tested' && !last && !m.s.absent.includes(p.id)) ||
          (m.filter === 'needs practice' && last && last.status !== 'correct'))
      );
    });
    this.placePractice(true);
    const list = $('cards');
    const outside = $('activeOutsideFilter');
    const keep = new Set(shown.map((p) => p.id));
    const outsideStudent = p && !keep.has(p.id) ? p : null;
    if (outsideStudent) shown.unshift(outsideStudent);
    const visibleIds = new Set(shown.map((student) => student.id));
    for (const child of [...list.children, ...outside.children])
      if (!visibleIds.has((child as HTMLElement).dataset.studentId ?? ''))
        child.remove();
    shown.forEach((p, index) => {
      const attempts = m.s.attempts.filter((a) => a.studentId === p.id),
        abs = m.s.absent.includes(p.id),
        active = p.id === m.db.activeStudent,
        last = attempts.at(-1),
        state = last
          ? { low: 'Too low', correct: 'In range', high: 'Too high' }[
              last.status
            ]
          : !abs && m.round.skipped.includes(p.id)
            ? 'Skipped this round'
            : '';
      const html = `${outsideStudent?.id === p.id ? '<small>Current student · outside this filter</small>' : ''}<div class="roster-detail"><small class="roster-instrument">${esc(p.instrument)}</small><span class="roster-rating">${state ? `${active && last ? '<small class="result-caption">Last</small>' : ''}<span class="${last ? `student-result ${last.status}` : 'badge'}">${state}</span>` : ''}</span></div><div class="row spread roster-identity"><div class="roster-name-navigation">${active ? studentChevron('previous', 'class-chevron') : ''}<button class="name" data-ui-click="select-student" data-id="${esc(p.id)}">${esc(p.name)}</button>${active ? studentChevron('next', 'class-chevron') : ''}</div><span class="turn-label">${active ? 'Current' : next?.id === p.id ? 'Up next' : ''}</span>${attendanceToggle(p.id, p.name, abs)}</div><div class="card-practice"></div><div class="teacher-only"><small>${attempts.length} tries</small><div class="scorebar">${['low', 'correct', 'high'].map((v, i) => action('record', ['Too low', 'In range', 'Too high'][i], `class="${v}" data-id="${esc(p.id)}" data-status="${v}" ${abs ? 'disabled' : ''}`)).join('')}</div>${action('student-notes', 'History', `data-id="${esc(p.id)}" aria-label="History for ${esc(p.name)}"`)}</div>`;
      const destination = outsideStudent?.id === p.id ? outside : list;
      let card = [...list.children, ...outside.children].find(
        (c) => (c as HTMLElement).dataset.studentId === p.id,
      ) as HTMLElement | undefined;
      if (!card) {
        card = document.createElement('article');
        card.dataset.studentId = p.id;
        card.dataset.uiClick = 'select-card';
        card.dataset.id = p.id;
        destination.append(card);
      }
      card.className = `student ${active ? 'selected' : ''} ${abs ? 'absent' : ''}`;
      card.setAttribute('aria-current', active ? 'true' : 'false');
      if (this.cardKeys.get(p.id) !== html || !card.childElementCount) {
        const template = document.createElement('template');
        template.innerHTML = html;
        patchChildren(card, template.content);
        this.cardKeys.set(p.id, html);
      }
      const position = index - (outsideStudent && destination === list ? 1 : 0);
      if (destination.children[position] !== card)
        destination.insertBefore(card, destination.children[position] ?? null);
    });
    if (!keep.size)
      list.innerHTML = '<p class="empty">No students match this view.</p>';
    this.applyView();
    const changed = this.current !== m.db.activeStudent;
    this.current = m.db.activeStudent;
    if (changed || !m.mic || m.paused) {
      this.root.dataset.range = '';
      text('liveNote', '—');
      text('liveHz', !m.mic || m.paused ? '' : 'Listening for a clear tone');
      text('liveCents', '—');
      $('holdProgress').style.width = '0%';
      $('needle').style.left = '50%';
    }
    if (!m.mic || m.paused) {
      ($('inputLevel') as HTMLMeterElement).value = 0;
    }
    if (changed) this.follow();
  }
}
