/// --------------------------------------------------
/// composables/useToolGroups.ts
/// --------------------------------------------------
/// The tool registry in the shape both navigations render it in.
///
/// The header row and the phone sheet show the same thing — the occupied
/// groups, in registry order, each with its label and its tools — and both
/// apply the same rule to a group holding one tool: it is rendered as a
/// direct link to that tool rather than as a disclosure wrapping a single
/// item. A dropdown with one thing in it is friction with nothing behind
/// it, at either width.
///
/// That rule living here rather than in each component is what stops the
/// two from disagreeing about the site's shape across the breakpoint where
/// they swap over — which is exactly the sort of drift nobody sees, because
/// seeing it means resizing the window to the one width that swaps them.
/// --------------------------------------------------

import type { ToolEntry, ToolGroup } from "~/utils/tools"

export interface ToolNavGroup {
   id: ToolGroup
   label: string
   tools: ToolEntry[]
   /** Set only when the group holds exactly one tool. */
   only: ToolEntry | undefined
}

export function useToolGroups() {
   return computed<ToolNavGroup[]>(() =>
      TOOL_GROUPS
         .map((id) => {
            const tools = toolsByGroup(id)

            return {
               id,
               label: COPY.nav.groups[id],
               tools,
               only: tools.length === 1 ? tools[0] : undefined,
            }
         })
         .filter((group) => group.tools.length > 0))
}

/**
 * The group the current page belongs to, or `null` off the tool pages.
 *
 * A category is not a route, so nothing marks it active on its own — both
 * navigations highlight their category control by hand from this.
 */
export function useCurrentToolGroup() {
   const route = useRoute()

   return computed<ToolGroup | null>(() =>
      TOOLS.find((tool) => tool.path === route.path)?.group ?? null)
}
