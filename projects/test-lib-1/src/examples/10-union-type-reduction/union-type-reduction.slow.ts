/**
 * SLOW: Distributive conditional over every member of a large, mostly-unused union
 *
 * `AllHtmlTags` lists every standard HTML element (~110 members, mirroring
 * `keyof HTMLElementTagNameMap`), but this app only ever renders a handful
 * of them. `ElementDefinition` and `RenderDefinition` each distribute over
 * the full union, and each branch itself builds several derived types
 * (`EventName`, `DataAttributes`, method signatures). A real app doesn't
 * define this once - every component (`Header`, `Footer`, `Sidebar`, ...)
 * that imports the shared tag union re-triggers the same ~110-way
 * distribution with its own component name baked in, so the cost multiplies
 * by the number of components, not just the union size.
 */

type AllHtmlTags =
  | "a" | "abbr" | "address" | "area" | "article" | "aside" | "audio" | "b" | "base" | "bdi"
  | "bdo" | "blockquote" | "body" | "br" | "button" | "canvas" | "caption" | "cite" | "code" | "col"
  | "colgroup" | "data" | "datalist" | "dd" | "del" | "details" | "dfn" | "dialog" | "div" | "dl"
  | "dt" | "em" | "embed" | "fieldset" | "figcaption" | "figure" | "footer" | "form" | "h1" | "h2"
  | "h3" | "h4" | "h5" | "h6" | "head" | "header" | "hgroup" | "hr" | "html" | "i"
  | "iframe" | "img" | "input" | "ins" | "kbd" | "label" | "legend" | "li" | "link" | "main"
  | "map" | "mark" | "menu" | "meta" | "meter" | "nav" | "noscript" | "object" | "ol" | "optgroup"
  | "option" | "output" | "p" | "param" | "picture" | "pre" | "progress" | "q" | "rp" | "rt"
  | "ruby" | "s" | "samp" | "script" | "section" | "select" | "slot" | "small" | "source" | "span"
  | "strong" | "style" | "sub" | "summary" | "sup" | "table" | "tbody" | "td" | "template" | "textarea"
  | "tfoot" | "th" | "thead" | "time" | "title" | "tr" | "track" | "u" | "ul" | "var"
  | "video" | "wbr"; // ~110 members

// Stand-in for `HTMLElementTagNameMap` so this file has no lib.dom dependency
type HtmlElementMap = { [Tag in AllHtmlTags]: { tagName: Tag } };

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

// Every component re-triggers the full ~110-way distribution
type HeaderDefinitions = ElementDefinition<"Header", AllHtmlTags>;
type HeaderRenderers = RenderDefinition<"Header", AllHtmlTags>;
type FooterDefinitions = ElementDefinition<"Footer", AllHtmlTags>;
type FooterRenderers = RenderDefinition<"Footer", AllHtmlTags>;
type SidebarDefinitions = ElementDefinition<"Sidebar", AllHtmlTags>;
type SidebarRenderers = RenderDefinition<"Sidebar", AllHtmlTags>;
type ModalDefinitions = ElementDefinition<"Modal", AllHtmlTags>;
type ModalRenderers = RenderDefinition<"Modal", AllHtmlTags>;
type CardDefinitions = ElementDefinition<"Card", AllHtmlTags>;
type CardRenderers = RenderDefinition<"Card", AllHtmlTags>;
type NavDefinitions = ElementDefinition<"Nav", AllHtmlTags>;
type NavRenderers = RenderDefinition<"Nav", AllHtmlTags>;
type FormDefinitions = ElementDefinition<"Form", AllHtmlTags>;
type FormRenderers = RenderDefinition<"Form", AllHtmlTags>;
type ToolbarDefinitions = ElementDefinition<"Toolbar", AllHtmlTags>;
type ToolbarRenderers = RenderDefinition<"Toolbar", AllHtmlTags>;

export {};
