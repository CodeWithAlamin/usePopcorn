"use client";

import {
  type FormEvent,
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  useTransition,
} from "react";
import { LoaderCircle, Search } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";

interface MovieSearchInputProps {
  initialQuery: string;
}

const DEBOUNCE_MS = 700;

function normalizeSearchQuery(value: string): string {
  return value.trim().replace(/\s+/g, " ");
}

export default function MovieSearchInput({
  initialQuery,
}: MovieSearchInputProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const urlQuery = useMemo(
    () => (searchParams.get("q") ?? initialQuery).trim(),
    [initialQuery, searchParams],
  );

  const [draftQuery, setDraftQuery] = useState(initialQuery);
  const [isDirty, setIsDirty] = useState(false);
  const [isPending, startTransition] = useTransition();
  const inputRef = useRef<HTMLInputElement | null>(null);
  const [pendingQuery, setPendingQuery] = useState<string | null>(null);

  useEffect(() => {
    const normalizedDraft = normalizeSearchQuery(draftQuery);

    if (pendingQuery !== null) {
      if (urlQuery === pendingQuery) {
        setPendingQuery(null);

        if (normalizedDraft === urlQuery) {
          setIsDirty(false);
        }
      }
      return;
    }

    if (isDirty) {
      return;
    }

    if (normalizedDraft !== urlQuery) {
      setDraftQuery(urlQuery);
    }
  }, [draftQuery, isDirty, pendingQuery, urlQuery]);

  const applySearch = useCallback(
    (rawValue: string): void => {
      const normalizedQuery = normalizeSearchQuery(rawValue);
      setPendingQuery(normalizedQuery);

      if (normalizedQuery === urlQuery) {
        setPendingQuery(null);
        setIsDirty(false);
        return;
      }

      const nextParams = new URLSearchParams(searchParams.toString());

      if (normalizedQuery) {
        nextParams.set("q", normalizedQuery);
      } else {
        nextParams.delete("q");
      }

      nextParams.delete("selected");

      startTransition(() => {
        const nextQueryString = nextParams.toString();
        const nextUrl = nextQueryString
          ? `${pathname}?${nextQueryString}`
          : pathname;

        if (!urlQuery && normalizedQuery) {
          router.push(nextUrl, { scroll: false });
          return;
        }

        router.replace(nextUrl, { scroll: false });
      });
    },
    [pathname, router, searchParams, startTransition, urlQuery],
  );

  function handleSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    applySearch(draftQuery);
  }

  useEffect(() => {
    if (!isDirty) return;

    const timeoutId = window.setTimeout(() => {
      applySearch(draftQuery);
    }, DEBOUNCE_MS);

    return () => window.clearTimeout(timeoutId);
  }, [applySearch, draftQuery, isDirty]);

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent): void {
      if (event.key !== "Enter") return;
      if (document.activeElement === inputRef.current) return;

      inputRef.current?.focus();
    }

    document.addEventListener("keydown", onKeyDown);
    return () => document.removeEventListener("keydown", onKeyDown);
  }, []);

  return (
    <div className="w-full">
      <form className="relative" onSubmit={handleSubmit}>
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          ref={inputRef}
          className="h-12 w-full rounded-2xl border bg-background/80 pl-10 pr-24 text-sm shadow-sm transition focus-visible:ring-2"
          type="text"
          placeholder="Search by movie title..."
          value={draftQuery}
          onChange={(event) => {
            setDraftQuery(event.target.value);
            setIsDirty(true);
          }}
        />
        <div className="absolute right-2 top-1/2 flex -translate-y-1/2 items-center gap-1.5">
          <Button
            size="sm"
            className="h-8 rounded-xl px-3"
            disabled={isPending}
          >
            {isPending ? (
              <>
                <LoaderCircle className="mr-1 size-3.5 motion-safe:animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Search className="mr-1 size-3.5" />
                Search
              </>
            )}
          </Button>
        </div>
      </form>
    </div>
  );
}
