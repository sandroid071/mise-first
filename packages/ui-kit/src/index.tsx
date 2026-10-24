import type { ReactNode } from "react";
import { colors } from "@mise/design-tokens";
export function TicketCard({ children }: { children: ReactNode }) { return <section style={{ background: colors.cream, border: `1px dashed ${colors.espresso}`, borderRadius: 16, padding: 20, boxShadow: "3px 4px 0 rgba(43,30,22,.12)" }}>{children}</section>; }
export function StatePanel({ title, children }: { title: string; children: ReactNode }) { return <TicketCard><h2 style={{ marginTop: 0 }}>{title}</h2><p>{children}</p></TicketCard>; }
