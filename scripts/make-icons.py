#!/usr/bin/env python3
"""Простая иконка карточки для главного экрана."""

import struct
import zlib
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1] / "public"


def write_png(path: Path, size: int, maskable: bool) -> None:
    paper = (244, 241, 234, 255)
    ink = (28, 25, 21, 255)
    accent = (138, 90, 42, 255)
    line = (200, 191, 178, 255)
    background = ink if not maskable else (28, 25, 21, 255)
    scale = size / 512

    def pixel(x: int, y: int) -> tuple[int, int, int, int]:
        inset = 0.22 if maskable else 0.16
        left = int(size * inset)
        top = int(size * (inset - 0.02))
        right = size - left
        bottom = size - int(size * inset)
        radius = int(28 * scale)
        if not inside_round_rect(x, y, left, top, right, bottom, radius):
            return background
        stripe_top = top + int(size * 0.16)
        if stripe_top <= y < stripe_top + max(3, int(10 * scale)) and left + int(size * 0.08) <= x < right - int(size * 0.08):
            return accent
        stripe_top += int(size * 0.08)
        if stripe_top <= y < stripe_top + max(3, int(10 * scale)) and left + int(size * 0.08) <= x < left + int((right - left) * 0.62):
            return line
        return paper

    raw = bytearray()
    for y in range(size):
        raw.append(0)
        for x in range(size):
            raw.extend(pixel(x, y))
    data = zlib.compress(bytes(raw), 9)

    def chunk(tag: bytes, payload: bytes) -> bytes:
        return struct.pack(">I", len(payload)) + tag + payload + struct.pack(">I", zlib.crc32(tag + payload) & 0xFFFFFFFF)

    ihdr = struct.pack(">IIBBBBB", size, size, 8, 6, 0, 0, 0)
    png = b"\x89PNG\r\n\x1a\n" + chunk(b"IHDR", ihdr) + chunk(b"IDAT", data) + chunk(b"IEND", b"")
    path.write_bytes(png)


def inside_round_rect(x: int, y: int, left: int, top: int, right: int, bottom: int, radius: int) -> bool:
    if x < left or x >= right or y < top or y >= bottom:
        return False
    dx = 0
    dy = 0
    if x < left + radius and y < top + radius:
        dx = left + radius - x
        dy = top + radius - y
    elif x >= right - radius and y < top + radius:
        dx = x - (right - radius - 1)
        dy = top + radius - y
    elif x < left + radius and y >= bottom - radius:
        dx = left + radius - x
        dy = y - (bottom - radius - 1)
    elif x >= right - radius and y >= bottom - radius:
        dx = x - (right - radius - 1)
        dy = y - (bottom - radius - 1)
    else:
        return True
    return dx * dx + dy * dy <= radius * radius


if __name__ == "__main__":
    ROOT.mkdir(parents=True, exist_ok=True)
    write_png(ROOT / "pwa-192x192.png", 192, False)
    write_png(ROOT / "pwa-512x512.png", 512, False)
    write_png(ROOT / "maskable-512x512.png", 512, True)
    write_png(ROOT / "apple-touch-icon.png", 180, False)
