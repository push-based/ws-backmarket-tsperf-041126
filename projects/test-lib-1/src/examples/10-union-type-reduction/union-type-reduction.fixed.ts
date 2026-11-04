/**
 * FIXED: Reduce the union to only the members actually used
 *
 * The app only ever renders `div`, `span`, `button`, `input`, and `a`.
 * Auditing the union down to those 5 members cuts every distributive
 * instantiation - `ElementDefinition`, `RenderDefinition`, and their derived
 * types - from ~110 branches to 5, for every one of the 8 components below,
 * with identical results for every tag that actually matters.
 */

type AppTag = "div" | "span" | "button" | "input" | "a"; // audited: only tags this app renders

// Stand-in for `HTMLElementTagNameMap` so this file has no lib.dom dependency
type HtmlElementMap = { [Tag in AppTag]: { tagName: Tag } };

type EventName<Component extends string, Tag extends string> = `${Component}On${Capitalize<Tag>}Click`;

type DataAttributes<Component extends string, Tag extends string> = {
  [Key in
    | `data-${Component}-${Tag}-id`
    | `data-${Component}-${Tag}-state`
    | `data-${Component}-${Tag}-variant`]?: string;
};

type ElementDefinition<Component extends string, Tag> =
  Tag extends keyof HtmlElementMap
    ? {
        component: Component;
        tag: Tag;
        element: HtmlElementMap[Tag];
        eventName: EventName<Component, Tag>;
        attributes: DataAttributes<Component, Tag>;
        create(): HtmlElementMap[Tag];
        update(
          element: HtmlElementMap[Tag],
          attributes: Partial<HtmlElementMap[Tag]>,
        ): void;
      }
    : never;

type RenderDefinition<Component extends string, Tag> =
  Tag extends keyof HtmlElementMap
    ? {
        render(definition: ElementDefinition<Component, Tag>): HtmlElementMap[Tag];
      }
    : never;

// Same 8 components, but distributing over the 5-member audited union
type HeaderDefinitions = ElementDefinition<"Header", AppTag>;
type HeaderRenderers = RenderDefinition<"Header", AppTag>;
type FooterDefinitions = ElementDefinition<"Footer", AppTag>;
type FooterRenderers = RenderDefinition<"Footer", AppTag>;
type SidebarDefinitions = ElementDefinition<"Sidebar", AppTag>;
type SidebarRenderers = RenderDefinition<"Sidebar", AppTag>;
type ModalDefinitions = ElementDefinition<"Modal", AppTag>;
type ModalRenderers = RenderDefinition<"Modal", AppTag>;
type CardDefinitions = ElementDefinition<"Card", AppTag>;
type CardRenderers = RenderDefinition<"Card", AppTag>;
type NavDefinitions = ElementDefinition<"Nav", AppTag>;
type NavRenderers = RenderDefinition<"Nav", AppTag>;
type FormDefinitions = ElementDefinition<"Form", AppTag>;
type FormRenderers = RenderDefinition<"Form", AppTag>;
type ToolbarDefinitions = ElementDefinition<"Toolbar", AppTag>;
type ToolbarRenderers = RenderDefinition<"Toolbar", AppTag>;

export {};
