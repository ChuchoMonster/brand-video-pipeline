---
name: hyperframes-pipeline
description: End-to-end multi-tenant brand explainer/promo-video pipeline. Generates a complete branded video from a URL — extracts brand identity, writes script, generates voice + AI avatar + B-roll images + music underbed, assembles in HyperFrames, and renders. Trigger phrases include "Hyper Frames for <url>", "make a Hyper Frames video for <brand>", "Hyper Frames promo for <url>", "explainer video for <brand>", or just "Hyper Frames <url>".
---

# HyperFrames Pipeline — Multi-Tenant Brand Explainer Videos

End-to-end pipeline that takes a URL and produces a finished branded explainer/promo MP4. Built and validated on ColdStart (coldstartb2b.com). Designed to scale to any B2B brand with minimal per-tenant configuration.

## When to invoke

- User says "Hyper Frames" / "hyperframes" + a URL or brand name
- User asks for an explainer/promo video for a specific business
- User says "make a video for <brand>" or similar
- User says "let's try this on <new url>"

## Required environment (in `$PIPELINE_ROOT/.env` — copy `.env.example`)

```
KIE_AI_API_KEY=...        # Nano Banana 2 + Seedance 2 via KIE.AI
HEYGEN_API_KEY=...        # HeyGen avatar generation
ELEVENLABS_API_KEY=...    # 11Labs voice + music
ELEVENLABS_VOICE_ID=...   # default narrator voice
HEYGEN_TALKING_PHOTO_ID=...  # default avatar Look
```

## Project layout

```
$PIPELINE_ROOT/            # root of this repo
  brands/
    <brand>/              # one directory per brand (created by brand-book)
      brand.json
      colors.md
      typography.md
      voice-tone.md
      reference.png
  template-16x9/          # the active composition (single working dir; swap assets per brand)
    index.html
    styles/
      brand.css           # brand interface — only file with brand-specific CSS
      template.css        # brand-agnostic motion
      layouts.css         # 10 layout system
    assets/
      voice.mp3           # 11Labs output (padded)
      avatar.webm         # HeyGen output (chromakeyed + padded)
      music.mp3           # 11Labs Music underbed
      broll-*.png         # Nano Banana B-roll
    renders/
```

For multi-tenant production, future Stage 0 should copy `template-16x9/` per brand. For now, swap assets in place per render.

---

## Pipeline stages

### Stage 1 — Brand extraction

Invoke the `brand-book` skill on the target URL. It produces:
- `brands/<brand>/brand.json` — palette, typography, voice/tone summary
- `brands/<brand>/css-variables.json` — ALL CSS vars from the live site
- `brands/<brand>/reference.png` — homepage screenshot

Pull the two locked colors that drive every downstream stage:
- **`bg`**: brand's background color (typically near-black, e.g. `#050508`)
- **`accent`**: brand's signal color (typically a saturated hue, e.g. `#8b9cf7`)

These become substitutions in B-roll prompts and in `styles/brand.css`.

### Stage 2 — Read site, understand business

Use `WebFetch` to read the homepage + key pages (services, team, pricing, about). Synthesize:
- What they sell
- Who they sell to (ICP)
- The 1-2 sharpest differentiators
- The desired CTA (book a call, start trial, etc.)

This becomes the script's substance.

### Stage 3 — Script

Write a script for the requested duration. Pacing rule: **~2.7 words per second** of voice (multilingual_v2 cadence). So 22s ≈ 60 words; 45s ≈ 120 words; 60s ≈ 160 words.

Structure (5-scene template at 22s; scale proportionally for longer):
1. **Hook** (10–15% of duration) — punchy 3–6 word line
2. **Body 1 — Problem** (~30%) — what's broken / the bottleneck
3. **Body 2 — Stat or proof** (~15%) — the magnitude (use Template 2 chart for B-roll)
4. **Body 3 — How we work** (~25%) — the differentiator
5. **End / CTA** (~15%) — invitation + brand wordmark

For longer videos (45s+), add additional Body scenes between Body 1 and Body 2 (e.g. "Body 1a — Specific pain point", "Body 1b — Cost of inaction").

**Prosody for 11Labs `eleven_multilingual_v2`:** punctuation drives pacing (commas = micro-pauses, periods = full pauses, em-dashes = beat). Don't bother with SSML or emotion tags — multilingual_v2 doesn't honor them. Just write conversational prose with natural punctuation.

Save script to `template-16x9/script.txt` for traceability.

### Stage 4 — Voice (11Labs)

Call 11Labs TTS with `eleven_multilingual_v2`. Default voice: `$ELEVENLABS_VOICE_ID` from `.env` (or whatever the user specifies / brand prefers — ask if unclear).

```bash
source .env && curl -s -X POST "https://api.elevenlabs.io/v1/text-to-speech/$ELEVENLABS_VOICE_ID" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{"text":"<script>","model_id":"eleven_multilingual_v2"}' \
  --output assets/voice_raw.mp3
```

**Post-process volume to 92% via FFmpeg** (the pipeline standard):
```bash
ffmpeg -y -i voice_raw.mp3 -af "volume=0.92" -c:a libmp3lame -b:a 192k voice.mp3
```

### Stage 5 — Avatar (HeyGen)

Pick a `talking_photo_id` (Look ID). The default comes from `$HEYGEN_TALKING_PHOTO_ID` in `.env` (any talking-photo Look in your HeyGen account).

**Always set `use_avatar_v_model: true`** at the character level. HeyGen will silently fall back to Avatar IV if the Look isn't V-enrolled (a non-enrolled Look falls back to IV; rendering is unaffected).

Upload voice → submit talking_photo render → poll → download → chromakey:

```bash
# Upload audio
AUDIO_ID=$(curl -s -X POST "https://upload.heygen.com/v1/asset" \
  -H "X-Api-Key: $HEYGEN_API_KEY" -H "Content-Type: audio/mpeg" \
  --data-binary @assets/voice.mp3 | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['id'])")

# Submit render
VID=$(curl -s -X POST "https://api.heygen.com/v2/video/generate" \
  -H "X-Api-Key: $HEYGEN_API_KEY" -H "Content-Type: application/json" \
  --data-binary @- <<EOF | python3 -c "import json,sys;print(json.load(sys.stdin)['data']['video_id'])"
{
  "video_inputs": [{
    "character": {
      "type": "talking_photo",
      "talking_photo_id": "$HEYGEN_TALKING_PHOTO_ID",
      "use_avatar_v_model": true
    },
    "voice": { "type": "audio", "audio_asset_id": "$AUDIO_ID" },
    "background": { "type": "color", "value": "#00FF00" }
  }],
  "dimension": { "width": 720, "height": 1280 }
}
EOF
)

# Poll until completed (typically 60–90s for IV, 5–20min for V on first render with new Look)
# GET https://api.heygen.com/v1/video_status.get?video_id=$VID → data.status == "completed"
# Then download data.video_url to assets/avatar_green.mp4
```

### Stage 6 — Chromakey + symmetric padding

Convert HeyGen greenscreen MP4 → transparent VP9 webm with **0.5s freeze-frame pad on both ends**:

```bash
# Chromakey + despill → raw transparent webm
ffmpeg -y -i avatar_green.mp4 \
  -vf "chromakey=0x00FF00:0.10:0.05,despill=type=green:mix=0.6:expand=0" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 30 -an \
  avatar.raw.webm

# Pad both ends with 0.5s freeze frames (preserves alpha)
ffmpeg -y -c:v libvpx-vp9 -i avatar.raw.webm \
  -vf "tpad=start_duration=0.5:start_mode=clone:stop_duration=0.5:stop_mode=clone" \
  -c:v libvpx-vp9 -pix_fmt yuva420p -auto-alt-ref 0 -b:v 0 -crf 30 -an \
  avatar.webm
```

**Symmetrically pad voice.mp3 with 0.5s silence at both ends** so audio offsets match the avatar timing:

```bash
ffmpeg -y -f lavfi -i anullsrc=r=44100:cl=stereo -t 0.5 -c:a libmp3lame -b:a 192k silence.mp3
ffmpeg -y -f concat -safe 0 -i <(printf "file '%s/silence.mp3'\nfile '%s/voice_raw.mp3'\nfile '%s/silence.mp3'\n" "$PWD" "$PWD" "$PWD") \
  -c:a libmp3lame -b:a 192k voice.mp3
```

This achieves the timing rule: **avatar appears → speech starts → speech ends → avatar fades out**. (The rule is 0.5s lead + 0.5s tail, all GSAP scene cues shifted +0.5s, final fade-out begins 0.1s after speech end).

### Stage 7 — Object-position calibration

The avatar's face position in the frame depends on the source photo, so re-calibrate per Look ID:

```bash
ffmpeg -y -ss 0.7 -i avatar.webm -vframes 1 avatar-frame-check.png
```

Read the frame, measure face center y-coordinate (in the 1280-tall source). Compute `object-position` per layout:

```
object_position_y_pct = ( (face_y_px / 1280) * scaled_height_for_layout - layout_slot_height/2 ) / (scaled_height_for_layout - layout_slot_height) * 100
```

In practice: face at top-third of frame (face_y ~380) → use `'50% 30%'` for tight slots, `'50% 50%'` for full-frame slots. Update `LAYOUT_AVATAR_SLOTS` in `index.html`. **Never guess** — always calibrate from an extracted frame.

### Stage 8 — B-roll images (Nano Banana 2 via KIE.AI)

Two locked templates. Brand colors swap per project (substitute `BG_HEX` and `ACCENT_HEX` from brand.json).

**Template 1 — Pure abstract sculpture** (atmosphere, mood, narrative beats):
> Abstract 3D sculptural render on a solid `[BG_HEX]` background. `[FORM_DESCRIPTION]`, suggesting `[MOTION_INTENT]`. `[ACCENT_HEX]` light refracts through and around the form with subsurface scattering, casting soft caustics on a subtly reflective dark floor. Soft directional studio lighting. Hyperreal Octane render. Premium tech keynote aesthetic. Sharp focus on the central form, depth fall-off into shadow at the edges. **No text, no logos.**

**Template 2 — Glass chart** (any line referencing a stat, comparison, growth, ratio, "X×", "Y%"):
> Abstract 3D data visualization on a solid `[BG_HEX]` background. `[CHART_TYPE]` rendered entirely as floating translucent glass forms depicting `[DATA_CONCEPT]`. Baseline elements in muted matte gray glass; focal elements glowing with `[ACCENT_HEX]` subsurface scattering and refraction, casting soft caustics on a subtly reflective dark floor. A thin off-white axis line. Soft directional studio lighting. Hyperreal Octane render. Premium tech keynote aesthetic. Minimal editorial composition with generous negative space. **No text, no numbers, no labels, no logos.**

Decision rule per scene: if the script line cites a number/stat/comparison → Template 2. Otherwise → Template 1.

**Submit pattern** (1:1 aspect default; any aspect supported). Always capture HTTP code + body so 4xx failures self-diagnose:

```bash
source .env && RESPONSE=$(curl -sS -w "\nHTTP_CODE:%{http_code}" -X POST "https://api.kie.ai/api/v1/playground/createTask" \
  -H "Authorization: Bearer $KIE_AI_API_KEY" -H "Content-Type: application/json" \
  --data-binary @- <<EOF
{"model":"nano-banana-2","input":{"prompt":"<TEMPLATE WITH SLOTS FILLED>","output_format":"png","image_size":"1:1"}}
EOF
)
echo "$RESPONSE"
[[ "$RESPONSE" == *"HTTP_CODE:200"* ]] || { echo "KIE submit failed — see body above"; exit 1; }
```

Poll `https://api.kie.ai/api/v1/playground/recordInfo?taskId=<id>` every 4s until `data.state == "success"`, parse `data.resultJson` (it's a JSON string — `json.loads()` it), download the URL to `assets/broll-N.png`.

Run multiple B-roll generations in parallel — KIE.AI handles concurrent tasks well.

**Common 400 cause: prompt safety filter.** Nano Banana 2 rejects prompts that read as legal/violence/conflict-adjacent (e.g. "courtroom", "legal battle", "claimants vs defendants"). Stay strictly within the two abstract templates — encode meaning in geometry/color, never in literal subject matter. Validated 2026-04-28: minimal abstract probe returns 200 with the same auth/schema, so a 400 here is virtually always prompt content.

### Stage 9 — Music underbed (11Labs Music)

```bash
source .env && curl -s -X POST "https://api.elevenlabs.io/v1/music?output_format=mp3_44100_128" \
  -H "xi-api-key: $ELEVENLABS_API_KEY" -H "Content-Type: application/json" \
  -d '{
    "prompt": "<MUSIC PROMPT>",
    "music_length_ms": 22000,
    "force_instrumental": true,
    "model_id": "music_v1"
  }' --output assets/music_raw.mp3
```

Returns audio bytes synchronously. `music_length_ms` matches composition duration (3000–600000ms range).

**Default music prompt** for B2B advertorial underbed (validated 2026-04-27):
> Upbeat optimistic instrumental underscore for a B2B business advertorial. Bright modern piano playing a forward-moving rhythmic pattern with crisp staccato notes, paired with subtle uplifting synth pads. Light gentle pulse — soft shakers or muted rhythmic clicks providing steady forward momentum. No big drums, no kicks, no crashes, no cymbals. No vocals. Confident, peppy, energetic, optimistic feel. Modern, clean, tech-forward, professional, contemporary corporate. Tempo around 115 BPM. Bright major key, sunny but not saccharine. Even dynamics throughout — no swells, no drops, no climaxes, no fades — but with steady rhythmic momentum. Sounds like a modern SaaS product launch video underbed.

**Anti-patterns to avoid in the prompt:**
- "Cinematic" / "moody" / "ambient" → produces sentimental drag, wrong for advertorial
- Tempo below 90 BPM → too sleepy
- Mentioning swells, climaxes, dynamics changes → competes with voice
- Forgetting "no vocals" → ElevenLabs may add humming

**Mix to -20dB with brief fades** so it sits invisibly under voice:
```bash
ffmpeg -y -i music_raw.mp3 \
  -af "volume=-20dB,afade=t=in:st=0:d=0.4,afade=t=out:st=<end-0.6>:d=0.6" \
  -c:a libmp3lame -b:a 192k music.mp3
```

### Stage 10 — Composition assembly

The `template-16x9/index.html` is the working composition. For each render:
1. Update `data-duration` on root, voice, avatar, and music elements to match target length
2. Update brand colors in `styles/brand.css` (vars `--bg`, `--accent`, etc.)
3. Update fonts in `brand.css` if brand uses different families
4. Re-time scene transitions in the GSAP timeline to match script beats
5. Ensure all 4 timed elements (avatar video, voice audio, music audio, root composition) have aligned `data-start` and `data-duration`

Audio track indices: `avatar=1`, `voice=2`, `music=3`. All `class="clip"`. All `data-start="0"`.

### Stage 11 — Render

```bash
cd "$PIPELINE_ROOT/template-16x9" && \
npx hyperframes lint && \
npx hyperframes render --output renders/<brand>-v<n>.mp4
```

**CRITICAL: Run the render in foreground.** Background-mode renders hang at 0% CPU after frame capture starts. Use a foreground Bash call with `timeout: 300000`. Render takes ~1–2 min for a 22s composition, ~3–4 min for 45s.

After render completes, `open -a "QuickTime Player" renders/<brand>-v<n>.mp4` for review.

---

## Iteration loop

Most renders need 1–3 passes:
- **v1**: get the chain working end-to-end with sane defaults
- **v2**: fix obvious problems (face cropping, music too loud, transitions off, captions wrong)
- **v3**: polish (per-scene B-roll variants, layout swaps, timing tightening)

**Always render to a new `vN.mp4`** so prior versions are preserved for comparison. Use the renders/ folder as version history.

---

## Anti-patterns (DON'T)

- **Don't background the `npx hyperframes render` command.** It hangs at 0% CPU. Foreground only.
- **Don't try to integrate a real-world object into the abstract sculpture B-roll.** The sculpture-around-object composition reads as confused. Keep sculpture purely abstract.
- **Don't try to enroll an Avatar V Look via Seedance image-to-video.** Identity drifts badly over 15s and Seedance generates synthetic speech audio. For Avatar V enrollment, the user must enroll a real video in HeyGen Studio. We currently fall back to Avatar IV gracefully; that's fine.
- **Don't forget "no vocals" in the music prompt.** ElevenLabs Music will add humming/oohs otherwise.
- **Don't guess avatar `object-position`.** Always extract a frame and measure face position.
- **Don't pad the audio asymmetrically** with HeyGen — pad voice.mp3 ONLY after HeyGen returns the avatar, not before. HeyGen's lip-sync would otherwise be offset by the silence.
- **Don't use file hosts like tmpfiles.org / catbox.moe / 0x0.st for KIE.AI image_url** — they fail unpredictably. Upload images to HeyGen's `/v1/asset` endpoint with `Content-Type: image/jpeg`; HeyGen hosts at `resource2.heygen.ai` and returns a stable URL.
- **Don't use `eleven_v3` with emotion tags** for this pipeline. We tried; results were inconsistent. Use `eleven_multilingual_v2` with natural punctuation.

---

## Design notes

The original build kept longer design notes (avatar sizing/head-crop rules, object-position calibration, voice/prosody settings, image-direction rationale) in the author's private agent memory. They are not part of this repo; the rules that matter are captured inline above.

---

## What to ask the user before starting

If the user just says "Hyper Frames <url>" with no other context, ask:

1. **Duration** — how long? (default 22s if unspecified; common: 22s, 30s, 45s, 60s)
2. **Voice** — keep default `$ELEVENLABS_VOICE_ID`, or pick another from their 11Labs library?
3. **Avatar** — keep the default Look (`$HEYGEN_TALKING_PHOTO_ID`), or pick another Look from their HeyGen account?
4. **CTA** — what's the desired action ("book a call", "start trial", "schedule demo", etc.)?

If they specify only the URL and duration, use defaults for voice + avatar + CTA (read the site's primary CTA for #4).
