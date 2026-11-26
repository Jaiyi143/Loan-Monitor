# Design System: Loan Monitor

### Design Dials
- **Density:** 8/10 — Dense / Dashboard

### Style
- **Name:** Minimalism & Swiss Style
- **Mode Support:** Light supported (primary)
- **Keywords:** Clean, high contrast, tabular numerals, crisp 1px borders, grid-based, trustworthy
- **Accessibility:** Contrast >= 4.5:1, visible keyboard focus (`ring-2`), `prefers-reduced-motion` respected

### Colors
| Role | Hex | CSS Variable |
|------|-----|--------------|
| Primary | `#0F172A` | `--color-primary` |
| On Primary | `#FFFFFF` | `--color-on-primary` |
| Secondary | `#1E3A8A` | `--color-secondary` |
| On Secondary | `#FFFFFF` | `--color-on-secondary` |
| Accent/CTA | `#A16207` | `--color-accent` |
| On Accent/CTA | `#FFFFFF` | `--color-on-accent` |
| Background | `#F8FAFC` | `--color-background` |
| Foreground | `#020617` | `--color-foreground` |
| Card | `#FFFFFF` | `--color-card` |
| Card Foreground | `#020617` | `--color-card-foreground` |
| Muted | `#E8ECF1` | `--color-muted` |
| Muted Foreground | `#475569` | `--color-muted-foreground` |
| Border | `#E2E8F0` | `--color-border` |
| Destructive | `#DC2626` | `--color-destructive` |
| On Destructive | `#FFFFFF` | `--color-on-destructive` |
| Ring | `#0F172A` | `--color-ring` |

### Typography
- **Heading & Body:** `IBM Plex Sans`, sans-serif (with `tabular-nums` for currency & dates)
- **Google Fonts:** `https://fonts.googleapis.com/css2?family=IBM+Plex+Sans:wght@400;500;600;700&display=swap`

### Avoid (Anti-patterns)
- Playful styling, emojis as UI icons (use Lucide SVG icons), AI purple/pink gradients, raw hex values scattered in components
