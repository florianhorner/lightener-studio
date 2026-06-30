/**
 * Centralized user-facing copy for the Lightener card.
 *
 * Why this file exists: it is the single lintable home for the card's display
 * text, so "Lead with the light" (see the Voice and vocabulary section of
 * DESIGN.md) can be enforced mechanically. `scripts/lint-vocabulary` scans this
 * file against the project banned-term list, so cold or generic wording cannot
 * quietly re-enter the UI. Card copy is migrated here over time (scrubber,
 * footer, presets, legend, and the graph y-axis so far); add new or changed
 * card text here and import it rather than hardcoding it in a component. Copy
 * still inline elsewhere is not yet guarded — see DESIGN.md "Where copy lives".
 *
 * Scope note: config-flow copy lives in the Home Assistant translation files
 * (`custom_components/lightener_studio/translations/*.json`) and is out of this file's
 * scope by design — that text is keyed and localized through HA.
 */
export const UI = {
  scrubber: {
    /** Heading over the brightness slider. */
    title: 'Try brightness',
    /** Accessible name for the slider track. */
    sliderAria: 'Try group brightness',
    /** Toggle that makes the real room follow the slider live. */
    watchButton: 'Watch room react',
    /** Lead text shown while the room is following the slider. */
    watchingPrefix: 'Watching',
    /** Affordance that returns the room to its real state. */
    watchingRestore: 'Put it back',
    /** Status shown while watching with unsaved changes. */
    heldStatus: 'Your room is showing this now',
    /** Trailing call to action on the watching status. */
    heldStatusSave: 'Save to keep it',
  },
  footer: {
    save: 'Save',
    saving: 'Saving…',
    /** Save label while the room is being shown live. */
    savePreview: 'Save this room',
  },
  presets: {
    panelAria: 'Shapes for selected light',
    title: 'Shapes',
    emptyTitle: 'Select a light to shape it.',
    emptyBody: 'Shapes apply to one light at a time.',
    forLight: (name: string) => `Shapes for ${name}`,
    explanation:
      'Shapes are starting points for this light. Pick one to set how it rises as the group gets brighter, then fine-tune it on the graph.',
    trying: (name: string) => `Trying ${name}`,
    chooseForLight: (name: string) =>
      `Choose it to shape ${name}. Nothing changes in the room or saved shape yet.`,
  },
  legend: {
    title: 'Lights',
    emptyCount: 'No lights yet',
    countAllVisible: (count: number) => `${count} ${count === 1 ? 'light' : 'lights'} showing`,
    countWithHidden: (count: number, hidden: number) =>
      `${count} ${count === 1 ? 'light' : 'lights'} · ${hidden} hidden`,
    listAria: (count: number) =>
      count === 0
        ? 'No lights in this group'
        : `${count} ${count === 1 ? 'light' : 'lights'} in this group`,
  },
  graph: {
    /** Visible y-axis label on the curve graph. */
    yAxisLabel: 'Per-light brightness',
  },
  card: {
    /** Accessible name for the side rail holding the lights and their shapes. */
    railAria: 'Room lights and shapes',
    /** Status shown while the room's brightness shapes load. */
    loading: 'Loading brightness shapes…',
  },
} as const;
