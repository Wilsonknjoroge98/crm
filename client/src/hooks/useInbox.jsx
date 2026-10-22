import { useEffect, useMemo } from 'react';
import {
  useInfiniteQuery,
  useMutation,
  useQueryClient,
} from '@tanstack/react-query';
import { getInbox, markMessagesRead } from '../utils/query';
import { supabase } from '../utils/supabase';

export const INBOX_QUERY_KEY = ['messagesInbox'];
// realtime does the work, this only catches a dropped socket
const FALLBACK_REFETCH_MS = 60000;

// Call once per page: it owns the realtime channel. RLS on messages scopes
// the events to the agent's line, so no filter is needed here.
export const useInbox = ({ enabled }) => {
  const queryClient = useQueryClient();

  const query = useInfiniteQuery({
    queryKey: INBOX_QUERY_KEY,
    queryFn: ({ pageParam }) => getInbox({ before: pageParam }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextBefore ?? undefined,
    enabled,
    refetchInterval: enabled ? FALLBACK_REFETCH_MS : false,
  });

  useEffect(() => {
    if (!enabled) return undefined;
    const channel = supabase
      .channel('messages:inbox')
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        () => queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY }),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);

  const threads = useMemo(
    () => query.data?.pages.flatMap((page) => page.threads) ?? [],
    [query.data],
  );
  // the server totals every thread, so the first page has it
  const unreadTotal = query.data?.pages[0]?.unreadTotal ?? 0;

  return { ...query, threads, unreadTotal };
};

// Zeroes the thread's badge right away, the refetch after confirms it
export const useMarkThreadRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markMessagesRead,
    onMutate: ({ phone }) => {
      queryClient.setQueryData(INBOX_QUERY_KEY, (old) => {
        if (!old) return old;
        const cleared = old.pages
          .flatMap((page) => page.threads)
          .filter((thread) => thread.phone === phone)
          .reduce((sum, thread) => sum + thread.unreadCount, 0);
        if (!cleared) return old;
        return {
          ...old,
          pages: old.pages.map((page, index) => ({
            ...page,
            unreadTotal:
              index === 0
                ? Math.max(page.unreadTotal - cleared, 0)
                : page.unreadTotal,
            threads: page.threads.map((thread) =>
              thread.phone === phone ? { ...thread, unreadCount: 0 } : thread,
            ),
          })),
        };
      });
    },
    onSettled: () =>
      queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY }),
  });
};
