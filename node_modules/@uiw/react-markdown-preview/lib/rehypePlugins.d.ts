import type { PluggableList } from 'unified';
import { type RehypeRewriteOptions } from 'rehype-rewrite';
import type { Root, Element, RootContent } from 'hast';
export declare const rehypeRewriteHandle: (disableCopy: boolean, rewrite?: RehypeRewriteOptions["rewrite"]) => (node: Root | RootContent, index: number | null, parent: Root | Element | null) => void;
export declare const defaultRehypePlugins: PluggableList;
