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


def test_disabled_entity_error_exists_for_config_and_options() -> None:
    """Every locale exposes the shared disabled-membership recovery code."""
    translations = _load_translation_strings()
    required = {
        "config.error.disabled_entity",
        "options.error.disabled_entity",
    }

    assert {
        locale: sorted(required - set(strings))
        for locale, strings in translations.items()
        if required - set(strings)
    } == {}


def test_setup_success_keeps_native_finish_as_the_only_action() -> None:
    """Success guidance must not bypass native device-name and area setup."""
    translations = _load_translation_strings()
    hyperlinks = re.compile(r"\[[^\]]*\]\s*\(|<a\b|https?://|/lightener-editor\b", re.I)

    failures = []
    for locale, strings in translations.items():
        text = strings["config.create_entry.open_editor"]
        if hyperlinks.search(text) or _placeholders(text):
            failures.append(locale)

    assert failures == [], f"Competing setup-success action in: {failures}"


def test_lights_step_finishes_setup_before_directing_users_to_editor() -> None:
    """Editor guidance must include native setup completion in every locale."""
    completion_phrases = {
        "en.json": "Finish setup",
        "de.json": "Schließe die Einrichtung ab",
        "sk.json": "Dokončite nastavenie",
        "pt-BR.json": "Conclua a configuração",
    }
    translations = _load_translation_strings()

    for locale, phrase in completion_phrases.items():
        strings = translations[locale]
        text = strings["config.step.lights.description"]
        assert phrase in text, locale
        assert text.index(phrase) < text.index("**Lightener Studio**"), locale
        assert "config.abort.open_editor" not in strings, locale
        assert all(
            "editor_url" not in _placeholders(value) for value in strings.values()
        ), locale


def test_setup_success_names_native_editor_actions() -> None:
    """Keep native action labels aligned with the supported setup locales."""
    native_labels = {
        "en.json": ("Visit", "Configure"),
        "de.json": ("Besuchen", "Konfigurieren"),
        "sk.json": ("Navštíviť", "Konfigurovať"),
        "pt-BR.json": ("Visitar", "Configurar"),
    }
    translations = _load_translation_strings()

    for locale, labels in native_labels.items():
        text = translations[locale]["config.create_entry.open_editor"]
        assert all(f"**{label}**" in text for label in labels), locale


def test_group_validation_errors_keep_the_full_product_name() -> None:
    """Config and options must identify this integration in every setup locale."""
    translations = _load_translation_strings()
    shortened_name = re.compile(r"\bLightener\b(?! Studio\b)")

    for locale, strings in translations.items():
        for error in ("self_reference", "recursive_lightener"):
            config_text = strings[f"config.error.{error}"]
            options_text = strings[f"options.error.{error}"]
            assert config_text == options_text, (locale, error)
            for text in (config_text, options_text):
                assert "Lightener Studio" in text, (locale, error)
                assert not shortened_name.search(text), (locale, error)
