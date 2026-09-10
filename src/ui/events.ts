export interface UiActionContext {
  element: HTMLElement;
  event: Event;
  data: DOMStringMap;
  value: string;
  checked: boolean;
}

type UiEvent = 'click' | 'change' | 'input' | 'submit';
type UiAction = (context: UiActionContext) => void | Promise<void>;
export type UiBindings = Partial<
  Record<UiEvent, Readonly<Record<string, UiAction>>>
>;

/** Named actions only: attribute values are never evaluated as JavaScript. */
export function bindUiEvents(root: Document, bindings: UiBindings): () => void {
  const controller = new AbortController();
  const events: UiEvent[] = ['click', 'change', 'input', 'submit'];
  for (const type of events) {
    root.addEventListener(
      type,
      (event) => {
        if (!(event.target instanceof Element)) return;
        const element = event.target.closest<HTMLElement>(`[data-ui-${type}]`);
        if (!element || element.matches(':disabled')) return;
        const name = element.getAttribute(`data-ui-${type}`)!;
        const actions = bindings[type];
        if (!actions || !Object.hasOwn(actions, name)) return;
        if (type === 'submit') event.preventDefault();
        const isInput = element instanceof HTMLInputElement;
        void actions[name]({
          element,
          event,
          data: element.dataset,
          value:
            isInput ||
            element instanceof HTMLSelectElement ||
            element instanceof HTMLTextAreaElement
              ? element.value
              : '',
          checked: isInput && element.checked,
        });
      },
      { signal: controller.signal },
    );
  }
  return () => controller.abort();
}
