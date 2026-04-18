"""
Direct Gemini API sprite generator.
Uses yunwu.ai proxy to call Gemini for sprite sheet generation.
"""
import sys
import os
import base64
import argparse
from io import BytesIO
from pathlib import Path

# Animation presets (from sprite-animator)
ANIMATION_PRESETS = {
    "idle": {
        "cols": 4, "rows": 4,
        "prompt": (
            "Fill this 4x4 sprite sheet grid (16 cells, read left-to-right, top-to-bottom) "
            "with a cute pixel art version of the character from the reference image. "
            "32x32 pixel art style, retro game aesthetic, clean chunky pixels. "
            "This is an IDLE animation loop with smooth transitions. Each cell is one frame: "
            "Row 1: standing -> gentle breathe up (body rises 1px each frame) -> back to center. "
            "Row 2: standing -> slow eye blink (eyes gradually close over 4 frames). "
            "Row 3: eyes fully shut -> slow eye open (eyes gradually open over 4 frames). "
            "Row 4: standing -> gentle breathe down (body lowers 1px each frame) -> back to center. "
            "CRITICAL: Keep the character IDENTICAL across all 16 frames -- same colors, proportions, "
            "size, position. Only the specified micro-movement should change. "
            "Solid flat color background (same in all cells)."
        ),
    },
    "bounce": {
        "cols": 4, "rows": 4,
        "prompt": (
            "Fill this 4x4 sprite sheet grid (16 cells, read left-to-right, top-to-bottom) "
            "with a cute pixel art version of the character from the reference image. "
            "32x32 pixel art style, retro game aesthetic, clean chunky pixels. "
            "This is a BOUNCE animation loop with smooth transitions. Each cell is one frame: "
            "Row 1: standing -> gradually crouching down (getting squished/compressed). "
            "Row 2: launching upward -> rising -> at peak of jump (stretched tall) -> happy face at peak. "
            "Row 3: starting to fall -> falling fast -> landing impact -> squished on landing. "
            "Row 4: gradually recovering from squish back to standing position. "
            "CRITICAL: Keep the character IDENTICAL across all 16 frames -- same colors, proportions. "
            "Only the vertical position and squish/stretch should change. "
            "Solid flat color background (same in all cells)."
        ),
    },
    "wave": {
        "cols": 4, "rows": 4,
        "prompt": (
            "Fill this 4x4 sprite sheet grid (16 cells, read left-to-right, top-to-bottom) "
            "with a cute pixel art version of the character from the reference image. "
            "32x32 pixel art style, retro game aesthetic, clean chunky pixels. "
            "This is a WAVE animation loop with smooth transitions. Each cell is one frame: "
            "Row 1: standing neutral -> arm starts to raise -> arm halfway up -> arm fully raised. "
            "Row 2: waving hand left -> waving hand center -> waving hand right -> waving hand center. "
            "Row 3: waving hand left -> waving hand center -> arm starts to lower -> arm halfway down. "
            "Row 4: arm almost down -> arm fully down -> back to neutral -> neutral hold. "
            "CRITICAL: Keep the character IDENTICAL across all 16 frames -- same colors, proportions. "
            "Only the arm position and wave motion should change. "
            "Solid flat color background (same in all cells)."
        ),
    },
    "dance": {
        "cols": 4, "rows": 4,
        "prompt": (
            "Fill this 4x4 sprite sheet grid (16 cells, read left-to-right, top-to-bottom) "
            "with a cute pixel art version of the character from the reference image. "
            "32x32 pixel art style, retro game aesthetic, clean chunky pixels. "
            "This is a DANCE animation loop with smooth transitions. Each cell is one frame: "
            "Row 1: standing -> lean left -> lean center -> lean right. "
            "Row 2: lean center -> slight spin (quarter turn) -> spin halfway -> spin complete. "
            "Row 3: crouch prep -> jump up -> peak of jump -> landing. "
            "Row 4: bounce left -> bounce center -> bounce right -> back to standing. "
            "CRITICAL: Keep the character IDENTICAL across all 16 frames -- same colors, proportions. "
            "Only the body position and pose should change. "
            "Solid flat color background (same in all cells)."
        ),
    },
}

SLIME_PROMPT = (
    "Fill this 4x4 sprite sheet grid (16 cells, read left-to-right, top-to-bottom) "
    "with a pixel art SLIME monster character inspired by the reference image's style. "
    "16x16 pixel art style, retro game aesthetic, dark dungeon theme. "
    "The slime should be a round/circular blob shape, translucent green-teal colored (#40B0B0), "
    "with two small dot eyes. It should look like a classic RPG slime monster. "
    "This is an IDLE animation loop with smooth transitions. Each cell is one frame: "
    "Row 1: resting blob -> gentle expand (body grows 1px wider) -> back to normal. "
    "Row 2: resting -> subtle wobble left -> center wobble -> wobble right. "
    "Row 3: wobble back to center -> slight squish down -> bounce back up -> rest. "
    "Row 4: resting -> gentle jiggle -> happy eye blink -> back to rest. "
    "CRITICAL: Keep the slime IDENTICAL across all 16 frames -- same colors, size, position. "
    "Only the wobble/breathe/jiggle movement should change. "
    "Solid dark background (#1A1210) in all cells."
)

BAT_PROMPT = (
    "Fill this 4x4 sprite sheet grid (16 cells, read left-to-right, top-to-bottom) "
    "with a pixel art BAT monster character inspired by the reference image's style. "
    "16x16 pixel art style, retro game aesthetic, dark dungeon theme. "
    "The bat should have spread wings, small body, pointed ears, and red/yellow eyes. "
    "It should look like a classic RPG bat monster. Dark purple/grey body with wing membranes. "
    "This is an IDLE animation loop with smooth transitions. Each cell is one frame: "
    "Row 1: hovering -> wings up -> wings higher -> wings at peak. "
    "Row 2: wings starting down -> wings going down -> wings at bottom -> wings rising. "
    "Row 3: hovering -> slight body bob up -> hover -> slight body bob down. "
    "Row 4: hover -> eye blink -> eyes closed -> eyes open. "
    "CRITICAL: Keep the bat IDENTICAL across all 16 frames -- same colors, size, position. "
    "Only the wing flap and body bob should change. "
    "Solid dark background (#1A1210) in all cells."
)


def create_template(cols=4, rows=4, cell_size=256):
    """Create a labeled grid template."""
    from PIL import Image, ImageDraw, ImageFont

    width = cols * cell_size
    height = rows * cell_size
    img = Image.new("RGB", (width, height), (240, 240, 240))
    draw = ImageDraw.Draw(img)

    for r in range(rows):
        for c in range(cols):
            idx = r * cols + c + 1
            x1 = c * cell_size
            y1 = r * cell_size
            x2 = x1 + cell_size
            y2 = y1 + cell_size
            draw.rectangle([x1, y1, x2, y2], outline=(180, 180, 180), width=2)
            text = str(idx)
            bbox = draw.textbbox((0, 0), text)
            tw = bbox[2] - bbox[0]
            th = bbox[3] - bbox[1]
            draw.text((x1 + 4, y1 + 4), text, fill=(200, 200, 200))

    return img


def generate_sprite(input_path, output_dir, prompt, name, cell_size=256,
                    resolution="1K", two_step=False):
    """Generate a 16-frame sprite sheet using Gemini API via yunwu.ai proxy."""
    from google import genai
    from google.genai import types
    from PIL import Image

    output_dir = Path(output_dir)
    output_dir.mkdir(parents=True, exist_ok=True)

    api_key = os.environ.get("GEMINI_API_KEY", "")
    base_url = os.environ.get("GEMINI_PROXY_BASE_URL", "https://yunwu.ai")
    model = os.environ.get("GEMINI_MODEL", "gemini-3-pro-image-preview")
    if not api_key:
        print("  ERROR: GEMINI_API_KEY env var not set. Create a .env file or export it.")
        return False
    client = genai.Client(
        api_key=api_key,
        http_options=types.HttpOptions(base_url=base_url),
    )

    # Load input image
    input_img = Image.open(input_path)
    print(f"  Input: {input_path} ({input_img.size})")

    # Two-step: first pixelate the photo into a sprite base
    if two_step:
        print(f"  [two-step] Pixelating input image...")
        pixelate_prompt = (
            "Convert this image into a clean pixel art character sprite. "
            "32x32 pixel art style, retro game aesthetic, clean chunky pixels. "
            "Keep all identifying features (hair, clothing, expression). "
            "Remove the background, use solid flat color instead. "
            "Output a single centered character on a solid background."
        )
        response = client.models.generate_content(
            model=model,
            contents=[input_img, pixelate_prompt],
            config=types.GenerateContentConfig(response_modalities=["TEXT", "IMAGE"]),
        )
        for part in response.parts:
            if part.inline_data is not None:
                image_data = part.inline_data.data
                if isinstance(image_data, str):
                    image_data = base64.b64decode(image_data)
                input_img = Image.open(BytesIO(image_data))
                print(f"  [two-step] Pixelated: {input_img.size}")
                break

    # Scale cell_size for 2K resolution
    actual_cell_size = cell_size * 2 if resolution == "2K" else cell_size

    # Create template
    template = create_template(cell_size=actual_cell_size)
    print(f"  Template: {template.size} (resolution={resolution})")

    # Call Gemini
    print(f"  Calling Gemini API for {name}...")
    response = client.models.generate_content(
        model=model,
        contents=[template, input_img, prompt],
        config=types.GenerateContentConfig(
            response_modalities=["TEXT", "IMAGE"],
        ),
    )

    # Extract image from response
    sheet = None
    for part in response.parts:
        if part.inline_data is not None:
            image_data = part.inline_data.data
            if isinstance(image_data, str):
                image_data = base64.b64decode(image_data)
            sheet = Image.open(BytesIO(image_data))
            break

    if sheet is None:
        print(f"  ERROR: No image in response")
        return False

    # Save sprite sheet
    sheet_path = output_dir / f"{name}_sheet.png"

    # ── Remove background (per-frame dominant color detection) ──
    # AI-generated sheets have dark solid backgrounds (RGB≈25,17,14) that
    # show as black borders when rendered. Simple flood-fill fails when
    # background color varies between frames. Instead, detect the most
    # common color per frame (= background) and threshold-remove it.
    import numpy as np
    from collections import Counter

    sheet = sheet.convert("RGBA")
    arr = np.array(sheet)
    cols_pre, rows_pre = 4, 4
    cell_w = arr.shape[1] // cols_pre
    cell_h = arr.shape[0] // rows_pre
    tolerance = 30

    for r in range(rows_pre):
        for c in range(cols_pre):
            y1, y2 = r * cell_h, (r + 1) * cell_h
            x1, x2 = c * cell_w, (c + 1) * cell_w
            cell = arr[y1:y2, x1:x2]
            pixels = cell.reshape(-1, cell.shape[2])[:, :3]
            rounded = (pixels >> 2) << 2
            tuples = [tuple(p) for p in rounded]
            bg_color = Counter(tuples).most_common(1)[0][0]
            diff = (
                np.abs(cell[:, :, 0].astype(int) - bg_color[0])
                + np.abs(cell[:, :, 1].astype(int) - bg_color[1])
                + np.abs(cell[:, :, 2].astype(int) - bg_color[2])
            )
            bg_mask = diff <= tolerance
            arr[y1:y2, x1:x2, 3] = np.where(bg_mask, 0, cell[:, :, 3])

    sheet = Image.fromarray(arr)
    sheet.save(sheet_path)
    print(f"  Sheet saved (bg removed): {sheet_path} ({sheet.size})")

    # Extract individual frames (4x4 grid)
    cols, rows = 4, 4
    cell_w = sheet.width // cols
    cell_h = sheet.height // rows
    frames = []

    frames_dir = output_dir / f"{name}_frames"
    frames_dir.mkdir(exist_ok=True)

    for r in range(rows):
        for c in range(cols):
            x1 = c * cell_w
            y1 = r * cell_h
            frame = sheet.crop((x1, y1, x1 + cell_w, y1 + cell_h))
            frames.append(frame)
            frame_path = frames_dir / f"frame_{r * cols + c:02d}.png"
            frame.save(frame_path)

    print(f"  Extracted {len(frames)} frames -> {frames_dir}/")

    # Create animated GIF
    gif_path = output_dir / f"{name}.gif"
    # Resize frames to 32x32 for game use
    game_frames = []
    for f in frames:
        resized = f.resize((32, 32), Image.Resampling.NEAREST)
        if resized.mode != "RGBA":
            resized = resized.convert("RGBA")
        game_frames.append(resized)

    game_frames[0].save(
        gif_path,
        save_all=True,
        append_images=game_frames[1:],
        duration=150,
        loop=0,
    )
    print(f"  GIF saved: {gif_path}")

    return True


def load_dotenv():
    """Load .env file from project root."""
    # .claude/skills/sprite-animator/scripts/generate_sprite.py -> project root (5 levels)
    env_path = Path(__file__).resolve().parent.parent.parent.parent.parent / ".env"
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, val = line.partition("=")
                    os.environ.setdefault(key.strip(), val.strip())


# Example presets — 仅供演示，生成新怪物请用 --prompt 参数
PRESETS = {
    "slime": {
        "input": "src/assets/0x72/frames/MONSTER/swampy_anim_f0.png",
        "prompt": SLIME_PROMPT,
    },
    "bat": {
        "input": "src/assets/0x72/frames/MONSTER/imp_idle_anim_f0.png",
        "prompt": BAT_PROMPT,
    },
}


def build_prompt_from_animation(animation_type):
    """Build a prompt from a standard animation preset."""
    preset = ANIMATION_PRESETS.get(animation_type)
    if not preset:
        return None
    return preset["prompt"]


if __name__ == "__main__":
    load_dotenv()
    parser = argparse.ArgumentParser(
        description="Generate pixel art sprite sheets using Gemini API",
        formatter_class=argparse.RawDescriptionHelpFormatter,
        epilog="""
Examples:
  # Use preset (built-in prompt + reference image)
  %(prog)s --name slime

  # Use custom input image with built-in animation type
  %(prog)s --input my_character.png --animation idle --name my_char

  # Use custom input with preset prompt
  %(prog)s --input photo.png --preset slime --name my_slime
""",
    )
    parser.add_argument("--name", required=True, help="Output sprite name")
    parser.add_argument("--input", "-i", default=None, help="Input reference image path")
    parser.add_argument("--animation", "-a", default=None,
                        choices=["idle", "bounce", "wave", "dance"],
                        help="Animation type (generates generic prompt)")
    parser.add_argument("--output", default="src/assets/generated", help="Output directory")
    parser.add_argument("--cell-size", "-s", type=int, default=256, help="Cell size in px (default: 256)")
    parser.add_argument("--frame-duration", "-d", type=int, default=150, help="GIF frame duration in ms (default: 150)")
    parser.add_argument("--resolution", "-r", default="1K", choices=["1K", "2K"],
                        help="Generation resolution (2K = better quality, default: 1K)")
    parser.add_argument("--two-step", action="store_true",
                        help="Pixelate first, then animate (better for photos)")
    parser.add_argument("--preset", default=None, choices=list(PRESETS.keys()),
                        help="Use a built-in preset (prompt + input image)")
    parser.add_argument("--prompt", "-p", default=None,
                        help="Custom prompt string (no need to modify script)")
    args = parser.parse_args()

    os.environ["PYTHONIOENCODING"] = "utf-8"

    # Resolve input image and prompt
    input_path = None
    prompt = None

    if args.prompt:
        # Custom prompt from CLI — no script modification needed
        if not args.input:
            print("  ERROR: --prompt requires --input to specify reference image")
            sys.exit(1)
        input_path = args.input
        prompt = args.prompt
    elif args.preset:
        p = PRESETS[args.preset]
        input_path = p["input"]
        prompt = p["prompt"]
    elif args.name in PRESETS and not args.input:
        # Shorthand: --name slime without --input uses preset
        p = PRESETS[args.name]
        input_path = p["input"]
        prompt = p["prompt"]
    elif args.input:
        input_path = args.input
        if args.animation:
            prompt = build_prompt_from_animation(args.animation)
            if not prompt:
                print(f"  ERROR: Unknown animation type '{args.animation}'")
                sys.exit(1)
        else:
            prompt = build_prompt_from_animation("idle")
    else:
        print("  ERROR: Provide --input or use a preset name (--name slime/bat)")
        sys.exit(1)

    print(f"Generating {args.name} sprite...")
    print(f"  Input: {input_path}")
    success = generate_sprite(input_path, args.output, prompt, args.name,
                              cell_size=args.cell_size,
                              resolution=args.resolution,
                              two_step=args.two_step)
    print(f"{'DONE' if success else 'FAILED'}")
    sys.exit(0 if success else 1)
