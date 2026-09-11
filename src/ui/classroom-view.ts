import type { Session, TrackerData } from '../domain/tracker';
import type { Round } from '../domain/round';
import { roundState, roundSummary, retryIds } from '../domain/round';
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
  constructor() {
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
    this.follow();
  }
  toggleTeacher(value: boolean) {
    this.teacher = value;
    if (this.model) this.render(this.root!.parentElement!, this.model);
  }
  toggleSettings() {
    this.settings = !this.settings;
    this.applyView();
  }
  async fullscreen() {
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
    this.root.dataset.settings = String(this.settings);
    this.root
      .querySelectorAll<HTMLElement>('[data-view]')
      .forEach((b) =>
        b.setAttribute('aria-pressed', String(b.dataset.view === this.view)),
      );
    const settings = this.root.querySelector<HTMLElement>('#behaviorSettings')!;
    settings.hidden = !this.settings;
    this.root
      .querySelector('[data-ui-click="session-settings"]')!
      .setAttribute('aria-expanded', String(this.settings));
    this.fullscreenLabel();
  }
  follow() {
    const list = this.root?.querySelector<HTMLElement>('#cards');
    const card = list?.querySelector<HTMLElement>('.selected');
    if (!list || !card || !list.clientHeight) return;
    const a = card.getBoundingClientRect(),
      b = list.getBoundingClientRect();
    if (a.top < b.top) list.scrollTop -= b.top - a.top + 6;
    else if (a.bottom > b.bottom) list.scrollTop += a.bottom - b.bottom + 6;
  }
  render(host: HTMLElement, m: SessionModel) {
    this.model = m;
    if (!this.root || !host.contains(this.root)) {
      host.innerHTML = `<section id="sessionShell" class="session-shell focus" aria-label="Classroom session">
 <div class="session-top"><div><strong id="sessionTitle"></strong><small id="roundLabel"></small></div><div class="row view-picker" role="group" aria-label="Content view">${['split', 'student', 'class'].map((v) => action('session-view', v[0].toUpperCase() + v.slice(1), `data-view="${v}" aria-label="${v[0].toUpperCase() + v.slice(1)} view"`)).join('')}${action('session-fullscreen', 'Full screen')}</div></div>
 <div class="session-bar" aria-label="Session controls">${action('pause-listening', 'Pause listening', 'id="pauseListening" class="primary"')}${action('previous-student', 'Previous student')}${action('next-student', 'Next student')}${action('undo', 'Undo last change', 'id="sessionUndo"')}${action('session-settings', 'Session behavior settings', 'aria-expanded="false" aria-controls="behaviorSettings"')}${action('end-session', 'Finish session')}</div>
 <div id="behaviorSettings" class="behavior-settings" hidden><label>Class<select id="sessionClass" data-ui-change="change-class"></select></label><label><input type="checkbox" data-ui-change="advance" aria-label="Auto Advance"> Auto Advance</label><label>Advance mode<select data-ui-change="classroom-mode"><option value="until-correct">Until correct</option><option value="one-and-done">One and done</option></select></label><label><input type="checkbox" data-ui-change="clap-navigation"> Clap navigation</label><label><input type="checkbox" data-ui-change="teacher-details"> Teacher details</label><div class="row">${action('toggle-mic', 'Enable microphone', 'id="micButton"')}${action('reference-tone', 'Hear target')}${action('random-student', 'Random')}${action('active-student-notes', 'Notes', 'class="teacher-only"')}${action('session-notes', 'Session notes', 'class="teacher-only"')}</div><label>Microphone input<select id="microphoneInput" data-ui-change="microphone-input"><option value="">Browser default</option></select></label><p class="help">Two claps: next. Three claps: back. Clap navigation is optional. Round queues restart after reopening. Attempts stay saved.</p></div>
 <p id="viewMessage" role="status"></p><p id="micError" role="status"></p>
 <div class="session-content"><section class="current-display" aria-label="Current student"><div id="studentIdentity"></div><div class="classroom-feedback"><strong id="classroomStatus" role="status"></strong><div id="lastResult" role="status"></div><small id="upNext"></small></div><div class="tuner"><div class="note" id="liveNote">—</div><div id="liveHz">Listening for a clear tone</div><div class="meter"><i class="needle" id="needle"></i></div><div id="liveCents">Cents relative to target</div><div class="progress"><i id="holdProgress"></i></div><small id="checkHint">Hold a steady tone after a quiet gap.</small></div><div class="input-signal"><label for="inputLevel">Microphone level</label><meter id="inputLevel" min="0" max="0.25" value="0"></meter><small id="inputHint">No signal</small></div><div class="scorebar">${['low', 'correct', 'high'].map((v, i) => action('record', ['Too low', 'In range', 'Too high'][i], `data-status="${v}" class="${v}"`)).join('')}</div><div id="roundActions"></div></section>
 <section class="roster-area" aria-label="Students dashboard"><div class="dashboard-header"><h3>Students dashboard</h3><div class="row"><input id="search" aria-label="Search students" placeholder="Find a student" data-ui-input="search"><select aria-label="Filter roster" data-ui-change="filter-roster">${['all', 'not tested', 'needs practice', 'absent'].map((v) => `<option>${v}</option>`).join('')}</select>${action('show-current', 'Show current student')}</div><div id="activeOutsideFilter"></div></div><div class="cards" id="cards" tabindex="0" aria-label="Class roster"></div></section></div></section>`;
      this.root = host.querySelector('#sessionShell')!;
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
    text('classroomStatus', m.status);
    text('lastResult', m.result);
    text('micError', m.micError);
    $('pauseListening').textContent = !m.mic
      ? 'Start listening'
      : m.paused
        ? 'Resume listening'
        : 'Pause listening';
    ($('pauseListening') as HTMLButtonElement).disabled = false;
    $('pauseListening').setAttribute(
      'data-ui-click',
      m.mic ? 'pause-listening' : 'start-check',
    );
    ($('sessionUndo') as HTMLButtonElement).disabled = !m.undo;
    text('micButton', m.mic ? 'Stop microphone' : 'Enable microphone');
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
    text('upNext', next ? 'Up next: ' + next.name : 'End of round');
    const identity = p
      ? `<h2>${esc(p.name)}</h2><p>${esc(p.instrument)} · Target <strong>${esc(m.db.configs[p.instrument]?.pitch)}</strong></p>`
      : '<h2>No present students</h2><p>Update attendance in the dashboard.</p>';
    if (identity !== this.stageKey) {
      $('studentIdentity').innerHTML = identity;
      this.stageKey = identity;
    }
    this.root
      .querySelectorAll<HTMLButtonElement>(
        '.current-display [data-ui-click="record"]',
      )
      .forEach((b) => (b.disabled = !p || m.s.absent.includes(p.id)));
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
    const list = $('cards');
    const keep = new Set(shown.map((p) => p.id));
    for (const child of [...list.children])
      if (!keep.has((child as HTMLElement).dataset.studentId ?? ''))
        child.remove();
    shown.forEach((p, index) => {
      const attempts = m.s.attempts.filter((a) => a.studentId === p.id),
        abs = m.s.absent.includes(p.id),
        active = p.id === m.db.activeStudent,
        state = roundState(m.s, m.round, p.id);
      const html = `<div class="row spread"><button class="name" data-ui-click="select-student" data-id="${esc(p.id)}">${esc(p.name)}</button><span>${active ? 'Current' : next?.id === p.id ? 'Up next' : ''}</span></div><small>${esc(p.instrument)}</small><div class="badge">${state}</div><div class="teacher-only"><small>${attempts.length} tries</small><div class="scorebar">${['low', 'correct', 'high'].map((v, i) => action('record', ['Too low', 'In range', 'Too high'][i], `class="${v}" data-id="${esc(p.id)}" data-status="${v}" ${abs ? 'disabled' : ''}`)).join('')}</div>${action('student-notes', 'History', `data-id="${esc(p.id)}" aria-label="History for ${esc(p.name)}"`)}</div><label><input type="checkbox" data-ui-change="attendance" data-id="${esc(p.id)}" ${abs ? 'checked' : ''}> Absent</label>`;
      let card = [...list.children].find(
        (c) => (c as HTMLElement).dataset.studentId === p.id,
      ) as HTMLElement | undefined;
      if (!card) {
        card = document.createElement('article');
        card.dataset.studentId = p.id;
        list.append(card);
      }
      card.className = `student ${active ? 'selected' : ''} ${abs ? 'absent' : ''}`;
      card.setAttribute('aria-current', active ? 'true' : 'false');
      if (this.cardKeys.get(p.id) !== html || !card.childElementCount) {
        const template = document.createElement('template');
        template.innerHTML = html;
        patchChildren(card, template.content);
        this.cardKeys.set(p.id, html);
      }
      if (list.children[index] !== card)
        list.insertBefore(card, list.children[index] ?? null);
    });
    if (!shown.length)
      list.innerHTML = '<p class="empty">No students match this view.</p>';
    text(
      'activeOutsideFilter',
      p && !keep.has(p.id)
        ? 'Current student: ' + p.name + ' (outside this filter)'
        : '',
    );
    this.applyView();
    const changed = this.current !== m.db.activeStudent;
    this.current = m.db.activeStudent;
    if (changed || !m.mic || m.paused) {
      text('liveNote', '—');
      text(
        'liveHz',
        !m.mic
          ? 'Microphone off'
          : m.paused
            ? 'Paused'
            : 'Listening for a clear tone',
      );
      text('liveCents', 'Cents relative to target');
      $('holdProgress').style.width = '0%';
      $('needle').style.left = '50%';
    }
    if (!m.mic || m.paused) {
      ($('inputLevel') as HTMLMeterElement).value = 0;
      text('inputHint', m.paused ? 'Paused' : 'No signal');
    }
    if (changed) this.follow();
  }
}
