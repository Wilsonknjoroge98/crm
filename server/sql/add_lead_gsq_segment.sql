-- Which gsq inventory segment the lead was delivered from: a live funnel or
-- instant form submission (fresh), the 72-hour unassigned bank (banked), or
-- the marketplace's aged windows (aged_second = 31–90 days, aged_third =
-- 91–180 days). inboundGSQ writes it from the request's `segment`, keyed like
-- the marketplace's SEGMENTS (an instant_ prefix is dropped, since
-- gsq_instant_form already records the product); anything else is fresh.
alter table public.leads
  add column if not exists gsq_segment text not null default 'fresh'
    check (gsq_segment in ('fresh', 'banked', 'aged_second', 'aged_third'));

-- Rows that landed before the column existed default to fresh. Marketplace
-- purchases among them can only be identified from gsq's Firestore lead doc
-- (marketplaceSegment / redistributedTo), so backfill those separately if
-- they need the right pill.

-- Re-run create_unified_business_view.sql after this so the business view
-- exposes the column.
