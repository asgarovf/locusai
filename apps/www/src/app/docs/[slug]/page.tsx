import { notFound } from "next/navigation";
import ReactMarkdown from "react-markdown";
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
      <article className="prose prose-zinc dark:prose-invert max-w-none pb-12">
        <h1 className="mb-8 font-bold text-4xl">{doc.title}</h1>
        <ReactMarkdown
          components={{
            code: CodeBlock,
          }}
        >
          {doc.content}
        </ReactMarkdown>
      </article>
    );
  } catch {
    notFound();
  }
}
