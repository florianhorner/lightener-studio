"""Contract test pinning the backend membership error codes to the shared fixture.

The membership transaction reports failures as error codes over the websocket;
the editor dialog turns those codes into user-facing copy. The two sides are
written in different languages, so nothing but a shared fixture keeps them
aligned. This is the same arrangement ``curve_presets.json`` already provides
for the shape definitions.

This test pins the *backend* set of codes. ``js/src/components/
light-membership-dialog.errors.test.ts`` pins the frontend's handling of the
same fixture. A new backend code that the editor has never heard of now fails
here instead of reaching a user as an unhelpful fallback message.

Scope, so the guarantee is not read wider than it is: this covers codes raised
as ``MembershipError`` in ``membership.py``. ``websocket.py`` also answers with
codes it passes straight to ``connection.send_error`` — ``unauthorized`` and
``invalid_format`` come from the ``@require_admin`` decorator and the command
schema, and are Home Assistant's own envelope rather than a domain rule. Those
are pinned by ``test_send_error_codes_outside_the_contract_are_known`` below so
a *new* one cannot appear unnoticed.
"""

import ast
import json
from pathlib import Path

from custom_components.lightener_studio import const, membership, websocket

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "membership_errors_v1.json"
FIXTURE = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
MEMBERSHIP_SOURCE = Path(membership.__file__)

_MODULE_CONSTANTS = {
    name: value
    for name, value in vars(const).items()
    if isinstance(value, str) and name.isupper()
}


def _literal_str(node: ast.AST) -> str | None:
    """Resolve a node to a string, following const.py names and f-strings.

    An f-string may open with a placeholder (an entity id), so only its literal
    parts are recoverable; that is enough for the message checks below.
    """
    if isinstance(node, ast.Constant) and isinstance(node.value, str):
        return node.value
    if isinstance(node, ast.Name):
        return _MODULE_CONSTANTS.get(node.id)
    if isinstance(node, ast.JoinedStr):
        return "".join(
            part.value
            for part in node.values
            if isinstance(part, ast.Constant) and isinstance(part.value, str)
        )
    return None


def _raise_sites() -> list[tuple[int, str, str | None]]:
    """Every ``MembershipError(...)`` construction as (line, code, message).

    Read statically rather than by exercising each failure path, so a code that
    is unreachable today still has to be declared in the contract. Every site is
    returned separately: collapsing by code would leave all but the last message
    for a repeated code unchecked.
    """
    tree = ast.parse(MEMBERSHIP_SOURCE.read_text(encoding="utf-8"))
    sites: list[tuple[int, str, str | None]] = []

    for node in ast.walk(tree):
        if (
            not isinstance(node, ast.Call)
            or not isinstance(node.func, ast.Name)
            or node.func.id != "MembershipError"
        ):
            continue

        keywords = {kw.arg: kw.value for kw in node.keywords if kw.arg}
        code_node = node.args[0] if node.args else keywords.get("code")
        if code_node is None:
            raise AssertionError(
                f"MembershipError at line {node.lineno} passes no code; the "
                "contract cannot verify it."
            )
        code = _literal_str(code_node)
        if code is None:
            raise AssertionError(
                f"MembershipError code at line {node.lineno} is not a literal "
                "or a known const; the contract cannot verify it."
            )

        message_node = node.args[1] if len(node.args) > 1 else keywords.get("message")
        message = _literal_str(message_node) if message_node is not None else None
        sites.append((node.lineno, code, message))

    return sites


def test_backend_membership_error_codes_match_the_contract() -> None:
    """Every raised code is declared, and every declared code is raised."""
    raised = {code for _line, code, _message in _raise_sites()}

    assert raised == set(FIXTURE["errors"])


def test_the_contract_describes_every_code_it_declares() -> None:
    """Each code says where its copy comes from and whether the editor sees it."""
    for code, entry in FIXTURE["errors"].items():
        assert entry["copy"] in {"dedicated", "backend", "preferred"}, code
        assert isinstance(entry["batch_command"], bool), code
        assert entry["meaning"].strip(), code


def test_disabled_entity_code_is_the_shared_constant() -> None:
    """The one code both stacks name explicitly stays in sync with const.py."""
    assert const.MEMBERSHIP_ERROR_DISABLED_ENTITY in FIXTURE["errors"]
    # The dialog prefers the backend message here because it names the entity,
    # and keeps its own string for when no message comes back.
    assert (
        FIXTURE["errors"][const.MEMBERSHIP_ERROR_DISABLED_ENTITY]["copy"] == "preferred"
    )


def test_too_many_is_declared_as_unreachable_from_the_editor() -> None:
    """The batch command's schema bound shadows the domain rule.

    ``test_too_many_is_handler_side_not_reachable_over_the_batch_command`` proves
    the behaviour and the README documents it; this keeps the shared contract
    from claiming the editor can receive the code.
    """
    assert FIXTURE["errors"]["too_many"]["batch_command"] is False
    assert membership.MAX_CONTROLLED_LIGHTS == 100


def test_every_raise_site_carries_a_user_facing_message() -> None:
    """Codes marked ``backend`` are rendered verbatim by the dialog, so every
    site that raises one has to supply copy rather than a log fragment."""
    for line, code, message in _raise_sites():
        entry = FIXTURE["errors"].get(code)
        if entry is None or entry["copy"] != "backend":
            continue
        assert message is not None, (
            f"MembershipError({code!r}) at line {line} has no recoverable message "
            "literal, so the contract cannot check what the dialog would show."
        )
        text = message.strip()
        assert len(text) > 10, f"line {line}: {code} message is too terse to show"
        assert not text.endswith(":"), f"line {line}: {code} reads like a log prefix"
        assert text.lower() != code.replace("_", " "), (
            f"line {line}: {code} message just restates the code"
        )


# Codes ``websocket.py`` hands to ``connection.send_error`` directly, without
# going through ``MembershipError``. They are not part of the membership
# fixture — two are Home Assistant's own envelope and three belong to other
# commands — but they DO reach the editor, so a new one appearing unreviewed
# is exactly the drift this contract exists to stop.
_KNOWN_DIRECT_SEND_ERROR_CODES = {
    # Membership/curve commands, already described in the README error table.
    # Guarded curve saves only; membership continues its existing contract.
    "precondition_required",
    "conflict",
    "not_found",
    "reload_failed",
    # Home Assistant's envelope: @require_admin and the command schema answer
    # before any handler code runs, so no domain rule can name these.
    "unauthorized",
    "invalid_format",
    # Other websocket commands, outside the batch membership contract.
    "already_exists",
    "last_light",
    "unknown_entities",
}

WEBSOCKET_SOURCE = Path(websocket.__file__)


def _direct_send_error_codes() -> dict[str, list[int]]:
    """Literal codes passed straight to ``connection.send_error``.

    Non-literal arguments (``err.code``, the legacy remap in ``ws_add_light``)
    are forwarding an already-classified error and are covered by the raise-site
    walk above, so they are skipped here rather than guessed at.
    """
    tree = ast.parse(WEBSOCKET_SOURCE.read_text(encoding="utf-8"))
    codes: dict[str, list[int]] = {}

    for node in ast.walk(tree):
        if (
            not isinstance(node, ast.Call)
            or not isinstance(node.func, ast.Attribute)
            or node.func.attr != "send_error"
            or len(node.args) < 2
        ):
            continue
        code = _literal_str(node.args[1])
        if code is not None:
            codes.setdefault(code, []).append(node.lineno)

    return codes


def test_send_error_codes_outside_the_contract_are_known() -> None:
    """No websocket command may invent a user-visible code unreviewed."""
    found = _direct_send_error_codes()

    unknown = {
        code: lines
        for code, lines in found.items()
        if code not in _KNOWN_DIRECT_SEND_ERROR_CODES
    }
    assert not unknown, (
        f"websocket.py sends error codes nobody declared: {unknown}. Either add "
        "the code to tests/fixtures/membership_errors_v1.json (and the dialog) "
        "if the editor must act on it, or to _KNOWN_DIRECT_SEND_ERROR_CODES "
        "with a comment saying which command owns it."
    )

    stale = _KNOWN_DIRECT_SEND_ERROR_CODES - set(found)
    assert not stale, (
        f"declared codes no longer sent by websocket.py: {sorted(stale)}. Drop "
        "them so the list keeps describing the real surface."
    )


def test_the_legacy_add_light_remap_only_targets_declared_codes() -> None:
    """``ws_add_light`` rewrites some codes for cached older bundles.

    The remap targets have to exist in the contract too, otherwise an old card
    receives a code the dialog cannot render.
    """
    for code in ("invalid_format", "reload_failed"):
        assert code in _KNOWN_DIRECT_SEND_ERROR_CODES or code in FIXTURE["errors"], code
    # The sources of the remap are real membership codes.
    for code in (
        "not_a_light",
        "self_reference",
        "recursive_lightener",
        "rollback_reload_failed",
    ):
        assert code in FIXTURE["errors"], code
