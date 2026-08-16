"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion } from "motion/react";
import { LogoutButton } from "@/components/auth/LogoutButton";

export type SidebarLink = {
  href: string;
  label: string;
};

export type SidebarGroup = {
  label: string;
  href?: string;
  items?: SidebarLink[];
};

// Um único layoutId compartilhado por todo indicador ativo do menu -- ao
// trocar de página, o "pill" verde morfa de um item pro outro em vez de
// sumir/reaparecer (skill apple-design, "spatial consistency" + morphing).
const ACTIVE_PILL_ID = "sidebar-active-pill";
const SPRING = { type: "spring" as const, stiffness: 500, damping: 35 };

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupIsActive(pathname: string, group: SidebarGroup) {
  if (group.href) return isActive(pathname, group.href);
  return (group.items ?? []).some((item) => isActive(pathname, item.href));
}

function SidebarGroupItem({ group, pathname }: { group: SidebarGroup; pathname: string }) {
  const active = groupIsActive(pathname, group);
  const [open, setOpen] = useState(active);

  if (!group.items) {
    return (
      <Link
        href={group.href!}
        className={`relative block rounded-md px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98] ${
          active ? "text-primary-700" : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        {active && (
          <motion.span
            layoutId={ACTIVE_PILL_ID}
            transition={SPRING}
            className="absolute inset-0 rounded-md bg-primary-100"
          />
        )}
        <span className="relative">{group.label}</span>
      </Link>
    );
  }

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        className={`flex w-full items-center justify-between rounded-md px-3 py-2 text-sm font-medium transition-colors active:scale-[0.98] ${
          active ? "text-primary-700" : "text-neutral-700 hover:bg-neutral-100"
        }`}
      >
        <span>{group.label}</span>
        <motion.span
          className="text-xs"
          animate={{ rotate: open ? 90 : 0 }}
          transition={SPRING}
        >
          &rsaquo;
        </motion.span>
      </button>
      <AnimatePresence initial={false}>
        {open && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: "auto", opacity: 1 }}
            exit={{ height: 0, opacity: 0 }}
            transition={{ height: SPRING, opacity: { duration: 0.15 } }}
            className="overflow-hidden"
          >
            <div className="ml-2 mt-1 flex flex-col gap-0.5 border-l border-neutral-200 pl-3">
              {group.items.map((item) => {
                const itemActive = isActive(pathname, item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    className={`relative rounded-md px-2 py-1.5 text-sm transition-colors active:scale-[0.98] ${
                      itemActive ? "font-medium text-primary-700" : "text-neutral-600 hover:bg-neutral-100"
                    }`}
                  >
                    {itemActive && (
                      <motion.span
                        layoutId={ACTIVE_PILL_ID}
                        transition={SPRING}
                        className="absolute inset-0 rounded-md bg-primary-100"
                      />
                    )}
                    <span className="relative">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

export function Sidebar({ groups, title }: { groups: SidebarGroup[]; title: string }) {
  const pathname = usePathname();

  return (
    <aside className="flex h-screen w-64 shrink-0 flex-col border-r border-neutral-200/80 bg-white/90 backdrop-blur-xl">
      <div className="border-b border-neutral-200/80 px-4 py-5">
        <span className="text-base font-semibold tracking-[-0.01em] text-neutral-900">{title}</span>
      </div>
      <nav className="flex flex-1 flex-col gap-1 overflow-y-auto p-3">
        {groups.map((group) => (
          <SidebarGroupItem key={group.label} group={group} pathname={pathname} />
        ))}
      </nav>
      <div className="border-t border-neutral-200/80 px-4 py-4">
        <LogoutButton />
      </div>
    </aside>
  );
}
