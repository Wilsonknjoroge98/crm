import { createContext, useContext, useEffect, useMemo } from 'react';
import {
  keepPreviousData,
  useInfiniteQuery,
  useMutation,
  useQuery,
  useQueryClient,
} from '@tanstack/react-query';
import { useSelector } from 'react-redux';
import { getAccount, getInbox, markMessagesRead } from '../utils/query';
import { supabase, uniqueTopic } from '../utils/supabase';
import { toE164 } from '../utils/helpers';
import { useAgent } from './useAgent';

export const INBOX_QUERY_KEY = ['messagesInbox'];

// One cache entry per thread whatever format the phone came in, the realtime
// handler writes to it by the stored E.164 number
export const messagesQueryKey = (phone) => ['messages', toE164(phone) || phone];

const rowToMessage = (row) => ({
  id: row.message_handle,
  content: row.content ?? '',
  outbound: Boolean(row.is_outbound),
  status: row.status ?? null,
  sentAt: row.sent_at,
  error: row.error_message || null,
});

// How far a send has got. Status events and API snapshots can land out of
// order, so an older one must never move a message back to Sending
const STATUS_RANK = { SENT: 1, DELIVERED: 2, ERROR: 2, DECLINED: 2 };
const statusRank = (status) => STATUS_RANK[status] ?? 0;

export const mergeMessage = (current, incoming) =>
  statusRank(current.status) > statusRank(incoming.status)
    ? { ...incoming, status: current.status, error: current.error }
    : incoming;

// The webhook can store a send before the POST answers, its row then takes
// the place of the optimistic bubble rather than sitting beside it
export const upsertMessage = (list, message) => {
  if (list.some((m) => m.id === message.id)) {
    return list.map((m) =>
      m.id === message.id ? mergeMessage(m, message) : m,
    );
  }
  const pending = message.outbound
    ? list.findIndex((m) => m.optimistic && m.content === message.content)
    : -1;
  if (pending === -1) return [...list, message];
  return list.map((m, index) => (index === pending ? message : m));
};
// realtime does the work, this only catches a dropped socket
const FALLBACK_REFETCH_MS = 60000;
// each send fires several status events, a blast would refetch per event without this
const REALTIME_REFETCH_DELAY_MS = 1500;

const UNFILTERED = { unreadOnly: false, search: '' };

// One list of threads, filtered server-side so unread threads and matches
// past the loaded pages still turn up. Every filter sits under
// INBOX_QUERY_KEY, so the realtime refetch and mark-read reach them all.
export const useInboxThreads = ({
  enabled,
  unreadOnly = false,
  search = '',
}) => {
  const query = useInfiniteQuery({
    queryKey: [...INBOX_QUERY_KEY, { unreadOnly, search }],
    queryFn: ({ pageParam }) =>
      getInbox({ before: pageParam, unreadOnly, search }),
    initialPageParam: null,
    getNextPageParam: (lastPage) => lastPage?.nextBefore ?? undefined,
    enabled,
    refetchInterval: enabled ? FALLBACK_REFETCH_MS : false,
    // keeps the list up while a new search term loads
    placeholderData: keepPreviousData,
  });

  const threads = useMemo(
    () => query.data?.pages.flatMap((page) => page.threads) ?? [],
    [query.data],
  );

  return { ...query, threads };
};

// Only InboxProvider calls this, so there's one channel however many views
// show the inbox. It feeds both panes: an open thread's cache is patched
// right away, the thread list refetches. RLS on messages scopes the events
// to the agent's line, so no filter is needed here.
const useInboxRealtime = ({ enabled }) => {
  const queryClient = useQueryClient();

  useEffect(() => {
    if (!enabled) return undefined;
    // first event schedules the refetch, the rest of the burst rides along with it.
    // not a trailing debounce, a steady stream of events would never settle
    let refetchTimer = null;
    const scheduleRefetch = () => {
      if (refetchTimer) return;
      refetchTimer = window.setTimeout(() => {
        refetchTimer = null;
        queryClient.invalidateQueries({ queryKey: INBOX_QUERY_KEY });
      }, REALTIME_REFETCH_DELAY_MS);
    };
    const channel = supabase
      .channel(uniqueTopic('messages:inbox'))
      .on(
        'postgres_changes',
        { event: '*', schema: 'public', table: 'messages' },
        (payload) => {
          const row = payload.new;
          if (row?.message_handle && row.number) {
            // a thread nobody has opened has no cache, and stays that way
            queryClient.setQueryData(messagesQueryKey(row.number), (old) =>
              old ? upsertMessage(old, rowToMessage(row)) : old,
            );
          }
          scheduleRefetch();
        },
      )
      .subscribe();
    return () => {
      window.clearTimeout(refetchTimer);
      supabase.removeChannel(channel);
    };
  }, [enabled, queryClient]);
};

const InboxContext = createContext(null);

// Mounted once in App so the sidebar badge, Business and /inbox share one
// realtime channel and one unfiltered query. The totals come off that query:
// a filtered page can be empty and then carries none.
export const InboxProvider = ({ children }) => {
  const agent = useAgent();
  const { user, isAuthenticated } = useSelector((state) => state.user);
  // same key as Business/Profile so the gsq agent doc is shared from cache
  const { data: account } = useQuery({
    queryKey: ['account', user?.email, isAuthenticated],
    queryFn: () => getAccount({ email: user?.email }),
    staleTime: 1000 * 60 * 5,
    refetchOnMount: false,
    enabled: !!user?.email && isAuthenticated,
  });
  const textEnabled = Boolean(
    account?.sendBlueEnabled && agent?.sendblue_number,
  );
  useInboxRealtime({ enabled: textEnabled });
  const inbox = useInboxThreads({ enabled: textEnabled, ...UNFILTERED });
  const firstPage = inbox.data?.pages[0];
  const value = {
    ...inbox,
    threadTotal: firstPage?.threadTotal ?? 0,
    // every unread figure in the UI counts threads (people waiting on a
    // reply), not messages; the per-thread pill carries the message count
    unreadThreads: firstPage?.unreadThreads ?? 0,
    textEnabled,
    // both feed textEnabled, so it's only settled once both are in
    accountLoaded: account !== undefined && Boolean(agent),
  };
  return (
    <InboxContext.Provider value={value}>{children}</InboxContext.Provider>
  );
};

export const useInboxContext = () => useContext(InboxContext);

// Zeroes the thread's badge in every cached list right away, the refetch
// after confirms it
export const useMarkThreadRead = () => {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: markMessagesRead,
    onMutate: ({ phone }) => {
      queryClient.setQueriesData({ queryKey: INBOX_QUERY_KEY }, (old) => {
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
            ...(index === 0 && {
              unreadTotal: Math.max(page.unreadTotal - cleared, 0),
              unreadThreads: Math.max(page.unreadThreads - 1, 0),
            }),
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
