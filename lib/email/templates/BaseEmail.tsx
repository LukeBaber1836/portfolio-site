import { Body, Container, Head, Html, Link, Preview, Section, Text } from "@react-email/components";

/*
 * Brand email layout. Email clients can't read our CSS, so tokens are inlined.
 * Built light-first: the inline (base) colors are the LIGHT palette, so any
 * client that ignores our dark-mode signals entirely (most of Gmail) still
 * renders a normal, legible, dark-text-on-light-card email instead of relying
 * on a forced dark scheme it might not actually honor.
 * Three layers add the dark variant where a client actually supports it:
 *  1. `color-scheme: light dark` + `supported-color-schemes: light dark` metas
 *     tell capable clients we support both — no auto-inversion needed.
 *  2. `@media (prefers-color-scheme: dark)` overrides the `.em-*` classes with
 *     the dark palette (Apple Mail, iOS/Android Mail, Gmail webmail dark theme).
 *  3. `[data-ogsc]` / `[data-ogsb]` attribute selectors catch Outlook.com /
 *     Windows Mail's proprietary dark-mode signal, same overrides.
 * Gmail apps that support neither will just auto-invert this light email for
 * users with Gmail dark mode on — an imperfect but legible fallback, which is
 * the point: never end up with light text on a background that stayed light.
 * Hex colors only (Gmail drops rgba in some contexts). Never pure #000/#fff —
 * off-blacks/off-whites read a little softer and invert less harshly.
 * The CTA button is exempt from all of this: its gold face and near-black
 * text are fixed regardless of scheme, since gold reads fine on light or dark.
 * Claymorphism = bevel borders (render everywhere) + box-shadow (where supported).
 */
const light = {
  page: "#f4f4f6",
  card: "#ffffff",
  cardTop: "#ffffff",
  cardBottom: "#d9d9de",
  inset: "#eeeef1",
  text: "#3f3f46",
  heading: "#18181b",
  muted: "#6b6b74",
  faint: "#8b8b94",
  gold: "#8a6416",
  divider: "#e4e4e7",
  cardShadow: "0 1px 3px rgba(24,24,27,0.08), 0 8px 20px rgba(24,24,27,0.06)",
  codeShadow: "inset 2px 2px 6px rgba(24,24,27,0.08), inset -1px -1px 3px rgba(255,255,255,0.6)",
};
const dark = {
  page: "#141416",
  card: "#27272c",
  cardTop: "#34343b",
  cardBottom: "#0c0c0e",
  inset: "#1b1b1f",
  text: "#e4e4e7",
  heading: "#ffffff",
  muted: "#a1a1aa",
  faint: "#71717a",
  gold: "#f3d076",
  divider: "#2e2e34",
  cardShadow: "6px 6px 16px #050506, -4px -4px 12px #1d1d21",
  codeShadow: "inset 3px 3px 8px #050506, inset -2px -2px 6px #2a2a30",
};

/**
 * The CTA button's gold bevel + text color are fixed — gold reads fine on either scheme.
 * Deeper/darker than the rest of the brand's gold accent: some clients (Gmail's app in
 * particular) force button/link text to white regardless of our inline color, so every
 * stop here is dark enough that white text stays legible too, not just the intended black.
 */
const button = {
  face: "#b98a2a",
  light: "#b98a2a",
  dark: "#8f6e28",
  deep: "#7a5813",
  shadow: "#6e4f12",
  text: "#141416",
};

/** Legacy `bgcolor` attribute (Outlook/old-client fallback); React renders it, but its td typings omit it. */
const bg = (color: string) => ({ bgcolor: color }) as Record<string, string>;

const font = "'JetBrains Mono', ui-monospace, SFMono-Regular, Menlo, Consolas, 'Courier New', monospace";

export type EmailRow = { label: string; value: string; strong?: boolean };

export type BaseEmailProps = {
  preview: string;
  heading: string;
  greeting?: string;
  paragraphs: string[];
  code?: string;
  rows?: EmailRow[];
  cta?: { label: string; href: string };
  footnote?: string;
  appUrl: string;
};

/** Bulletproof gold pill button with a clay bevel. */
function ClayButton({ href, label }: { href: string; label: string }) {
  return (
    <table role="presentation" cellPadding={0} cellSpacing={0} border={0} style={{ borderCollapse: "separate", margin: "28px 0 8px" }}>
      <tbody>
        <tr>
          <td
            align="center" {...bg(button.face)}
            style={{
              borderRadius: 999,
              backgroundColor: button.face,
              backgroundImage: `linear-gradient(135deg, ${button.dark} 0%, ${button.light} 52%, ${button.deep} 100%)`,
              borderTop: `1px solid ${button.light}`,
              borderLeft: `1px solid ${button.light}`,
              borderRight: `1px solid ${button.deep}`,
              borderBottom: `3px solid ${button.shadow}`,
              boxShadow:
                "6px 6px 16px rgba(0,0,0,0.35), -4px -4px 12px rgba(0,0,0,0.08), inset 1px 1px 2px #fffbe0, inset -2px -2px 6px #8f6a1f",
            }}
          >
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="em-btn"
              style={{
                display: "inline-block",
                padding: "13px 30px",
                fontFamily: font,
                fontSize: 14,
                fontWeight: 700,
                lineHeight: "18px",
                color: button.text,
                textDecoration: "none",
                borderRadius: 999,
              }}
            >
              {label}&nbsp;&rarr;
            </a>
          </td>
        </tr>
      </tbody>
    </table>
  );
}

export function BaseEmail({ preview, heading, greeting, paragraphs, code, rows, cta, footnote, appUrl }: BaseEmailProps) {
  return (
    <Html lang="en" style={{ backgroundColor: light.page }}>
      <Head>
        <meta name="color-scheme" content="light dark" />
        <meta name="supported-color-schemes" content="light dark" />
        <style>{`:root { color-scheme: light dark; supported-color-schemes: light dark; }
body { background-color: ${light.page}; margin: 0; }
/* Gmail apps auto-recolor <a> text in dark mode, overriding inline color. \`u + .body\`
   only matches Gmail's own DOM quirk, so this reasserts our fixed button text everywhere else untouched. */
u + .body .em-btn { color:${button.text} !important; text-decoration:none !important; }
@media (prefers-color-scheme: dark) {
  body, .em-page { background-color:${dark.page} !important; }
  .em-card { background-color:${dark.card} !important; border-color:${dark.cardTop} ${dark.cardBottom} ${dark.cardBottom} ${dark.cardTop} !important; box-shadow:${dark.cardShadow} !important; }
  .em-code { background-color:${dark.inset} !important; color:${dark.heading} !important; border-color:${dark.cardBottom} ${dark.cardTop} ${dark.cardTop} ${dark.cardBottom} !important; box-shadow:${dark.codeShadow} !important; }
  .em-text { color:${dark.text} !important; }
  .em-heading { color:${dark.heading} !important; }
  .em-gold { color:${dark.gold} !important; }
  .em-muted { color:${dark.muted} !important; }
  .em-faint { color:${dark.faint} !important; }
  .em-divider { border-color:${dark.divider} !important; }
}
[data-ogsc] body, [data-ogsb] body, [data-ogsc] .em-page, [data-ogsb] .em-page { background-color:${dark.page} !important; }
[data-ogsc] .em-card, [data-ogsb] .em-card { background-color:${dark.card} !important; border-color:${dark.cardTop} ${dark.cardBottom} ${dark.cardBottom} ${dark.cardTop} !important; box-shadow:${dark.cardShadow} !important; }
[data-ogsc] .em-code, [data-ogsb] .em-code { background-color:${dark.inset} !important; color:${dark.heading} !important; border-color:${dark.cardBottom} ${dark.cardTop} ${dark.cardTop} ${dark.cardBottom} !important; box-shadow:${dark.codeShadow} !important; }
[data-ogsc] .em-text, [data-ogsb] .em-text { color:${dark.text} !important; }
[data-ogsc] .em-heading, [data-ogsb] .em-heading { color:${dark.heading} !important; }
[data-ogsc] .em-gold, [data-ogsb] .em-gold { color:${dark.gold} !important; }
[data-ogsc] .em-muted, [data-ogsb] .em-muted { color:${dark.muted} !important; }
[data-ogsc] .em-faint, [data-ogsb] .em-faint { color:${dark.faint} !important; }
[data-ogsc] .em-divider, [data-ogsb] .em-divider { border-color:${dark.divider} !important; }`}</style>
      </Head>
      <Preview>{preview}</Preview>
      <Body className="body" style={{ backgroundColor: light.page, margin: 0, padding: 0, fontFamily: font, color: light.text }}>
        <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} {...bg(light.page)} style={{ backgroundColor: light.page, width: "100%" }}>
          <tbody>
            <tr>
              <td align="center" className="em-page" {...bg(light.page)} style={{ backgroundColor: light.page, padding: "36px 12px" }}>
                <Container style={{ maxWidth: 560, width: "100%", margin: "0 auto" }}>
                  <Text className="em-heading" style={{ color: light.heading, fontFamily: font, fontSize: 30, fontWeight: 700, lineHeight: "36px", margin: "0 0 24px 4px" }}>
                    Luke<span className="em-gold" style={{ color: light.gold }}>.</span>
                  </Text>

                  {/* Clay card: lit top/left edge, dark bottom/right edge, soft outer shadow. */}
                  <table
                    role="presentation"
                    width="100%"
                    cellPadding={0}
                    cellSpacing={0}
                    border={0}
                    {...bg(light.card)}
                    style={{
                      backgroundColor: light.card,
                      borderRadius: 20,
                      borderTop: `1px solid ${light.cardTop}`,
                      borderLeft: `1px solid ${light.cardTop}`,
                      borderRight: `1px solid ${light.cardBottom}`,
                      borderBottom: `2px solid ${light.cardBottom}`,
                      boxShadow: light.cardShadow,
                      borderCollapse: "separate",
                    }}
                  >
                    <tbody>
                      <tr>
                        <td className="em-card" {...bg(light.card)} style={{ backgroundColor: light.card, borderRadius: 20, padding: "34px 30px" }}>
                          <Text className="em-gold" style={{ color: light.gold, fontFamily: font, fontSize: 22, fontWeight: 700, lineHeight: "30px", margin: "0 0 18px" }}>
                            {heading}
                          </Text>
                          {greeting && <Text className="em-text" style={textStyle}>{greeting}</Text>}
                          {paragraphs.map((p, i) => (
                            <Text key={i} className="em-text" style={textStyle}>
                              {p}
                            </Text>
                          ))}

                          {code && (
                            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ margin: "24px 0", borderCollapse: "separate" }}>
                              <tbody>
                                <tr>
                                  {/* Inset clay well for the code */}
                                  <td
                                    align="center" className="em-code" {...bg(light.inset)}
                                    style={{
                                      backgroundColor: light.inset,
                                      borderRadius: 14,
                                      borderTop: `2px solid ${light.cardBottom}`,
                                      borderLeft: `1px solid ${light.cardBottom}`,
                                      borderBottom: `1px solid ${light.cardTop}`,
                                      borderRight: `1px solid ${light.cardTop}`,
                                      boxShadow: light.codeShadow,
                                      padding: "18px 0",
                                      fontFamily: font,
                                      fontSize: 34,
                                      fontWeight: 700,
                                      letterSpacing: 12,
                                      color: light.heading,
                                    }}
                                  >
                                    {code}
                                  </td>
                                </tr>
                              </tbody>
                            </table>
                          )}

                          {rows && rows.length > 0 && (
                            <table role="presentation" width="100%" cellPadding={0} cellSpacing={0} border={0} style={{ margin: "22px 0 6px", borderTop: `1px solid ${light.divider}` }}>
                              <tbody>
                                {rows.map((r, i) => (
                                  <tr key={i}>
                                    <td className="em-muted em-divider" style={{ ...cellStyle, color: light.muted }}>{r.label}</td>
                                    <td
                                      align="right"
                                      className={(r.strong ? "em-gold " : "em-heading ") + "em-divider"}
                                      style={{
                                        ...cellStyle,
                                        color: r.strong ? light.gold : light.heading,
                                        fontSize: r.strong ? 16 : 13,
                                        fontWeight: r.strong ? 700 : 400,
                                      }}
                                    >
                                      {r.value}
                                    </td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          )}

                          {cta && <ClayButton href={cta.href} label={cta.label} />}

                          {footnote && (
                            <Text className="em-faint" style={{ ...textStyle, color: light.faint, fontSize: 12, lineHeight: "20px", margin: "22px 0 0" }}>{footnote}</Text>
                          )}
                        </td>
                      </tr>
                    </tbody>
                  </table>

                  <Section style={{ padding: "22px 6px 0" }}>
                    <Text className="em-faint" style={{ color: light.faint, fontFamily: font, fontSize: 12, lineHeight: "18px", margin: 0 }}>
                      Luke Baber · Web development, design &amp; automation · Tyler, TX
                    </Text>
                    <Text className="em-faint" style={{ color: light.faint, fontFamily: font, fontSize: 12, lineHeight: "18px", margin: "6px 0 0" }}>
                      <Link href={`${appUrl}/portal`} className="em-gold" style={{ color: light.gold, textDecoration: "none" }}>
                        Client portal
                      </Link>
                      {"  ·  "}
                      <Link href={appUrl} className="em-muted" style={{ color: light.muted, textDecoration: "none" }}>
                        lukebaber.com
                      </Link>
                    </Text>
                  </Section>
                </Container>
              </td>
            </tr>
          </tbody>
        </table>
      </Body>
    </Html>
  );
}

const textStyle = { color: light.text, fontFamily: font, fontSize: 14, lineHeight: "24px", margin: "0 0 14px" };
const cellStyle = { fontFamily: font, fontSize: 13, padding: "11px 0", borderBottom: `1px solid ${light.divider}` };
