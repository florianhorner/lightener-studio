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
  drafts: {
    savedChanged: 'Saved state changed. Review again before continuing.',
    changedLights: 'changed lights',
    changedLight: 'changed light',
    unverified: 'Check the latest saved shapes before continuing. Your local draft is unchanged.',
    unavailable:
      'Navigation recovery is unavailable until your signed-in identity and saved group are ready. Keep this editor open to preserve your draft.',
    notRetained:
      'Latest edits could not be retained for navigation. Keep this editor open; an older checkpoint may remain.',
    changed: 'That draft changed or was opened elsewhere. Choose from the current drafts.',
    openedElsewhere:
      'This draft was opened elsewhere. This local copy cannot change lights or saved shapes.',
    reviewLocal: 'Review local copy',
    unavailableSaved:
      'The latest saved group is unavailable for recovery. The retained draft is unchanged.',
    inconsistent: 'This checkpoint does not match its saved baseline and cannot be recovered.',
    available: 'Unsaved draft available:',
    older: 'Older checkpoint only; latest edits were not retained:',
    recover: 'Recover draft',
    discard: 'Discard draft',
    unknown: 'An earlier save has an unresolved outcome. Review saved shapes before saving.',
  },
  saveReview: {
    title: 'Review latest saved shapes',
    body: 'Your draft stays unchanged until you choose. Continuing starts fresh Undo: Undo returns to the latest saved shapes. This review does not save or change any lights.',
    keep: 'Keep my shape',
    saved: 'Use saved shape',
    removed: 'Removed from this group. Its local edit cannot be reapplied.',
    alreadySaved: 'Your shape is already saved.',
    unchanged: 'Your shape can be kept; the saved shape has not changed.',
    acknowledgeRemoved: 'I understand edits to removed lights will be dropped.',
    back: 'Back to draft',
    useSaved: 'Use saved shapes',
    continue: 'Continue editing',
  },
  guardedSave: {
    conflict: 'Saved shapes changed. Review the latest saved shapes.',
    refresh: 'Refresh this editor before saving. Your draft stays here until you leave.',
    notFound: 'This group was removed. Your draft is still here.',
    rolledBack: 'The save was rolled back. Check saved state before trying again.',
    runtime: 'Saved shapes and lights may disagree. Recovery is required before editing further.',
    unauthorized: 'You do not have permission to save these shapes.',
    unknownEntities: 'A light is no longer in this group. Review the latest saved shapes.',
    invalid: 'Save failed. Check the shape points before trying again.',
    uncertain: 'Save outcome unknown. Check saved state before trying again.',
    readFailed: 'Could not check saved shapes. Your draft is unchanged.',
    incompatibleRead: 'The backend cannot provide a guarded saved state.',
    present: 'Your edits are now present in the saved shapes.',
    readOnly: 'Read-only: an administrator can save shapes for this group.',
    incompatible: 'Update the backend and refresh before saving. Your draft stays here.',
    checking: 'Checking saved shapes…',
    review: 'Review latest',
    check: 'Check saved state',
    invalidResponse: 'Invalid saved shapes response',
  },
  invitation: {
    example: 'Example shape',
    dragPoint: 'Drag this point',
    dismiss: 'Dismiss example',
    replay: 'Replay example shape',
    together: 'Try the lights together',
    touchAdd: 'Double-tap the shape to add a point',
    mouseAdd: 'Double-click the shape to add a point',
    keyboardAdd: 'Press Enter on a point to add another',
    description:
      'Example shape. Changing a point keeps this shape as an unsaved edit. Undo restores your previous shape.',
    values: 'Example brightness values',
    forLight: (name: string) => `Example shape for ${name}`,
  },
  /** Show me how in the sidebar editor: an example on the editable graph. */
  canvasHelp: {
    brightenLight: 'Make this light brighter',
    dimLight: 'Dim this light',
    adjustRoom: 'Adjust room brightness',
    addPoint: 'Add a point',
    removePoint: 'Remove this point',
    open: 'Show me how',
    choose: (name: string) => `1/4 · Start with ${name}`,
    steps: {
      point: '2/4 · Move one point up and down',
      room: '3/4 · Sweep Room brightness',
      complete: 'Your shapes are back. Replay or try it yourself.',
    },
    paused: 'Paused. Edit a point, Replay or Done.',
    mouseAdd: '4/4 · Double-click to add a point',
    mouseRemove: 'Right-click the point to remove it',
    touchAdd: '4/4 · Double-tap to add a point',
    touchRemove: 'Hold the point to remove it',
    keyboardPoint: '2/4 · Arrow keys move a point',
    keyboardAdd: '4/4 · Enter adds a point beside the focused point',
    keyboardRemove: 'Delete removes the focused point',
    replay: 'Replay',
    done: 'Done',
    /** Why the example did not start; nothing was changed. */
    draft:
      'Save or cancel your draft before starting the canvas example. Your edits are unchanged.',
    watching: 'Turn off Watch room react before starting the canvas example.',
    busy: 'The editor is busy. Try the canvas example when it is ready.',
  },
  scrubber: {
    /** Heading over the brightness slider. */
    title: 'Room brightness',
    /** Accessible name for the slider track. */
    sliderAria: 'Room brightness',
    /** Room value at zero; the position itself stays numeric. */
    off: 'Off',
    /** Toggle that makes the real room follow the slider live. */
    watchButton: 'Watch room react',
    watchGuidance:
      'Watch changes your lights. Turning it off puts them back, which can overwrite changes made elsewhere meanwhile. A lost connection leaves them as they are.',
    /** One-time note after Watch first turns on; it never moves the layout. */
    watchHintBody:
      'Shape a light and watch it react. Save, Cancel or turning Watch off tries to put your lights back.',
    watchHintDismiss: 'Got it',
    /** The watching status once the editor has unsaved changes. */
    watchingHeldStatus: 'Watching unsaved changes · Save keeps the shapes.',
    /** What the room shows at the Room position, under the graph. */
    meaningAll: (count: number) => (count === 1 ? '1 light on' : `All ${count} lights on`),
    meaningSome: (on: number, count: number) => `${on} of ${count} lights on`,
    meaningNone: (count: number) => (count === 1 ? 'Light off' : 'All lights off'),
    meaningFollowing: 'Your room follows',
  },
  restoration: {
    otherWatching: 'Another editor is watching these lights. Turn Watch off there first.',
    operationBlocked: 'Another light or group change in this page is still running.',
    membershipBlocked: 'Watch is still on or putting lights back. Try again in a moment.',
    overlap: 'Another editor is watching some of these lights. Turn Watch off there first.',
  },
  footer: {
    undo: 'Undo',
    cancel: 'Cancel',
    save: 'Save',
    saving: 'Saving…',
    saved: 'Saved',
    failed: 'Save failed',
    retry: 'Retry',
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
      dim_accent: { name: 'Dim accent', description: 'Holds near 30% from halfway.' },
      early_starter: {
        name: 'Early starter',
        description: 'Brightens early, then eases towards full brightness.',
      },
      late_starter: {
        name: 'Late starter',
        description: 'Stays off through 40%, then rises progressively.',
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
    brightnessAria: (name: string) => `${name} brightness`,
    brightnessAt: (value: string, position: number) => `${value} at ${position}% room brightness`,
    roomOff: 'Raise room brightness to adjust this light.',
    off: 'Off',
    title: 'Lights',
    emptyCount: 'No lights yet',
    listAria: (count: number) =>
      count === 0
        ? 'No lights in this group'
        : `${count} ${count === 1 ? 'light' : 'lights'} in this group`,
    /** ⋮ menu item; opens the confirmation above the list. */
    deleteGroup: 'Delete group…',
    deleteError: 'Could not delete group.',
    deleteWrongGroup: 'This light is not a Lightener Studio group.',
    deleteMissingEntry: 'This group cannot be deleted here.',
    deleteConfirm: 'Delete this group?',
    deleteCancel: 'Cancel',
    deleteAction: 'Delete group',
    updating: 'Updating lights…',
    /** Edit's first list row: pressed while nothing is selected; clears the selection otherwise. */
    allLights: 'All lights',
    allLightsClearAria: 'Show all lights',
  },
  /** The editor header: the exit slot and the ⋮ menu. */
  toolbar: {
    edit: 'Edit',
    done: 'Done',
    more: 'More actions',
    editLights: 'Edit lights…',
    newGroup: 'New group…',
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
    /** Dialog heading; the ⋮ menu's Edit lights… opens it. */
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
