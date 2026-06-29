"""Tests for Home Assistant/HACS brand asset invariants."""

from __future__ import annotations

import hashlib
import zlib
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parents[3]
BRAND_DIR = ROOT / "custom_components" / "lightener_studio" / "brand"

EXPECTED_DIMENSIONS = {
    "icon.png": (256, 256),
    "icon@2x.png": (512, 512),
    "dark_icon.png": (256, 256),
    "dark_icon@2x.png": (512, 512),
    "logo.png": (768, 256),
    "logo@2x.png": (1536, 512),
    "dark_logo.png": (768, 256),
    "dark_logo@2x.png": (1536, 512),
}

OLD_UPSTREAM_DERIVED_HASHES = {
    # Previous bulb/bolt/crescent assets. The new Lightener Studio brand must
    # stay original and must not accidentally sync back to these files.
    "7b82cf62d3830be790b5c697eaf5c37326e859d0e26a9cb4b97d3e16b158044f",
    "d5c89f2700c507affaac7d59dbe7d3f364064bd4461aee87e6f9fbea0cb71f06",
    "92923824be3df56f6adc90e3ab7172c9d0a40ff963c4ca1971a0731077f76c1a",
    "2c2baf49f4e1b9885ac15e1cbc1cf5dc07d79f265ae782bc400c5063a88bf560",
}

PNG_SIGNATURE = b"\x89PNG\r\n\x1a\n"


@dataclass(frozen=True)
class PngImage:
    data: bytes
    width: int
    height: int
    bit_depth: int
    color_type: int
    interlace: int
    pixels: bytes


def _read_png(path: Path) -> PngImage:
    data = path.read_bytes()
    assert data.startswith(PNG_SIGNATURE), f"{path.name} is not a PNG"

    width = height = bit_depth = color_type = interlace = None
    idat_chunks: list[bytes] = []
    offset = len(PNG_SIGNATURE)

    while offset < len(data):
        length = int.from_bytes(data[offset : offset + 4], "big")
        chunk_type = data[offset + 4 : offset + 8]
        chunk = data[offset + 8 : offset + 8 + length]
        offset += 12 + length

        if chunk_type == b"IHDR":
            width = int.from_bytes(chunk[0:4], "big")
            height = int.from_bytes(chunk[4:8], "big")
            bit_depth = chunk[8]
            color_type = chunk[9]
            interlace = chunk[12]
        elif chunk_type == b"IDAT":
            idat_chunks.append(chunk)
        elif chunk_type == b"IEND":
            break

    assert width is not None
    assert height is not None
    assert bit_depth is not None
    assert color_type is not None
    assert interlace is not None
    assert idat_chunks, f"{path.name} has no image data"

    assert bit_depth == 8, f"{path.name} must use 8-bit channels"
    assert color_type == 6, f"{path.name} must be RGBA"
    assert interlace == 0, f"{path.name} must be directly decodable by this test"

    return PngImage(
        data=data,
        width=width,
        height=height,
        bit_depth=bit_depth,
        color_type=color_type,
        interlace=interlace,
        pixels=_decode_rgba_pixels(width, height, b"".join(idat_chunks)),
    )


def _decode_rgba_pixels(width: int, height: int, idat_data: bytes) -> bytes:
    raw = zlib.decompress(idat_data)
    channels = 4
    stride = width * channels
    prior = bytearray(stride)
    decoded = bytearray(width * height * channels)
    source = 0
    target = 0

    for _y in range(height):
        filter_type = raw[source]
        source += 1
        row = bytearray(raw[source : source + stride])
        source += stride

        if filter_type == 1:
            for index in range(stride):
                left = row[index - channels] if index >= channels else 0
                row[index] = (row[index] + left) & 0xFF
        elif filter_type == 2:
            for index in range(stride):
                row[index] = (row[index] + prior[index]) & 0xFF
        elif filter_type == 3:
            for index in range(stride):
                left = row[index - channels] if index >= channels else 0
                up = prior[index]
                row[index] = (row[index] + ((left + up) // 2)) & 0xFF
        elif filter_type == 4:
            for index in range(stride):
                left = row[index - channels] if index >= channels else 0
                up = prior[index]
                upper_left = prior[index - channels] if index >= channels else 0
                row[index] = (row[index] + _paeth(left, up, upper_left)) & 0xFF
        else:
            assert filter_type == 0, f"unsupported PNG filter {filter_type}"

        decoded[target : target + stride] = row
        target += stride
        prior = row

    return bytes(decoded)


def _paeth(left: int, up: int, upper_left: int) -> int:
    estimate = left + up - upper_left
    left_distance = abs(estimate - left)
    up_distance = abs(estimate - up)
    upper_left_distance = abs(estimate - upper_left)

    if left_distance <= up_distance and left_distance <= upper_left_distance:
        return left
    if up_distance <= upper_left_distance:
        return up
    return upper_left


def _alpha_at(image: PngImage, x: int, y: int) -> int:
    return image.pixels[((y * image.width + x) * 4) + 3]


def _alpha_bbox(image: PngImage) -> tuple[int, int, int, int]:
    min_x = image.width
    min_y = image.height
    max_x = -1
    max_y = -1

    for y in range(image.height):
        for x in range(image.width):
            if _alpha_at(image, x, y) == 0:
                continue
            min_x = min(min_x, x)
            min_y = min(min_y, y)
            max_x = max(max_x, x)
            max_y = max(max_y, y)

    assert max_x >= 0 and max_y >= 0, "PNG has no visible pixels"
    return min_x, min_y, max_x, max_y


def test_brand_assets_have_required_dimensions_and_format() -> None:
    """Keep local HA/HACS brand files compatible with the manifest domain."""
    assert {path.name for path in BRAND_DIR.glob("*.png")} == set(EXPECTED_DIMENSIONS)

    for filename, dimensions in EXPECTED_DIMENSIONS.items():
        image = _read_png(BRAND_DIR / filename)

        assert (image.width, image.height) == dimensions
        if "logo" in filename:
            assert image.width > image.height
            shortest_side = min(dimensions)
            if "@2x" in filename:
                assert 256 <= shortest_side <= 512
            else:
                assert 128 <= shortest_side <= 256


def test_brand_assets_are_transparent_and_trimmed() -> None:
    """Avoid padded or flattened PNGs that fail Home Assistant brand review rules."""
    for filename in EXPECTED_DIMENSIONS:
        image = _read_png(BRAND_DIR / filename)

        assert _alpha_at(image, 0, 0) == 0
        assert _alpha_at(image, image.width - 1, 0) == 0
        assert _alpha_at(image, 0, image.height - 1) == 0
        assert _alpha_at(image, image.width - 1, image.height - 1) == 0

        min_x, min_y, max_x, max_y = _alpha_bbox(image)
        margins = (
            min_x,
            min_y,
            image.width - 1 - max_x,
            image.height - 1 - max_y,
        )
        max_allowed_margin = round(min(image.width, image.height) * 0.30)

        assert max(margins) <= max_allowed_margin, (
            f"{filename} has too much transparent padding: {margins}"
        )


def test_brand_assets_do_not_reuse_old_upstream_derived_art() -> None:
    """Block accidental reintroduction of the old bulb/bolt/crescent artwork."""
    for filename in EXPECTED_DIMENSIONS:
        digest = hashlib.sha256((BRAND_DIR / filename).read_bytes()).hexdigest()

        assert digest not in OLD_UPSTREAM_DERIVED_HASHES
