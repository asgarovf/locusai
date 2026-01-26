import { notFound } from "next/navigation";
import { MDXRemote } from "next-mdx-remote/rsc";
import React from "react";
import remarkGfm from "remark-gfm";
import {
  Caution,
  Important,
  Note,
  Tip,
  Warning,
} from "@/components/docs/Alerts";
import { CodeBlock } from "@/components/docs/CodeBlock";
import { getAllDocs, getDocBySlug } from "@/lib/docs";

export async function generateStaticParams() {
  const docs = getAllDocs(["slug"]);
  return docs.map((doc) => ({
    slug: doc.slug,
  }));
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  try {
    const doc = getDocBySlug(slug, ["title", "content"]);
    return (
      <article className="prose prose-zinc prose-invert max-w-none pb-12">
        <h1 className="mb-8 font-bold text-4xl">{doc.title}</h1>
        <MDXRemote
          source={doc.content}
          options={{
            mdxOptions: {
              remarkPlugins: [remarkGfm],
            },
          }}
          components={{
            code: CodeBlock,
            Tip,
            Note,
            Important,
            Warning,
            Caution,
            table: ({ children }: { children: React.ReactNode }) => (
              <div className="my-6 overflow-x-auto rounded-lg border border-white/10">
                <table className="w-full text-sm">{children}</table>
              </div>
            ),
            thead: ({ children }: { children: React.ReactNode }) => (
              <thead className="bg-white/5 border-b border-white/10">
                {children}
              </thead>
            ),
            th: ({ children }: { children: React.ReactNode }) => (
              <th className="px-4 py-3 text-left font-semibold text-white/90">
                {children}
              </th>
            ),
            td: ({ children }: { children: React.ReactNode }) => (
              <td className="px-4 py-3 text-white/70 border-t border-white/5">
                {children}
              </td>
            ),
          }}
        />
      </article>
    );
  } catch {
    notFound();
  }
}
