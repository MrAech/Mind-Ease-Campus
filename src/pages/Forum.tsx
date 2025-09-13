/* eslint-disable @typescript-eslint/no-explicit-any */
import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { useAuth } from "@/hooks/use-auth";
import { useMutation, useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Checkbox } from "@/components/ui/checkbox";
import { toast } from "sonner";

export default function ForumPage() {
  const { user, isLoading } = useAuth();

  // Redirect unauthenticated users
  React.useEffect(() => {
    if (!isLoading && !user) {
      window.location.href = "/auth";
    }
  }, [isLoading, user]);

  const canUseForum = !!user?.institutionId;

  const posts = useQuery(
    api.forum.listPosts,
    canUseForum ? { institutionId: user!.institutionId! } : "skip",
  );

  const createPost = useMutation(api.forum.createPost);
  const likePost = useMutation(api.forum.likePost);

  // Composer state
  const [postTitle, setPostTitle] = React.useState("");
  const [postContent, setPostContent] = React.useState("");
  const [postAnon, setPostAnon] = React.useState(true);
  const [posting, setPosting] = React.useState(false);

  if (isLoading || !user) {
    return (
      <div className="w-full flex items-center justify-center">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
      </div>
    );
  }

  return (
    <div className="w-full bg-background">
      {/* Header */}
      <div className="border-b bg-gradient-to-r from-primary/5 via-background to-primary/5 backdrop-blur">
        <div className="w-full px-4 sm:px-6 lg:px-8 py-8">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-extrabold tracking-tight">
                Peer Support Forum
              </h1>
              <p className="text-muted-foreground mt-1">
                Share experiences and support each other within your
                institution.
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant="outline"
                onClick={() => (window.location.href = "/dashboard")}
              >
                Back to Dashboard
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="w-full px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        {!canUseForum ? (
          <Card className="border-0 shadow-sm bg-muted/30">
            <CardHeader>
              <CardTitle>Join an Institution</CardTitle>
              <CardDescription>
                You need to be part of an institution to access the forum.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground">
                Contact your administrator to be added to an institution.
              </div>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Create Post */}
            <Card className="border-0 shadow-sm">
              <CardHeader className="pb-3">
                <CardTitle className="text-base">Create a post</CardTitle>
                <CardDescription>
                  Ask a question, share insights, or offer support.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <Input
                  value={postTitle}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) =>
                    setPostTitle(e.target.value)
                  }
                  placeholder="Title"
                  disabled={posting}
                />

                <RichTextEditor
                  value={postContent}
                  onChange={setPostContent}
                  placeholder="Write your post..."
                  disabled={posting}
                />

                <div className="flex items-center justify-between">
                  <label className="flex items-center gap-2 text-sm">
                    <Checkbox
                      checked={postAnon}
                      onCheckedChange={(v) => setPostAnon(Boolean(v))}
                      disabled={posting}
                    />
                    Post as Anonymous
                  </label>
                  <Button
                    onClick={async () => {
                      const title = postTitle.trim();
                      const clean = sanitizeHtml(postContent || "");
                      const textLength = clean
                        .replace(/<[^>]*>/g, "")
                        .trim().length;
                      if (!title || textLength === 0) {
                        toast("Please enter a title and content.");
                        return;
                      }
                      try {
                        setPosting(true);
                        await createPost({
                          title,
                          content: clean,
                          isAnonymous: postAnon,
                          tags: [],
                        });
                        setPostTitle("");
                        setPostContent("");
                        setPostAnon(true);
                        toast("Post published.");
                      } catch (e: any) {
                        toast(e?.message ?? "Failed to publish post.");
                      } finally {
                        setPosting(false);
                      }
                    }}
                    disabled={posting}
                  >
                    {posting ? "Posting..." : "Publish"}
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Posts */}
            <div className="space-y-4">
              {(posts ?? []).length === 0 ? (
                <div className="text-center text-muted-foreground py-16 border rounded-xl bg-muted/20">
                  No posts yet. Be the first to start a conversation!
                </div>
              ) : (
                (posts ?? []).map((p) => (
                  <ForumPostItem
                    key={p._id}
                    post={p as any}
                    institutionId={user!.institutionId as any}
                    likePost={likePost}
                    createPost={createPost}
                    currentUserName={user?.name || "You"}
                  />
                ))
              )}
            </div>
          </>
        )}
      </div>
    </div>
  );
}

function ForumPostItem({
  post,
  institutionId,
  likePost,
  createPost,
  // currentUserName,
}: {
  post: any;
  institutionId: string;
  likePost: ReturnType<typeof useMutation<typeof api.forum.likePost>>;
  createPost: ReturnType<typeof useMutation<typeof api.forum.createPost>>;
  currentUserName: string;
}) {
  const [showReplies, setShowReplies] = React.useState(false);
  const [replyText, setReplyText] = React.useState("");
  const [replyAnon, setReplyAnon] = React.useState(true);
  const [submitting, setSubmitting] = React.useState(false);

  const replies = useQuery(
    api.forum.listPosts,
    showReplies
      ? { institutionId: institutionId as any, parentId: post._id }
      : "skip",
  );

  const relativeTime = (ts: number) => {
    const diff = Date.now() - ts;
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "just now";
    if (mins < 60) return `${mins}m ago`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}h ago`;
    const days = Math.floor(hrs / 24);
    if (days < 7) return `${days}d ago`;
    return new Date(ts).toLocaleDateString();
  };

  return (
    <div className="p-5 rounded-xl border bg-background/60 hover:bg-muted/30 transition-colors shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <span className="px-2 py-0.5 rounded-full bg-muted text-foreground/80">
              {post.user?.name ?? (post.isAnonymous ? "Anonymous" : "User")}
            </span>
            <span>•</span>
            <span>{relativeTime(post._creationTime)}</span>
          </div>
          <div className="font-semibold mt-1 truncate">{post.title}</div>
        </div>
        <Button
          size="sm"
          variant="ghost"
          className="border hover:bg-rose-50/50"
          onClick={async () => {
            try {
              await likePost({ postId: post._id });
            } catch (e: any) {
              toast(e?.message ?? "Failed to like post.");
            }
          }}
        >
          ❤️ <span className="ml-1">{post.likeCount}</span>
        </Button>
      </div>

      <div
        className="text-sm mt-3 prose prose-sm max-w-none prose-p:my-2 prose-ul:list-disc prose-ol:list-decimal prose-a:text-primary"
        dangerouslySetInnerHTML={{ __html: sanitizeHtml(post.content || "") }}
      />

      <div className="flex items-center gap-3 mt-4">
        <Button
          size="sm"
          variant="outline"
          onClick={() => setShowReplies((s) => !s)}
        >
          {showReplies ? "Hide replies" : "View replies"} ({post.replyCount})
        </Button>
        <span className="text-xs text-muted-foreground">
          Be kind and supportive
        </span>
      </div>

      {showReplies && (
        <div className="mt-4 border-t pt-4 space-y-3 bg-muted/20 rounded-lg px-3 pb-3">
          {/* Reply Composer */}
          <div className="space-y-2">
            <RichTextEditor
              value={replyText}
              onChange={setReplyText}
              placeholder="Write a reply…"
              disabled={submitting}
            />
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 text-xs">
                <Checkbox
                  checked={replyAnon}
                  onCheckedChange={(v) => setReplyAnon(Boolean(v))}
                  disabled={submitting}
                />
                Reply as Anonymous
              </label>
              <Button
                size="sm"
                onClick={async () => {
                  const clean = sanitizeHtml(replyText || "");
                  if (
                    !clean ||
                    clean.replace(/<[^>]*>/g, "").trim().length === 0
                  ) {
                    toast("Please write a reply.");
                    return;
                  }
                  try {
                    setSubmitting(true);
                    await createPost({
                      title: `Re: ${post.title}`.slice(0, 80),
                      content: clean,
                      isAnonymous: replyAnon,
                      tags: [],
                      parentId: post._id,
                    });
                    setReplyText("");
                    setReplyAnon(true);
                    toast("Reply posted.");
                  } catch (e: any) {
                    toast(e?.message ?? "Failed to post reply.");
                  } finally {
                    setSubmitting(false);
                  }
                }}
                disabled={submitting}
              >
                {submitting ? "Posting…" : "Reply"}
              </Button>
            </div>
          </div>

          {/* Replies */}
          <div className="space-y-3">
            {(replies ?? []).length === 0 ? (
              <div className="text-xs text-muted-foreground">
                No replies yet.
              </div>
            ) : (
              (replies ?? []).map((r: any) => (
                <div key={r._id} className="pl-3 border-l space-y-1">
                  <div className="flex items-center gap-2 text-xs text-muted-foreground">
                    <span className="px-1.5 py-0.5 rounded bg-muted text-foreground/80">
                      {r.user?.name ?? (r.isAnonymous ? "Anonymous" : "User")}
                    </span>
                    <span>•</span>
                    <span>{relativeTime(r._creationTime)}</span>
                  </div>
                  <div
                    className="text-sm prose prose-sm max-w-none"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeHtml(r.content || ""),
                    }}
                  />
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

function sanitizeHtml(dirty: string): string {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(dirty, "text/html");

    const whitelistTags = new Set([
      "b",
      "strong",
      "i",
      "em",
      "u",
      "p",
      "br",
      "ul",
      "ol",
      "li",
      "a",
      "span",
      "div",
    ]);
    const whitelistAttrs: Record<string, Set<string>> = {
      a: new Set(["href", "target", "rel"]),
      span: new Set([]),
      div: new Set([]),
    };
    const isSafeUrl = (url: string) => {
      const lowered = url.trim().toLowerCase();
      return (
        lowered.startsWith("http://") ||
        lowered.startsWith("https://") ||
        lowered.startsWith("/")
      );
    };

    const traverse = (node: Node) => {
      if (node.nodeType === Node.ELEMENT_NODE) {
        const el = node as HTMLElement;

        if (!whitelistTags.has(el.tagName.toLowerCase())) {
          const parent = el.parentNode;
          if (parent) {
            while (el.firstChild) parent.insertBefore(el.firstChild, el);
            parent.removeChild(el);
          }
          return;
        }

        [...el.getAttributeNames()].forEach((attr) => {
          if (attr.startsWith("on")) {
            el.removeAttribute(attr);
            return;
          }
          const tag = el.tagName.toLowerCase();
          const allowed = whitelistAttrs[tag as keyof typeof whitelistAttrs];
          if (allowed && allowed.has(attr)) {
            if (tag === "a" && attr === "href") {
              const href = el.getAttribute("href") || "";
              if (!isSafeUrl(href)) el.removeAttribute("href");
            }
            if (tag === "a" && attr === "target") {
              const val = el.getAttribute("target") || "";
              if (val !== "_blank") el.setAttribute("target", "_blank");
            }
            if (tag === "a" && attr === "rel") {
              el.setAttribute("rel", "noopener noreferrer");
            }
          } else if (tag !== "a") {
            el.removeAttribute(attr);
          } else if (!allowed || !allowed.has(attr)) {
            el.removeAttribute(attr);
          }
        });

        const children = [...el.childNodes];
        children.forEach(traverse);
      }
    };

    [...doc.body.childNodes].forEach(traverse);
    return doc.body.innerHTML;
  } catch {
    return "";
  }
}

function RichTextEditor({
  value,
  onChange,
  placeholder,
  disabled,
}: {
  value: string;
  onChange: (html: string) => void;
  placeholder?: string;
  disabled?: boolean;
}) {
  const ref = React.useRef<HTMLDivElement | null>(null);

  const exec = (command: string, arg?: string) => {
    if (disabled) return;
    document.execCommand(command, false, arg);
    if (ref.current) onChange(ref.current.innerHTML);
  };

  const onInput = () => {
    if (ref.current) onChange(ref.current.innerHTML);
  };

  React.useEffect(() => {
    if (ref.current && ref.current.innerHTML !== value) {
      ref.current.innerHTML = value || "";
    }
  }, [value]);

  return (
    <div className="border rounded-lg bg-background overflow-hidden">
      <div className="flex flex-wrap gap-1.5 p-2 border-b bg-muted/40">
        <button
          type="button"
          className="text-sm px-2 py-1 rounded border hover:bg-muted active:bg-muted/70 transition disabled:opacity-50"
          onClick={() => exec("bold")}
          disabled={!!disabled}
        >
          B
        </button>
        <button
          type="button"
          className="text-sm italic px-2 py-1 rounded border hover:bg-muted active:bg-muted/70 transition disabled:opacity-50"
          onClick={() => exec("italic")}
          disabled={!!disabled}
        >
          I
        </button>
        <button
          type="button"
          className="text-sm underline px-2 py-1 rounded border hover:bg-muted active:bg-muted/70 transition disabled:opacity-50"
          onClick={() => exec("underline")}
          disabled={!!disabled}
        >
          U
        </button>
        <span className="mx-1 w-px bg-border" />
        <button
          type="button"
          className="text-sm px-2 py-1 rounded border hover:bg-muted active:bg-muted/70 transition disabled:opacity-50"
          onClick={() => exec("insertUnorderedList")}
          disabled={!!disabled}
        >
          • List
        </button>
        <button
          type="button"
          className="text-sm px-2 py-1 rounded border hover:bg-muted active:bg-muted/70 transition disabled:opacity-50"
          onClick={() => exec("insertOrderedList")}
          disabled={!!disabled}
        >
          1. List
        </button>
        <span className="mx-1 w-px bg-border" />
        <button
          type="button"
          className="text-sm px-2 py-1 rounded border hover:bg-muted active:bg-muted/70 transition disabled:opacity-50"
          onClick={() => {
            if (disabled) return;
            const url = prompt("Enter URL (https://…):") || "";
            if (url) exec("createLink", url);
          }}
          disabled={!!disabled}
        >
          Link
        </button>
        <button
          type="button"
          className="text-sm px-2 py-1 rounded border hover:bg-muted active:bg-muted/70 transition disabled:opacity-50"
          onClick={() => {
            if (!ref.current || disabled) return;
            ref.current.innerHTML = "";
            onChange("");
          }}
          disabled={!!disabled}
        >
          Clear
        </button>
      </div>
      <div
        ref={ref}
        contentEditable={!disabled}
        onInput={onInput}
        className="min-h-32 p-3 outline-none focus:outline-none leading-relaxed"
        data-placeholder={placeholder || ""}
        style={{ whiteSpace: "pre-wrap" }}
        suppressContentEditableWarning
      />
    </div>
  );
}
