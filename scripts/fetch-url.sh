#!/usr/bin/env bash
# Fetch a URL and print its main content as markdown to stdout.
#
# Fallback for when Claude Code's WebFetch is unavailable or fails.
# Strategy: try pandoc (best for HTML→MD), then html2text, then curl-only.
#
# Usage: fetch-url.sh <url>
# Exit 0: markdown on stdout
# Exit 1: fetch failed (error on stderr)

set -eu

url="${1:-}"
if [ -z "$url" ]; then
  echo "usage: fetch-url.sh <url>" >&2
  exit 1
fi

# Only http(s). Reject file://, ftp://, gopher://, etc. — prompt-injection in
# the user's transcript could otherwise steer an ingest at a local path or
# internal service. curl's --proto is secondary defense against redirects.
case "$url" in
  http://*|https://*) ;;
  *)
    echo "fetch-url: only http(s) URLs are allowed: $url" >&2
    exit 1
    ;;
esac

tmp=$(mktemp -t openclone-fetch.XXXXXX)
trap 'rm -f "$tmp"' EXIT

# --max-filesize caps the body at 25 MB; --proto pins allowed schemes even
# through redirects; --max-time keeps the hook responsive.
if ! curl -fsSL \
      --proto '=http,https' \
      --proto-redir '=http,https' \
      --max-filesize 25M \
      --max-time 30 \
      -A "Mozilla/5.0 openclone" \
      "$url" -o "$tmp"; then
  echo "fetch-url: curl failed for $url" >&2
  exit 1
fi

if command -v pandoc >/dev/null 2>&1; then
  pandoc -f html -t gfm --wrap=none "$tmp" 2>/dev/null || cat "$tmp"
elif command -v html2text >/dev/null 2>&1; then
  html2text -b 0 "$tmp"
else
  # No converter available — emit raw HTML with a warning.
  echo "<!-- fetch-url: neither pandoc nor html2text found; raw HTML below -->"
  cat "$tmp"
fi
