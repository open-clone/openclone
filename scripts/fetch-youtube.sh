#!/usr/bin/env bash
# Fetch a YouTube video transcript as markdown to stdout.
#
# Requires yt-dlp. If not installed, prints install hint and exits 1.
#
# Usage: fetch-youtube.sh <youtube-url>
# Exit 0: markdown transcript on stdout
# Exit 1: yt-dlp missing or fetch failed

set -eu

url="${1:-}"
if [ -z "$url" ]; then
  echo "usage: fetch-youtube.sh <youtube-url>" >&2
  exit 1
fi

if ! command -v yt-dlp >/dev/null 2>&1; then
  cat >&2 <<EOF
fetch-youtube: yt-dlp is not installed.
  macOS: brew install yt-dlp
  other: pip install -U yt-dlp
EOF
  exit 1
fi

tmpdir=$(mktemp -d -t openclone-yt.XXXXXX)
trap 'rm -rf "$tmpdir"' EXIT

# Pull title + auto/manual subs. Prefer English then Korean.
title=$(yt-dlp --skip-download --print "%(title)s" "$url" 2>/dev/null || echo "YouTube video")

yt-dlp \
  --skip-download \
  --write-auto-sub \
  --write-sub \
  --sub-lang "en,ko" \
  --convert-subs vtt \
  -o "$tmpdir/%(id)s.%(ext)s" \
  "$url" >/dev/null 2>&1 || {
    echo "fetch-youtube: yt-dlp failed" >&2
    exit 1
  }

vtt=$(find "$tmpdir" -name "*.vtt" | head -n1)
if [ -z "$vtt" ]; then
  echo "fetch-youtube: no subtitles available for $url" >&2
  exit 1
fi

echo "# $title"
echo
echo "source: $url"
echo
# Strip VTT headers, timestamps, and dedupe consecutive identical lines.
awk '
  /^WEBVTT/ { next }
  /^$/ { next }
  /-->/ { next }
  /^[0-9]+$/ { next }
  { gsub(/<[^>]*>/, ""); print }
' "$vtt" | awk '!seen[$0]++'
