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
    title: 'Room brightness',
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
    emptyTitle: 'Pick a light to shape it.',
    emptyBody: 'Shapes apply to one light at a time.',
    forLight: (name: string) => `Shapes for ${name}`,
    explanation: 'Pick a starting shape, then fine-tune it on the graph.',
    trying: (name: string) => `Trying ${name}`,
    chooseForLight: (name: string) => `Choose it to shape ${name}.`,
    /**
     * Names and descriptions for the starting shapes. The shape data lives in
     * presets.ts; the words live here so the vocabulary guard covers them.
     */
    defs: {
      linear: { name: 'Equal brightness', description: 'Matches the group brightness.' },
      dim_accent: { name: 'Dim accent', description: 'Rises gently, capped near 45%.' },
      late_starter: {
        name: 'Late starter',
        description: 'Stays dim until 45%, then brightens fast.',
      },
      night_mode: {
        name: 'Night mode',
        description: 'Caps near 25%, even at full group brightness.',
      },
    },
    chipLabels: {
      linear: 'Equal',
      dim_accent: 'Dim',
      late_starter: 'Late',
      night_mode: 'Night',
    },
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
  membership: {
    /** Dialog heading (and the legend button that opens it). */
    title: 'Edit lights',
    /** Sub-heading reassuring that per-light shapes are preserved. */
    subtitle: 'Add or remove lights together. Existing shapes stay exactly as they are.',
    /** Accessible name for the dialog close button. */
    close: 'Close',
    /** Label and placeholder for the light search box. */
    search: 'Search lights',
    /** Accessible name for the area filter. */
    areaFilter: 'Filter by area',
    /** Area-filter option covering every area. */
    allAreas: 'All areas',
    /** Status shown while the candidate lights load. */
    loading: 'Loading lights…',
    /** Shown when the search/area filter matches nothing. */
    empty: 'No lights match this filter.',
    /** Suffix marking a retained light that no longer exists. */
    unavailable: 'Unavailable',
    /** Running count of selected lights. */
    selectedCount: (count: number) => `${count} selected`,
    /** Dismiss without saving. */
    cancel: 'Cancel',
    /** Primary action label, idle and in-flight. */
    apply: 'Update lights',
    applying: 'Updating…',
    /** Error copy. */
    loadError: 'Could not load lights.',
    applyError: 'Could not update lights.',
    emptyError: 'Select at least one light.',
    conflictError: 'This group changed. Close and reopen Edit lights.',
    rollbackError:
      'The update failed and the group runtime may need attention. Open Integrations to retry.',
  },
} as const;
