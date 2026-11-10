# Skogai Arcade — Omarchy theme

The Omarchy desktop theme built from the **Skogai Arcade Design System**:
https://claude.ai/artifact/371MkW11ooVU5uxkdVWCob

The design system is the source of truth. This folder only translates it into an Omarchy theme.

| Path | What |
|---|---|
| `tokens.json` | Snapshot of the design system's `project/tokens.json` |
| `scenes/` | The four cabinet scenes from the design system's `project/assets/` |
| `fonts/` | The pixel fonts from the design system's `project/fonts/` |
| `build.py` | Maps tokens to `colors.toml`, renders wallpapers, and with `--install` installs and applies the theme |
| `pixel_wallpapers.py` | Draws the grid, city and rain pixel-art wallpapers in the token palette |
| `theme/` | Build output (git-ignored) |

## Update after the design system changes

1. Download the changed `tokens.json`, scenes and fonts from the artifact into this folder.
2. Run `./build.py --install`. This copies the theme to `~/.config/omarchy/themes/skogai-arcade`, installs the fonts to `~/.local/share/fonts/skogai`, and applies the theme and the `BigBlueTermPlus Nerd Font Mono` font.

To change how a token maps to an Omarchy color, edit `MAPPING` in `build.py`.
Two values are not in the design system: `brown` and the two darkest background steps.

Requires `python3` and ImageMagick (`magick`).
