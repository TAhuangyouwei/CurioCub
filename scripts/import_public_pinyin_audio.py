"""Import and compress the public-domain pinyin recordings used by CurioCub."""

from __future__ import annotations

import argparse
import subprocess
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]

INITIAL_SOURCES = {
    "b": "bo1", "p": "po1", "m": "mo1", "f": "fo1",
    "d": "de1", "t": "te1", "n": "ne1", "l": "le1",
    "g": "ge1", "k": "ke1", "h": "he1",
    "j": "ji1", "q": "qi1", "x": "xi1",
    "zh": "zhi1", "ch": "chi1", "sh": "shi1", "r": "ri1",
    "z": "zi1", "c": "ci1", "s": "si1", "y": "yi1", "w": "wu1",
}

# Zero-initial spellings are used so the recording contains only the final.
# o / eng / ong are intentionally omitted because the source pack has no
# equivalent recording without an extra consonant or medial.
FINAL_SOURCES = {
    "a": "a", "e": "e", "i": "yi", "u": "wu", "v": "yu",
    "ai": "ai", "ei": "ei", "ui": "wei", "ao": "ao", "ou": "ou",
    "iu": "you", "ie": "ye", "ve": "yue", "er": "er",
    "an": "an", "en": "en", "in": "yin", "un": "wen", "vn": "yun",
    "ang": "ang", "ing": "ying",
}

# Preserve quiet consonants and pauses; never treat a short pause as the end.
AUDIO_FILTER = 'apad=pad_dur=0.12'


def source_key(project_key: str) -> str:
    if project_key.startswith("lv"):
        return f"luu{project_key[2:]}"
    if project_key.startswith("nv"):
        return f"nuu{project_key[2:]}"
    return project_key


def convert(ffmpeg: Path, source: Path, target: Path, bitrate: str = "32k") -> None:
    target.parent.mkdir(parents=True, exist_ok=True)
    subprocess.run(
        [
            str(ffmpeg), "-y", "-hide_banner", "-loglevel", "error",
            "-i", str(source), "-af", AUDIO_FILTER,
            "-ar", "24000", "-ac", "1", "-b:a", bitrate,
            "-map_metadata", "-1", str(target),
        ],
        check=True,
    )


def import_syllables(source_dir: Path, ffmpeg: Path) -> tuple[int, int]:
    imported = 0
    retained = 0
    for package_dir in sorted((ROOT / "packages").glob("pinyin-[0-9][0-9]")):
        for target in sorted((package_dir / "audio").glob("*.mp3")):
            source = source_dir / f"{source_key(target.stem)}.mp3"
            if source.exists():
                convert(ffmpeg, source, target)
                imported += 1
            else:
                retained += 1
    return imported, retained


def import_basics(source_dir: Path, ffmpeg: Path) -> tuple[int, int]:
    basic_dir = ROOT / "assets" / "audio" / "pinyin-basic"
    imported = 0
    toned_finals = 0

    for initial, source_name in INITIAL_SOURCES.items():
        convert(ffmpeg, source_dir / f"{source_name}.mp3", basic_dir / f"initial-{initial}.mp3", "24k")
        imported += 1

    for final, source_base in FINAL_SOURCES.items():
        first_tone = source_dir / f"{source_base}1.mp3"
        if not first_tone.exists():
            continue
        convert(ffmpeg, first_tone, basic_dir / f"final-{final}.mp3", "24k")
        imported += 1
        for tone in range(1, 5):
            source = source_dir / f"{source_base}{tone}.mp3"
            if source.exists():
                convert(ffmpeg, source, basic_dir / f"final-{final}-{tone}.mp3", "24k")
                toned_finals += 1

    return imported, toned_finals


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path, help="Path to the repository's mp3 folder")
    parser.add_argument("ffmpeg", type=Path, help="Path to ffmpeg.exe")
    args = parser.parse_args()

    imported, retained = import_syllables(args.source, args.ffmpeg)
    basics, toned_finals = import_basics(args.source, args.ffmpeg)
    print(
        f"Imported {imported} syllables; retained {retained} fallbacks; "
        f"imported {basics} basics and {toned_finals} toned finals."
    )


if __name__ == "__main__":
    main()
