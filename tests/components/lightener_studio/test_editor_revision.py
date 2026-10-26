"""Saved-content revisions include raw data, identity and member order."""

from copy import deepcopy

from custom_components.lightener_studio.editor_revision import editor_revision


def test_revision_covers_complete_raw_group_and_exact_aba():
    original = {
        "light.a": {"brightness": {"12.5": "8.2"}, "future": {"z": [1], "a": 2}},
        "light.b": {},
    }
    before = deepcopy(original)
    token = editor_revision("entry", original)
    assert len(token) == 67 and token.startswith("v1:")
    assert editor_revision("other", original) != token
    assert editor_revision("entry", dict(reversed(list(original.items())))) != token
    reordered = deepcopy(original)
    reordered["light.a"]["future"] = {"a": 2, "z": [1]}
    assert editor_revision("entry", reordered) == token
    for altered in [
        {**original, "light.c": {}},
        {"light.a": original["light.a"]},
        {**original, "light.b": {"other": True}},
        {**original, "light.a": {"brightness": {"12.5": "8.3"}}},
    ]:
        assert editor_revision("entry", altered) != token
    assert editor_revision("entry", before) == token
    assert original == before
