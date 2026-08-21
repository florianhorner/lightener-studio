"""Contract test pinning the backend membership error codes to the shared fixture.

The membership transaction reports failures as error codes over the websocket;
the editor dialog turns those codes into user-facing copy. The two sides are
written in different languages, so nothing but a shared fixture keeps them
aligned — this is the same arrangement ``curve_presets.json`` already provides
for the shape definitions.

This test pins the *backend* set of codes. ``js/src/components/
light-membership-dialog.errors.test.ts`` pins the frontend's handling of the
same fixture. A new backend code that the editor has never heard of now fails
here instead of reaching a user as an unhelpful fallback message.
"""

import ast
import json
from pathlib import Path

from custom_components.lightener_studio import const, membership

REPO_ROOT = Path(__file__).resolve().parents[3]
FIXTURE_PATH = REPO_ROOT / "tests" / "fixtures" / "membership_errors_v1.json"
FIXTURE = json.loads(FIXTURE_PATH.read_text(encoding="utf-8"))
MEMBERSHIP_SOURCE = Path(membership.__file__)


def _raised_error_codes() -> set[str]:
    """Every code literal passed to ``MembershipError`` in membership.py.

    Read statically rather than by exercising each failure path, so a code that
    is unreachable today still has to be declared in the contract.
    """
    tree = ast.parse(MEMBERSHIP_SOURCE.read_text(encoding="utf-8"))
    module_constants = {
        name: value
        for name, value in vars(const).items()
        if isinstance(value, str) and name.isupper()
    }

    codes: set[str] = set()
    for node in ast.walk(tree):
        if (
            not isinstance(node, ast.Call)
            or not isinstance(node.func, ast.Name)
            or node.func.id != "MembershipError"
            or not node.args
        ):
            continue
        first = node.args[0]
        if isinstance(first, ast.Constant) and isinstance(first.value, str):
            codes.add(first.value)
        elif isinstance(first, ast.Name) and first.id in module_constants:
            codes.add(module_constants[first.id])
        else:  # pragma: no cover - guards against a non-literal code
            raise AssertionError(
                f"MembershipError code at line {node.lineno} is not a literal "
                "or a known const; the contract cannot verify it."
            )
    return codes


def test_backend_membership_error_codes_match_the_contract() -> None:
    """Every raised code is declared, and every declared code is raised."""
    assert _raised_error_codes() == set(FIXTURE["errors"])


def test_the_contract_declares_where_each_message_comes_from() -> None:
    """Each code says whether the dialog owns its copy or shows the backend's."""
    for code, entry in FIXTURE["errors"].items():
        assert entry["copy"] in {"dedicated", "backend", "preferred"}, code
        assert entry["meaning"].strip(), code


def test_disabled_entity_code_is_the_shared_constant() -> None:
    """The one code both stacks name explicitly stays in sync with const.py."""
    assert const.MEMBERSHIP_ERROR_DISABLED_ENTITY in FIXTURE["errors"]
    # The dialog prefers the backend message here because it names the entity,
    # and keeps its own string for when no message comes back.
    assert (
        FIXTURE["errors"][const.MEMBERSHIP_ERROR_DISABLED_ENTITY]["copy"] == "preferred"
    )


def test_backend_messages_are_user_facing_where_the_editor_relies_on_them() -> None:
    """Codes marked ``backend`` must carry a non-empty, sentence-like message,
    because the dialog renders that string directly."""
    tree = ast.parse(MEMBERSHIP_SOURCE.read_text(encoding="utf-8"))
    messages: dict[str, str] = {}
    for node in ast.walk(tree):
        if (
            not isinstance(node, ast.Call)
            or not isinstance(node.func, ast.Name)
            or node.func.id != "MembershipError"
            or len(node.args) < 2
        ):
            continue
        code_node, message_node = node.args[0], node.args[1]
        if not isinstance(code_node, ast.Constant):
            continue
        if isinstance(message_node, ast.Constant) and isinstance(
            message_node.value, str
        ):
            messages[code_node.value] = message_node.value
        elif isinstance(message_node, ast.JoinedStr):
            # An f-string may open with a placeholder (an entity id), so only its
            # literal parts are checkable — record them joined.
            messages[code_node.value] = "".join(
                part.value
                for part in message_node.values
                if isinstance(part, ast.Constant) and isinstance(part.value, str)
            )

    for code, entry in FIXTURE["errors"].items():
        if entry["copy"] != "backend" or code not in messages:
            continue
        message = messages[code].strip()
        assert len(message) > 10, f"{code} message is too terse to show a user"
        assert not message.endswith(":"), f"{code} message looks like a log prefix"
        assert message.lower() != code.replace("_", " "), (
            f"{code} message just restates the code"
        )
