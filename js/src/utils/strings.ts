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
    watchingRestore: 'Restore lights',
    /** Status shown while watching with unsaved changes. */
    heldStatus: 'Trying unsaved changes',
    /** Trailing call to action on the watching status. */
    heldStatusSave: 'Save keeps the shapes and restores the lights.',
  },
  footer: {
    save: 'Save',
    saving: 'Saving…',
  },
  coach: {
    help: 'Brightness tips',
    dismiss: 'Dismiss tip',
    chooseTitle: 'Dim a bright light',
    chooseBody: 'Select the light, then choose Dim.',
    readyTitle: 'Ready to save',
    readyBody: 'Save now, or try “Watch room react” first.',
    savedTitle: 'Shape saved',
    savedBody: 'Adjust group brightness in Home Assistant.',
  },
  presets: {
    panelAria: 'Shapes for selected light',
    title: 'Shapes',
    emptyTitle: 'Select a light.',
    emptyBody: 'Shapes apply to one light at a time.',
    forLight: (name: string) => `Shapes for ${name}`,
    explanation: 'Choose a shape, then adjust it on the graph.',
    trying: (name: string) => `Trying ${name}`,
    chooseForLight: (name: string) => `Choose it to shape ${name}.`,
    /**
     * Names and descriptions for the starting shapes. The shape data lives in
     * presets.ts; the words live here so the vocabulary guard covers them.
     */
    defs: {
      linear: { name: 'Equal brightness', description: 'Matches the group brightness.' },
      dim_accent: { name: 'Dim accent', description: 'Rises gently, capped near 45%.' },
      early_starter: {
        name: 'Early starter',
        description: 'Brightens early, then eases towards full brightness.',
      },
      late_starter: {
        name: 'Late starter',
        description: 'Stays off through 60%, then rises gradually.',
      },
    },
    chipLabels: {
      linear: 'Equal',
      dim_accent: 'Dim',
      early_starter: 'Early',
      late_starter: 'Late',
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
    /** Sub-heading explaining the batch membership edit. */
    subtitle: 'Choose which lights this group controls. Existing shapes stay exactly as they are.',
    /** Accessible name for the dialog close button. */
    close: 'Close',
    /** Visible label and placeholder for the light search box. */
    search: 'Search lights',
    searchPlaceholder: 'Search name or ID…',
    /** Visible label for the area filter. */
    areaFilter: 'Area',
    /** Area-filter option covering every area. */
    allAreas: 'All areas',
    /** Temporary, dialog-local scope filters. */
    currentGroupOnly: (count: number) => `Current group only (${count})`,
    showExceptional: (count: number) => `Show hidden & disabled (${count})`,
    candidateList: 'Lights available to this group',
    /** Status shown while the candidate lights load. */
    loading: 'Loading lights…',
    /** Mutually exclusive empty-state copy and recovery actions. */
    sourceEmpty: 'No lights are available to add.',
    filterEmpty: 'No lights match these filters.',
    clearFilters: 'Clear search and area',
    scopeEmpty: 'No lights in this view.',
    showAllLights: 'Show all lights',
    exceptionalEmpty: (count: number) =>
      `${count} hidden or disabled ${count === 1 ? 'light' : 'lights'}.`,
    showExceptionalAction: 'Show hidden & disabled',
    /** Candidate status labels, rendered in this order. */
    hidden: 'Hidden',
    disabled: 'Disabled',
    missing: 'Missing',
    unavailable: 'Unavailable',
    lightCheckboxLabel: (name: string, statuses: readonly string[]) =>
      statuses.length === 0 ? name : `${name}, ${statuses.join(', ')}`,
    /** Result summary for the filtered view and immutable pending selection. */
    resultSummary: (shown: number, visibleSelected: number, totalSelected: number) => {
      const shownCopy = `${shown} ${shown === 1 ? 'light' : 'lights'} shown`;
      return visibleSelected === totalSelected
        ? `${shownCopy} · ${totalSelected} selected`
        : `${shownCopy} · ${visibleSelected} of ${totalSelected} selected shown`;
    },
    /** Running count of selected lights. */
    selectedCount: (count: number) => `${count} selected`,
    /** Dismiss without saving. */
    cancel: 'Cancel',
    /** Primary action label, idle and in-flight. */
    apply: 'Update lights',
    applying: 'Updating…',
    applyingStatus: 'Updating group lights.',
    updated: 'Lights updated.',
    tryAgain: 'Try again',
    /** Error copy. */
    loadError: 'Could not load lights.',
    applyError: 'Could not update lights.',
    emptyError: 'Select at least one light.',
    conflictError: 'This group changed. Close and reopen Edit lights.',
    disabledError:
      'A selected light is disabled in Home Assistant. Enable the light in Home Assistant settings, then try again.',
    reloadError: 'The group could not be reloaded. Your previous selection was restored.',
    rollbackError:
      'The update failed and the group runtime may need attention. Open Integrations to retry.',
  },
} as const;
