"""Tests for translation file invariants."""

from __future__ import annotations

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
TRANSLATIONS_DIR = ROOT / "custom_components" / "lightener_studio" / "translations"
CANONICAL_LOCALE = "en.json"
PLACEHOLDER_RE = re.compile(r"\{([A-Za-z_][A-Za-z0-9_]*)\}")


def _flatten_strings(value: object, prefix: tuple[str, ...] = ()) -> dict[str, str]:
    if isinstance(value, dict):
        strings: dict[str, str] = {}
        for key, child in value.items():
            strings.update(_flatten_strings(child, (*prefix, key)))
        return strings

    assert isinstance(value, str), f"{'.'.join(prefix)} must be a string"
    return {".".join(prefix): value}


def _load_translation_strings() -> dict[str, dict[str, str]]:
    return {
        path.name: _flatten_strings(json.loads(path.read_text(encoding="utf-8")))
        for path in sorted(TRANSLATIONS_DIR.glob("*.json"))
    }


def _placeholders(text: str) -> set[str]:
    return set(PLACEHOLDER_RE.findall(text))


def test_translation_keys_match_english() -> None:
    """Every locale must expose the same Home Assistant translation keys."""
    translations = _load_translation_strings()
    canonical_keys = set(translations[CANONICAL_LOCALE])

    failures = []
    for locale, strings in translations.items():
        keys = set(strings)
        missing = sorted(canonical_keys - keys)
        extra = sorted(keys - canonical_keys)
        if missing or extra:
            failures.append(f"{locale}: missing={missing or '-'} extra={extra or '-'}")

    assert failures == []


def test_translation_strings_are_not_blank() -> None:
    """Blank strings render as missing copy in Home Assistant forms."""
    translations = _load_translation_strings()

    blanks = sorted(
        f"{locale}:{key}"
        for locale, strings in translations.items()
        for key, value in strings.items()
        if not value.strip()
    )

    assert blanks == []


def test_translation_placeholders_match_english() -> None:
    """Localized copy must keep the same interpolation placeholders."""
    translations = _load_translation_strings()
    canonical = translations[CANONICAL_LOCALE]

    failures = []
    for locale, strings in translations.items():
        if locale == CANONICAL_LOCALE:
            continue

        for key, english_value in canonical.items():
            if key not in strings:
                continue
            expected = _placeholders(english_value)
            actual = _placeholders(strings[key])
            if actual != expected:
                failures.append(
                    f"{locale}:{key}: expected={sorted(expected)} actual={sorted(actual)}"
                )

    assert failures == []
