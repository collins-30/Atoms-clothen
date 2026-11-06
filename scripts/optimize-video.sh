#!/usr/bin/env bash
# Prepare a model video for the store: a short, silent, web-friendly MP4 plus a
# JPG poster frame. Needs ffmpeg (https://ffmpeg.org/download.html).
#
#   ./scripts/optimize-video.sh path/to/clip.mov            -> clip-web.mp4 + clip-poster.jpg
#   ./scripts/optimize-video.sh path/to/clip.mp4 6          -> keep only the first 6 seconds
#   START=2 ./scripts/optimize-video.sh path/to/clip.mp4 6  -> 6 seconds starting at 0:02
#
# Then upload clip-web.mp4 with "Upload model video" in Admin › Products (the
# poster is made for you there, or use "Set poster" with clip-poster.jpg).
set -euo pipefail

in="${1:?Usage: optimize-video.sh <video file> [seconds, default 8]}"
seconds="${2:-8}"
start="${START:-0}"
base="${in%.*}"

# At most 1280 px tall portrait (or 1280 wide landscape), never upscaled, 30 fps, no sound track,
# H.264 so every browser can play it, and "faststart" so it starts playing
# before the whole file has downloaded.
ffmpeg -hide_banner -y -ss "$start" -i "$in" -t "$seconds" -an \
  -vf "scale='if(gt(ih,iw),-2,min(1280\,iw))':'if(gt(ih,iw),min(1280\,ih),-2)',fps=30" \
  -c:v libx264 -preset slow -crf 24 -profile:v high -pix_fmt yuv420p -movflags +faststart \
  "${base}-web.mp4"

ffmpeg -hide_banner -y -ss "$(awk "BEGIN{print $start+0.5}")" -i "$in" -frames:v 1 \
  -vf "scale='if(gt(ih,iw),-2,min(1280\,iw))':'if(gt(ih,iw),min(1280\,ih),-2)'" -q:v 3 \
  "${base}-poster.jpg"

echo
echo "Done:"
ls -lh "${base}-web.mp4" "${base}-poster.jpg"
echo "Aim for under ~6 MB per clip."
