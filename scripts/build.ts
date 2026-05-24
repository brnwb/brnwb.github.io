import { Eta } from "eta";
import { parse as parseYaml } from "@std/yaml";
import { parse as parseDjot, renderHTML } from "djot";

const siteTitle = "Brian Webb";
const contentDir = "content";
const postsDir = `${contentDir}/posts`;
const staticDir = "static";
const outputDir = "html";
const eta = new Eta({ views: `${Deno.cwd()}/layouts`, cache: false });

export type Frontmatter = {
  title: string;
  date?: string;
  slug?: string;
  summary?: string;
  draft?: boolean;
};

type Document = {
  frontmatter: Frontmatter;
  content: string;
  html: string;
};

type Post = {
  title: string;
  date: string;
  displayDate: string;
  slug: string;
  summary: string;
  url: string;
  html: string;
};

export async function build() {
  await Deno.remove(outputDir, { recursive: true }).catch((error) => {
    if (!(error instanceof Deno.errors.NotFound)) throw error;
  });
  await Deno.mkdir(outputDir, { recursive: true });
  await copyDirectory(staticDir, outputDir);

  const posts = await collectPosts();
  const page = await readDocument(`${contentDir}/index.dj`);
  const pageHtml = renderTemplate("index", { pageHtml: page.html, posts });
  await writeHtml(
    `${outputDir}/index.html`,
    renderBase({
      title: page.frontmatter.title,
      summary: page.frontmatter.summary,
      body: pageHtml,
    }),
  );

  for (const post of posts) {
    const postBody = renderTemplate("post", { post, content: post.html });
    await writeHtml(
      `${outputDir}/posts/${post.slug}/index.html`,
      renderBase({
        title: post.title,
        summary: post.summary,
        body: postBody,
      }),
    );
  }

  console.log(`Built ${posts.length + 1} pages into ${outputDir}/`);
}

async function collectPosts(): Promise<Post[]> {
  const posts: Post[] = [];
  try {
    const stat = await Deno.stat(postsDir);
    if (!stat.isDirectory) throw new Error(`${postsDir} must be a directory`);
  } catch (error) {
    if (error instanceof Deno.errors.NotFound) return posts;
    throw error;
  }

  for await (const entry of Deno.readDir(postsDir)) {
    if (!entry.isFile || !entry.name.endsWith(".dj")) continue;

    const document = await readDocument(`${postsDir}/${entry.name}`);
    if (document.frontmatter.draft) continue;

    const fallback = entry.name.match(/^(\d{4}-\d{2}-\d{2})-(.+)\.dj$/);
    const date = document.frontmatter.date ?? fallback?.[1];
    const slug = document.frontmatter.slug ?? fallback?.[2];

    if (!date) {
      throw new Error(
        `${entry.name} needs frontmatter.date or a YYYY-MM-DD filename prefix`,
      );
    }
    if (!slug) {
      throw new Error(
        `${entry.name} needs frontmatter.slug or a slug in the filename`,
      );
    }

    posts.push({
      title: document.frontmatter.title,
      date,
      displayDate: formatDate(date),
      slug,
      summary: document.frontmatter.summary ?? "",
      url: `/posts/${slug}/`,
      html: document.html,
    });
  }

  posts.sort((left, right) => right.date.localeCompare(left.date));
  return posts;
}

async function readDocument(path: string): Promise<Document> {
  const source = await Deno.readTextFile(path);
  const { frontmatter, content } = parseFrontmatter(source, path);
  return {
    frontmatter,
    content,
    html: renderHTML(parseDjot(content)),
  };
}

function parseFrontmatter(
  source: string,
  path: string,
): { frontmatter: Frontmatter; content: string } {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/);
  if (!match) throw new Error(`${path} is missing YAML frontmatter`);

  const parsed = parseYaml(match[1]);
  if (!parsed || typeof parsed !== "object" || Array.isArray(parsed)) {
    throw new Error(`${path} frontmatter must be an object`);
  }

  const data = parsed as Record<string, unknown>;
  if (typeof data.title !== "string" || data.title.trim() === "") {
    throw new Error(`${path} frontmatter.title is required`);
  }

  return {
    frontmatter: {
      title: data.title,
      date: optionalString(data.date, "date", path),
      slug: optionalString(data.slug, "slug", path),
      summary: optionalString(data.summary, "summary", path),
      draft: optionalBoolean(data.draft, "draft", path),
    },
    content: source.slice(match[0].length),
  };
}

function optionalString(
  value: unknown,
  key: string,
  path: string,
): string | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "string") {
    throw new Error(`${path} frontmatter.${key} must be a string`);
  }
  return value;
}

function optionalBoolean(
  value: unknown,
  key: string,
  path: string,
): boolean | undefined {
  if (value === undefined) return undefined;
  if (typeof value !== "boolean") {
    throw new Error(`${path} frontmatter.${key} must be a boolean`);
  }
  return value;
}

function renderBase(data: { title: string; summary?: string; body: string }) {
  return renderTemplate("base", {
    siteTitle,
    title: data.title,
    summary: data.summary ?? "",
    body: data.body,
  });
}

function renderTemplate(name: string, data: Record<string, unknown>): string {
  const rendered = eta.render(name, data);
  if (typeof rendered !== "string") {
    throw new Error(`${name}.eta rendered asynchronously`);
  }
  return rendered;
}

async function writeHtml(path: string, html: string) {
  await Deno.mkdir(dirname(path), { recursive: true });
  await Deno.writeTextFile(path, `${html}\n`);
}

async function copyDirectory(from: string, to: string) {
  await Deno.mkdir(to, { recursive: true });
  for await (const entry of Deno.readDir(from)) {
    const source = `${from}/${entry.name}`;
    const destination = `${to}/${entry.name}`;
    if (entry.isDirectory) {
      await copyDirectory(source, destination);
    } else if (entry.isFile) {
      await Deno.mkdir(dirname(destination), { recursive: true });
      await Deno.copyFile(source, destination);
    }
  }
}

function dirname(path: string): string {
  const index = path.lastIndexOf("/");
  return index === -1 ? "." : path.slice(0, index);
}

function formatDate(date: string): string {
  return new Date(`${date}T00:00:00Z`).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

if (import.meta.main) await build();
